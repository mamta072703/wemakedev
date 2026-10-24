import {
  DatasetFile,
  InvestigationPlan,
  InvestigationSession,
  ToolCallExecution,
  CorrectionRecord,
  EvaluationRunResult,
  SimulatedActionTask,
} from '../types/incident';

export async function fetchHealth(): Promise<{
  status: string;
  geminiConfigured: boolean;
  model: string;
  uptimeSeconds: number;
}> {
  const res = await fetch('/api/health');
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
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
  const res = await fetch('/api/incidents/presets');
  if (!res.ok) throw new Error('Failed to load presets');
  return res.json();
}

export async function fetchSession(sessionId?: string): Promise<{ session: InvestigationSession }> {
  const url = sessionId ? `/api/investigate/session/${sessionId}` : '/api/investigate/session';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function requestPlan(
  incidentDescription: string,
  datasets: DatasetFile[],
  sessionId?: string
): Promise<{ plan: InvestigationPlan; sessionId: string }> {
  const res = await fetch('/api/investigate/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ incidentDescription, datasets, sessionId }),
  });
  if (!res.ok) throw new Error('Plan generation failed');
  return res.json();
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
    if (!res.ok) {
      let message = 'Investigation execution failed';
      try {
        const errorData = await res.json();
        if (errorData.error) message = errorData.error;
      } catch {}
      throw new Error(message);
    }
    return res.json();
  } catch (err: any) {
    throw new Error(err.message || 'Investigation execution failed');
  }
}

export async function sendCorrection(
  sessionId: string,
  feedbackText: string
): Promise<{ success: boolean; session: InvestigationSession; correctionRecord: CorrectionRecord }> {
  const res = await fetch('/api/investigate/correct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, feedbackText }),
  });
  if (!res.ok) throw new Error('Correction rerun failed');
  return res.json();
}

export async function runToolOnDemand(
  toolName: string,
  args: Record<string, any>,
  datasets?: DatasetFile[]
): Promise<{ toolExecution: ToolCallExecution }> {
  const res = await fetch('/api/tools/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toolName, args, datasets }),
  });
  if (!res.ok) throw new Error('Tool execution failed');
  return res.json();
}

export async function approveSimulatedAction(
  sessionId: string,
  actionId: string,
  approvalNotes: string,
  operatorName: string
): Promise<{ success: boolean; actionTask: SimulatedActionTask }> {
  const res = await fetch('/api/action/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, actionId, approvalNotes, operatorName }),
  });
  if (!res.ok) throw new Error('Approval request failed');
  return res.json();
}

export async function runAutomatedEvaluation(): Promise<{
  success: boolean;
  totalBenchmarks: number;
  passedCount: number;
  averageScore: number;
  results: EvaluationRunResult[];
}> {
  const res = await fetch('/api/evaluate/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Evaluation suite run failed');
  return res.json();
}
