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
  getLocalDefaultSession,
  localRunInvestigation,
  localSendCorrection,
  localApproveSimulatedAction,
  localRunAutomatedEvaluation,
} from './localEngine';
import {
  generateEcommercePaymentIncidentData,
  generateTrafficDeclineIncidentData,
  generateLatencySurgeIncidentData,
} from '../data/demoIncidents';
import { executeTool } from '../server/agent';

// Helper to determine if a fetch response is valid JSON from our backend
async function parseJsonResponseOrNull(res: Response): Promise<any | null> {
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    // If hosted on Netlify / static SPA server, missing /api/* routes return index.html (text/html)
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHealth(): Promise<{
  status: string;
  geminiConfigured: boolean;
  model: string;
  uptimeSeconds: number;
}> {
  try {
    const res = await fetch('/api/health');
    const data = await parseJsonResponseOrNull(res);
    if (data) return data;
  } catch {}

  // Fallback for Netlify / Static hosting
  return {
    status: 'ok',
    geminiConfigured: false,
    model: 'gemini-3.8-flash (Client-Side Empirical Engine)',
    uptimeSeconds: 100,
  };
}

export async function fetchPresets(): Promise<{
  presets: {
    id: string;
    title: string;
    description: string;
    datasetCount: number;
    datasets: DatasetFile[];
    severity: string;
    recommendedHypotheses: string[];
  }[];
}> {
  try {
    const res = await fetch('/api/incidents/presets');
    const data = await parseJsonResponseOrNull(res);
    if (data && data.presets) return data;
  } catch {}

  // Fallback for Netlify / Static hosting
  const p1 = generateEcommercePaymentIncidentData();
  const p2 = generateTrafficDeclineIncidentData();
  const p3 = generateLatencySurgeIncidentData();

  return {
    presets: [
      {
        id: 'ecommerce-payment-fail',
        title: 'Storefront Order Drop (Payment Gateway 504 Failure)',
        description: p1.incidentDescription,
        datasetCount: p1.datasets.length,
        datasets: p1.datasets,
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
        description: p2.incidentDescription,
        datasetCount: p2.datasets.length,
        datasets: p2.datasets,
        severity: 'HIGH',
        recommendedHypotheses: [
          'Geo-steering DNS Misconfiguration (Ground Truth)',
          'Origin Application Crash / 500 Outage (Misleading Claim)',
        ],
      },
      {
        id: 'server-latency-surge',
        title: 'Database Connection Pool Exhaustion (p95 Latency Surge)',
        description: p3.incidentDescription,
        datasetCount: p3.datasets.length,
        datasets: p3.datasets,
        severity: 'HIGH',
        recommendedHypotheses: [
          'Database Connection Pool Saturation (Ground Truth)',
          'External Distributed Denial-of-Service Flood (Misleading Claim)',
        ],
      },
    ],
  };
}

export async function fetchSession(sessionId?: string): Promise<{ session: InvestigationSession }> {
  try {
    const url = sessionId ? `/api/investigate/session/${sessionId}` : '/api/investigate/session';
    const res = await fetch(url);
    const data = await parseJsonResponseOrNull(res);
    if (data && data.session) return data;
  } catch {}

  // Fallback for Netlify / Static hosting
  return { session: getLocalDefaultSession() };
}

export async function requestPlan(
  incidentDescription: string,
  datasets: DatasetFile[],
  sessionId?: string
): Promise<{ plan: InvestigationPlan; sessionId: string }> {
  try {
    const res = await fetch('/api/investigate/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentDescription, datasets, sessionId }),
    });
    const data = await parseJsonResponseOrNull(res);
    if (data && data.plan) return data;
  } catch {}

  const s = await localRunInvestigation(sessionId || 'default-ecommerce', incidentDescription, datasets);
  return { plan: s.session.plan!, sessionId: s.sessionId };
}

export async function executeInvestigation(
  sessionId: string,
  incidentDescription: string,
  datasets: DatasetFile[]
): Promise<{ success: boolean; sessionId: string; session: InvestigationSession }> {
  try {
    const res = await fetch('/api/investigate/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, incidentDescription, datasets }),
    });
    const data = await parseJsonResponseOrNull(res);
    if (data && data.success && data.session) {
      return data;
    }
  } catch (err) {
    console.warn('Backend unavailable, switching to client-side investigation engine:', err);
  }

  // Seamless fallback for Netlify / Static deployments
  return localRunInvestigation(sessionId, incidentDescription, datasets);
}

export async function sendCorrection(
  sessionId: string,
  feedbackText: string
): Promise<{ success: boolean; session: InvestigationSession; correctionRecord: CorrectionRecord }> {
  try {
    const res = await fetch('/api/investigate/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, feedbackText }),
    });
    const data = await parseJsonResponseOrNull(res);
    if (data && data.success && data.session) {
      return data;
    }
  } catch {}

  return localSendCorrection(sessionId, feedbackText);
}

export async function runToolOnDemand(
  toolName: string,
  args: Record<string, any>,
  datasets?: DatasetFile[]
): Promise<{ toolExecution: ToolCallExecution }> {
  try {
    const res = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, args, datasets }),
    });
    const data = await parseJsonResponseOrNull(res);
    if (data && data.toolExecution) {
      return data;
    }
  } catch {}

  const dsList = datasets && datasets.length > 0 ? datasets : getLocalDefaultSession().datasets;
  const toolExecution = executeTool(toolName, args, dsList, 1, 'ANALYZE');
  return { toolExecution };
}

export async function approveSimulatedAction(
  sessionId: string,
  actionId: string,
  approvalNotes: string,
  operatorName: string
): Promise<{ success: boolean; actionTask: SimulatedActionTask }> {
  try {
    const res = await fetch('/api/action/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, actionId, approvalNotes, operatorName }),
    });
    const data = await parseJsonResponseOrNull(res);
    if (data && data.success && data.actionTask) {
      return data;
    }
  } catch {}

  return localApproveSimulatedAction(sessionId, actionId, approvalNotes, operatorName);
}

export async function runAutomatedEvaluation(): Promise<{
  success: boolean;
  totalBenchmarks: number;
  passedCount: number;
  averageScore: number;
  results: EvaluationRunResult[];
}> {
  try {
    const res = await fetch('/api/evaluate/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await parseJsonResponseOrNull(res);
    if (data && data.success && data.results) {
      return data;
    }
  } catch {}

  return localRunAutomatedEvaluation();
}
