export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type InvestigationPhase =
  | 'IDLE'
  | 'PLAN'
  | 'INSPECT'
  | 'ANALYZE'
  | 'HYPOTHESIZE'
  | 'TEST'
  | 'VERIFY'
  | 'REPORT'
  | 'ACT'
  | 'EVALUATE'
  | 'COMPLETED'
  | 'FAILED';

export interface DatasetColumn {
  name: string;
  type: 'timestamp' | 'number' | 'string' | 'boolean';
  sampleValues: (string | number)[];
  min?: number;
  max?: number;
  nullCount?: number;
}

export interface DatasetFile {
  id: string;
  name: string;
  description: string;
  rowCount: number;
  columns: DatasetColumn[];
  rawCsv?: string;
  rows?: Record<string, any>[];
  uploadedAt: string;
}

export interface InvestigationPlanStep {
  stepNumber: number;
  phase: InvestigationPhase;
  tool: string;
  rationale: string;
  targetMetricsOrHypothesis: string;
}

export interface InvestigationPlan {
  incidentSummary: string;
  initialObservations: string[];
  primaryQuestions: string[];
  plannedSteps: InvestigationPlanStep[];
}

export interface ToolCallExecution {
  id: string;
  toolName: string;
  stepNumber: number;
  phase: InvestigationPhase;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: 'SUCCESS' | 'ERROR';
  arguments: Record<string, any>;
  result: Record<string, any>;
  summary: string;
}

export type HypothesisStatus = 'CONFIRMED' | 'REFUTED' | 'PARTIALLY_SUPPORTED' | 'INSUFFICIENT_DATA';

export interface EvidenceCitation {
  id: string;
  type: 'METRIC' | 'TIMESTAMP' | 'LOG_ENTRY' | 'ROW_DATA' | 'STATISTICAL_TEST';
  sourceDataset: string;
  metricOrField: string;
  observedValue: string | number;
  baselineValue?: string | number;
  timestampOrWindow?: string;
  description: string;
  supportsHypothesisId?: string;
  refutesHypothesisId?: string;
}

export interface Hypothesis {
  id: string;
  title: string;
  statement: string;
  status: HypothesisStatus;
  confidenceScore: number; // 0 - 100
  supportingEvidenceIds: string[];
  refutingEvidenceIds: string[];
  rationale: string;
  limitsOfEvidence: string;
  isMisleadingCandidate?: boolean;
}

export interface SimulatedActionTask {
  id: string;
  title: string;
  category: 'REMEDIATION' | 'CIRCUIT_BREAKER' | 'ROLLBACK' | 'DIAGNOSTIC_CHECKLIST' | 'ALERTING_UPDATE';
  urgency: 'IMMEDIATE' | 'NEXT_RELEASE' | 'PLANNED';
  description: string;
  proposedChanges: {
    targetSystem: string;
    actionType: string;
    commandOrConfigSnippet: string;
  }[];
  rollbackPlan: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvalNotes?: string;
}

export interface IncidentReport {
  id: string;
  incidentTitle: string;
  severity: IncidentSeverity;
  generatedAt: string;
  investigationDurationMs: number;
  executiveSummary: string;
  timeline: {
    timestamp: string;
    event: string;
    source: string;
    significance: string;
  }[];
  rootCauseAnalysis: {
    confirmedRootCause: string;
    confidence: number;
    correlationVsCausationNote: string;
    limitsOfAvailableEvidence: string;
  };
  hypothesesEvaluated: Hypothesis[];
  evidenceCitations: EvidenceCitation[];
  unresolvedQuestions: string[];
  simulatedActionTask: SimulatedActionTask;
}

export interface CorrectionRecord {
  id: string;
  feedbackText: string;
  affectedHypothesisIds: string[];
  timestamp: string;
  beforeReportSummary: string;
  afterReportSummary: string;
  changesIdentified: string[];
}

export interface InvestigationSession {
  id: string;
  title: string;
  incidentDescription: string;
  createdAt: string;
  updatedAt: string;
  status: 'DRAFT' | 'PLANNING' | 'RUNNING' | 'COMPLETED' | 'CORRECTED' | 'FAILED';
  datasets: DatasetFile[];
  plan?: InvestigationPlan;
  toolCalls: ToolCallExecution[];
  hypotheses: Hypothesis[];
  evidence: EvidenceCitation[];
  report?: IncidentReport;
  corrections: CorrectionRecord[];
  activePhase: InvestigationPhase;
  error?: string;
}

export interface EvaluationBenchmark {
  id: string;
  name: string;
  incidentBrief: string;
  expectedRootCauseKeywords: string[];
  misleadingHypothesisTitle: string;
  expectedStatus: 'CONFIRMED' | 'REFUTED';
  keyEvidenceRequirements: string[];
}

export interface EvaluationRunResult {
  benchmarkId: string;
  benchmarkName: string;
  passed: boolean;
  score: number; // 0 - 100
  rootCauseMatched: boolean;
  misleadingHypothesisRefuted: boolean;
  evidenceCitationsCount: number;
  unsupportedClaimsAvoided: boolean;
  toolCallsCount: number;
  latencyMs: number;
  details: string;
}
