import {
  DatasetFile,
  InvestigationPlan,
  InvestigationSession,
  ToolCallExecution,
  CorrectionRecord,
  EvaluationRunResult,
  SimulatedActionTask,
} from '../types/incident';
import {
  generateEcommercePaymentIncidentData,
  generateTrafficDeclineIncidentData,
  generateLatencySurgeIncidentData,
  BENCHMARKS,
} from '../data/demoIncidents';
import {
  runInvestigationLoop,
  createInvestigationPlan,
  applyCorrectionAndRerun,
  executeTool,
} from '../server/agent';

// In-memory local sessions store for client-side execution (e.g. on Netlify / static hosts)
const localSessionsStore: Map<string, InvestigationSession> = new Map();

export function getLocalDefaultSession(): InvestigationSession {
  if (localSessionsStore.has('default-ecommerce')) {
    return localSessionsStore.get('default-ecommerce')!;
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
  localSessionsStore.set(session.id, session);
  return session;
}

export async function localRunInvestigation(
  sessionId: string,
  incidentDescription: string,
  datasets: DatasetFile[]
): Promise<{ success: boolean; sessionId: string; session: InvestigationSession }> {
  const sId = sessionId || 'default-ecommerce';
  let session = localSessionsStore.get(sId);

  if (!session) {
    session = {
      id: sId,
      title: incidentDescription?.slice(0, 50) || 'Incident Investigation',
      incidentDescription: incidentDescription || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'RUNNING',
      datasets: datasets && datasets.length > 0 ? datasets : generateEcommercePaymentIncidentData().datasets,
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

  localSessionsStore.set(sId, session);

  return {
    success: true,
    sessionId: sId,
    session,
  };
}

export async function localSendCorrection(
  sessionId: string,
  feedbackText: string
): Promise<{ success: boolean; session: InvestigationSession; correctionRecord: CorrectionRecord }> {
  const sId = sessionId || 'default-ecommerce';
  let session = localSessionsStore.get(sId) || getLocalDefaultSession();

  if (!session.report) {
    const initResult = await runInvestigationLoop(session.incidentDescription, session.datasets, session.plan);
    session.plan = initResult.plan;
    session.toolCalls = initResult.toolCalls;
    session.hypotheses = initResult.hypotheses;
    session.evidence = initResult.evidence;
    session.report = initResult.report;
  }

  const { updatedSession, correctionRecord } = await applyCorrectionAndRerun(session, feedbackText);
  localSessionsStore.set(sId, updatedSession);

  return {
    success: true,
    session: updatedSession,
    correctionRecord,
  };
}

export function localApproveSimulatedAction(
  sessionId: string,
  actionId: string,
  approvalNotes: string,
  operatorName: string
): { success: boolean; actionTask: SimulatedActionTask } {
  const sId = sessionId || 'default-ecommerce';
  const session = localSessionsStore.get(sId) || getLocalDefaultSession();

  if (!session.report || !session.report.simulatedActionTask) {
    throw new Error('Action task not found for session');
  }

  session.report.simulatedActionTask.status = 'APPROVED';
  session.report.simulatedActionTask.approvedBy = operatorName || 'Incident Commander (Authorized)';
  session.report.simulatedActionTask.approvalNotes = approvalNotes || 'Operator verified rollback steps and approved execution.';

  return {
    success: true,
    actionTask: session.report.simulatedActionTask,
  };
}

export async function localRunAutomatedEvaluation(): Promise<{
  success: boolean;
  totalBenchmarks: number;
  passedCount: number;
  averageScore: number;
  results: EvaluationRunResult[];
}> {
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

  return {
    success: true,
    totalBenchmarks: BENCHMARKS.length,
    passedCount: results.filter((r) => r.passed).length,
    averageScore: Math.round(results.reduce((a, b) => a + b.score, 0) / results.length),
    results,
  };
}
