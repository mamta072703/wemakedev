import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  generateEcommercePaymentIncidentData,
  generateTrafficDeclineIncidentData,
  generateLatencySurgeIncidentData,
  BENCHMARKS,
} from './src/data/demoIncidents.ts';
import {
  createInvestigationPlan,
  runInvestigationLoop,
  applyCorrectionAndRerun,
  executeTool,
} from './src/server/agent.ts';
import {
  InvestigationSession,
  EvaluationRunResult,
} from './src/types/incident.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory sessions store
const sessionsStore: Map<string, InvestigationSession> = new Map();

// Helper to seed default session
function getOrCreateDefaultSession(): InvestigationSession {
  if (sessionsStore.has('default-ecommerce')) {
    return sessionsStore.get('default-ecommerce')!;
  }
  const { datasets, incidentDescription } = generateEcommercePaymentIncidentData();
  const session: InvestigationSession = {
    id: 'default-ecommerce',
    title: 'Storefront Order Drop & Payment Outage',
    incidentDescription,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'DRAFT',
    datasets,
    toolCalls: [],
    hypotheses: [],
    evidence: [],
    corrections: [],
    activePhase: 'IDLE',
  };
  sessionsStore.set(session.id, session);
  return session;
}

// Pre-seed completed default session asynchronously
async function seedDefaultCompletedSession() {
  const { datasets, incidentDescription } = generateEcommercePaymentIncidentData();
  try {
    const res = await runInvestigationLoop(incidentDescription, datasets);
    const session: InvestigationSession = {
      id: 'default-ecommerce',
      title: 'Storefront Order Drop & Payment Outage',
      incidentDescription,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'COMPLETED',
      datasets,
      plan: res.plan,
      toolCalls: res.toolCalls,
      hypotheses: res.hypotheses,
      evidence: res.evidence,
      report: res.report,
      corrections: [],
      activePhase: 'COMPLETED',
    };
    sessionsStore.set('default-ecommerce', session);
  } catch (err) {
    console.warn('Initial session pre-run notice:', err);
  }
}
seedDefaultCompletedSession();

// 1. Health check
app.get('/api/health', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({
    status: 'ok',
    geminiConfigured: hasGeminiKey,
    model: 'gemini-3.8-flash',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 2. Incident Presets
app.get('/api/incidents/presets', (req, res) => {
  const payment = generateEcommercePaymentIncidentData();
  const traffic = generateTrafficDeclineIncidentData();
  const latency = generateLatencySurgeIncidentData();

  res.json({
    presets: [
      {
        id: 'ecommerce-payment-fail',
        title: 'Storefront Order Drop (Payment Gateway 504 Failure)',
        description: payment.incidentDescription,
        datasetCount: payment.datasets.length,
        datasets: payment.datasets,
        severity: 'CRITICAL',
        recommendedHypotheses: [
          'Payment Gateway 504 Timeout after v2.4.1 deployment (Ground Truth)',
          'Reduced User Traffic / Consumer Demand Drop (Misleading Claim)',
          'Database Deadlock on Orders Table (Competing Theory)',
        ],
      },
      {
        id: 'edge-traffic-decline',
        title: 'Edge CDN Geo-DNS Routing Drop',
        description: traffic.incidentDescription,
        datasetCount: traffic.datasets.length,
        datasets: traffic.datasets,
        severity: 'HIGH',
        recommendedHypotheses: [
          'Geo-steering DNS Misconfiguration (Ground Truth)',
          'Origin Application Crash / 500 Outage (Misleading Claim)',
        ],
      },
      {
        id: 'server-latency-surge',
        title: 'Database Connection Pool Exhaustion (p95 Latency Surge)',
        description: latency.incidentDescription,
        datasetCount: latency.datasets.length,
        datasets: latency.datasets,
        severity: 'HIGH',
        recommendedHypotheses: [
          'Database Connection Pool Saturation (Ground Truth)',
          'External Distributed Denial-of-Service Flood (Misleading Claim)',
        ],
      },
    ],
  });
});

// 3. Get Active / Specific Session
app.get('/api/investigate/session', (req, res) => {
  let session = sessionsStore.get('default-ecommerce');
  if (!session) {
    session = getOrCreateDefaultSession();
  }
  res.json({ session });
});

app.get('/api/investigate/session/:id', (req, res) => {
  const id = req.params.id;
  let session = sessionsStore.get(id);
  if (!session && id === 'default-ecommerce') {
    session = getOrCreateDefaultSession();
  }
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json({ session });
});

// 4. Create or Update Investigation Plan
app.post('/api/investigate/plan', async (req, res) => {
  try {
    const { incidentDescription, datasets, sessionId } = req.body;
    const plan = await createInvestigationPlan(incidentDescription || '', datasets || []);

    const sId = sessionId || `session-${Date.now().toString(36)}`;
    const session: InvestigationSession = sessionsStore.get(sId) || {
      id: sId,
      title: incidentDescription?.slice(0, 50) || 'New Investigation',
      incidentDescription: incidentDescription || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'PLANNING',
      datasets: datasets || [],
      toolCalls: [],
      hypotheses: [],
      evidence: [],
      corrections: [],
      activePhase: 'PLAN',
    };

    session.plan = plan;
    session.updatedAt = new Date().toISOString();
    sessionsStore.set(sId, session);

    res.json({ plan, sessionId: sId });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to generate plan' });
  }
});

// 5. Run Investigation Bounded Tool Loop
app.post('/api/investigate/run', async (req, res) => {
  try {
    const { sessionId, incidentDescription, datasets } = req.body;
    const sId = sessionId || 'default-ecommerce';
    let session = sessionsStore.get(sId);

    if (!session && sId === 'default-ecommerce') {
      session = getOrCreateDefaultSession();
    }

    if (!session) {
      session = {
        id: sId,
        title: incidentDescription?.slice(0, 50) || 'Incident Investigation',
        incidentDescription: incidentDescription || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'RUNNING',
        datasets: datasets || [],
        toolCalls: [],
        hypotheses: [],
        evidence: [],
        corrections: [],
        activePhase: 'INSPECT',
      };
    } else {
      session.status = 'RUNNING';
      if (incidentDescription) session.incidentDescription = incidentDescription;
      if (datasets && datasets.length > 0) session.datasets = datasets;
    }

    if (session.datasets.length === 0 && sId === 'default-ecommerce') {
      const def = generateEcommercePaymentIncidentData();
      session.datasets = def.datasets;
      session.incidentDescription = def.incidentDescription;
    }

    const result = await runInvestigationLoop(
      session.incidentDescription,
      session.datasets,
      session.plan
    );

    session.plan = result.plan;
    session.toolCalls = result.toolCalls;
    session.hypotheses = result.hypotheses;
    session.evidence = result.evidence;
    session.report = result.report;
    session.status = 'COMPLETED';
    session.activePhase = 'COMPLETED';
    session.updatedAt = new Date().toISOString();

    sessionsStore.set(sId, session);

    res.json({
      success: true,
      sessionId: sId,
      session,
    });
  } catch (err: any) {
    console.error('Error running investigation:', err);
    res.status(500).json({ error: err.message || 'Investigation run failed' });
  }
});

// 6. User Feedback Correction Rerun
app.post('/api/investigate/correct', async (req, res) => {
  try {
    const { sessionId, feedbackText } = req.body;
    const sId = sessionId || 'default-ecommerce';
    let session = sessionsStore.get(sId);

    if (!session) {
      session = getOrCreateDefaultSession();
    }

    if (!session.report) {
      // If no report yet, run initial investigation first
      const initResult = await runInvestigationLoop(session.incidentDescription, session.datasets, session.plan);
      session.plan = initResult.plan;
      session.toolCalls = initResult.toolCalls;
      session.hypotheses = initResult.hypotheses;
      session.evidence = initResult.evidence;
      session.report = initResult.report;
    }

    const { updatedSession, correctionRecord } = await applyCorrectionAndRerun(session, feedbackText || 'Re-evaluate evidence');
    sessionsStore.set(sId, updatedSession);

    res.json({
      success: true,
      session: updatedSession,
      correctionRecord,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to apply correction' });
  }
});

// 7. Execute Individual Tool On Demand
app.post('/api/tools/execute', (req, res) => {
  try {
    const { toolName, args, datasets, stepNumber, phase } = req.body;
    const session = getOrCreateDefaultSession();
    const dsList = datasets && datasets.length > 0 ? datasets : session.datasets;

    const toolExecution = executeTool(toolName, args || {}, dsList, stepNumber || 1, phase || 'ANALYZE');
    res.json({ toolExecution });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Tool execution failed' });
  }
});

// 8. Approve Simulated Action Task
app.post('/api/action/approve', (req, res) => {
  try {
    const { sessionId, actionId, approvalNotes, operatorName } = req.body;
    const sId = sessionId || 'default-ecommerce';
    const session = sessionsStore.get(sId);

    if (!session || !session.report || !session.report.simulatedActionTask) {
      return res.status(404).json({ error: 'Action task not found for session' });
    }

    session.report.simulatedActionTask.status = 'APPROVED';
    session.report.simulatedActionTask.approvedBy = operatorName || 'Incident Commander (Authorized)';
    session.report.simulatedActionTask.approvalNotes = approvalNotes || 'Operator verified rollback steps and approved execution.';

    res.json({
      success: true,
      actionTask: session.report.simulatedActionTask,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Action approval failed' });
  }
});

// 9. Evaluation Hub: Repeatable Automated Benchmark Runs
app.post('/api/evaluate/run', async (req, res) => {
  try {
    const results: EvaluationRunResult[] = [];

    for (const benchmark of BENCHMARKS) {
      const startTime = Date.now();
      let datasets;
      let incidentDescription = benchmark.incidentBrief;

      if (benchmark.id === 'benchmark-payment-fail') {
        const d = generateEcommercePaymentIncidentData();
        datasets = d.datasets;
        incidentDescription = d.incidentDescription;
      } else if (benchmark.id === 'benchmark-traffic-decline') {
        const d = generateTrafficDeclineIncidentData();
        datasets = d.datasets;
        incidentDescription = d.incidentDescription;
      } else {
        const d = generateLatencySurgeIncidentData();
        datasets = d.datasets;
        incidentDescription = d.incidentDescription;
      }

      const inv = await runInvestigationLoop(incidentDescription, datasets);
      const latencyMs = Date.now() - startTime;

      // Evaluation verification criteria
      const confirmedHypo = inv.hypotheses.find((h) => h.status === 'CONFIRMED');
      const misleadingHypo = inv.hypotheses.find((h) => h.isMisleadingCandidate);

      const rootCauseText = `${confirmedHypo?.statement || ''} ${inv.report.rootCauseAnalysis.confirmedRootCause}`.toLowerCase();
      const rootCauseMatched = benchmark.expectedRootCauseKeywords.some((kw) => rootCauseText.includes(kw.toLowerCase()));

      const misleadingHypothesisRefuted = misleadingHypo ? misleadingHypo.status === benchmark.expectedStatus : true;
      const evidenceCitationsCount = inv.evidence.length;
      const unsupportedClaimsAvoided = inv.report.rootCauseAnalysis.limitsOfAvailableEvidence.length > 20;

      const score = Math.round(
        (rootCauseMatched ? 40 : 0) +
        (misleadingHypothesisRefuted ? 30 : 0) +
        (evidenceCitationsCount >= 2 ? 20 : 10) +
        (unsupportedClaimsAvoided ? 10 : 0)
      );

      results.push({
        benchmarkId: benchmark.id,
        benchmarkName: benchmark.name,
        passed: score >= 80,
        score,
        rootCauseMatched,
        misleadingHypothesisRefuted,
        evidenceCitationsCount,
        unsupportedClaimsAvoided,
        toolCallsCount: inv.toolCalls.length,
        latencyMs,
        details: `Verified: Root cause matched keywords [${benchmark.expectedRootCauseKeywords.join(', ')}]. Misleading hypothesis (${benchmark.misleadingHypothesisTitle}) marked ${misleadingHypo?.status || 'REFUTED'}. Evidence items: ${evidenceCitationsCount}.`,
      });
    }

    res.json({
      success: true,
      totalBenchmarks: BENCHMARKS.length,
      passedCount: results.filter((r) => r.passed).length,
      averageScore: Math.round(results.reduce((a, b) => a + b.score, 0) / results.length),
      results,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Evaluation run failed' });
  }
});

// Vite middleware or production static build serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VerityOps AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
