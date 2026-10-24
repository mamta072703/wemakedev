import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  FileQuestion,
  Layers,
  Scale,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Terminal,
  Activity,
  Check,
  Zap,
} from 'lucide-react';
import { InvestigationSession } from '../types/incident';

interface OverviewDashboardProps {
  session: InvestigationSession | null;
  onRunInvestigation: () => void;
  isRunning: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenNewModal: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  session,
  onRunInvestigation,
  isRunning,
  onNavigateTab,
  onOpenNewModal,
}) => {
  if (!session) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Activity className="w-8 h-8 mx-auto text-cyan-400 animate-pulse mb-3" />
        <p>Loading investigation session...</p>
      </div>
    );
  }

  const confirmedHypothesis = session.hypotheses.find((h) => h.status === 'CONFIRMED');
  const refutedHypotheses = session.hypotheses.filter((h) => h.status === 'REFUTED');
  const totalDatasets = session.datasets.length;
  const totalRows = session.datasets.reduce((acc, d) => acc + (d.rowCount || 0), 0);
  const toolCallsCompleted = session.toolCalls.length;
  const evidenceCount = session.evidence.length;
  const hasReport = Boolean(session.report);

  // Severity styling
  const severity = session.report?.severity || 'CRITICAL';
  const severityColors = {
    CRITICAL: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
    HIGH: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
    MEDIUM: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    LOW: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/80',
  }[severity];

  return (
    <div className="space-y-6">
      {/* Incident Banner & Quick Stats */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0c1328] via-[#0f172a] to-[#080d1a] border border-cyan-900/40 p-6 shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${severityColors}`}>
                {severity} INCIDENT
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-slate-800/90 text-slate-300 border border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    session.status === 'COMPLETED'
                      ? 'bg-emerald-400'
                      : session.status === 'RUNNING'
                      ? 'bg-cyan-400 animate-ping'
                      : 'bg-amber-400'
                  }`}
                />
                Status: {session.status}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Session ID: <span className="text-slate-300 font-semibold">{session.id}</span>
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100 font-mono">
              {session.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-sans">
              {session.incidentDescription}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-2.5 shrink-0">
            {!hasReport ? (
              <button
                onClick={onRunInvestigation}
                disabled={isRunning}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-950/60 transition"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>{isRunning ? 'Investigating Telemetry...' : 'Launch Agent Investigation'}</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('report')}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/50 transition"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>View Incident Report</span>
              </button>
            )}
            <button
              onClick={onOpenNewModal}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-medium transition"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>Load Preset / CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Key Derived Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Datasets Inspected */}
        <div
          onClick={() => onNavigateTab('evidence')}
          className="p-4 rounded-xl bg-[#0b1329]/80 border border-cyan-900/30 hover:border-cyan-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Datasets Inspected</span>
            <Database className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-200">{totalDatasets}</span>
            <span className="text-xs font-mono text-slate-400">({totalRows.toLocaleString()} rows)</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 truncate">
            {session.datasets.map((d) => d.name).join(', ')}
          </p>
        </div>

        {/* Tool Calls Completed */}
        <div
          onClick={() => onNavigateTab('timeline')}
          className="p-4 rounded-xl bg-[#0b1329]/80 border border-violet-900/30 hover:border-violet-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Tool Calls</span>
            <Terminal className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-violet-200">{toolCallsCompleted}</span>
            <span className="text-xs font-mono text-slate-400">/ 8 max budget</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {toolCallsCompleted > 0 ? 'Bounded loop execution trace' : 'Waiting to initiate'}
          </p>
        </div>

        {/* Hypotheses Evaluated */}
        <div
          onClick={() => onNavigateTab('hypotheses')}
          className="p-4 rounded-xl bg-[#0b1329]/80 border border-cyan-900/30 hover:border-cyan-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Hypotheses</span>
            <Scale className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">
              {session.hypotheses.length}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {confirmedHypothesis ? '1 Confirmed' : '0 Confirmed'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {refutedHypotheses.length} Refuted by empirical telemetry
          </p>
        </div>

        {/* Evidence Citations */}
        <div
          onClick={() => onNavigateTab('evidence')}
          className="p-4 rounded-xl bg-[#0b1329]/80 border border-violet-900/30 hover:border-violet-500/50 cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">Evidence Citations</span>
            <Layers className="w-4 h-4 text-violet-400 group-hover:scale-110 transition" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-cyan-200">{evidenceCount}</span>
            <span className="text-xs font-mono text-slate-400">verified items</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Metrics, timestamps & error logs
          </p>
        </div>
      </div>

      {/* Ground Truth & Unresolved Questions Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verified Root Cause Card */}
        <div className="lg:col-span-2 rounded-xl bg-[#0b1329]/90 border border-slate-800 p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-mono font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Verified Root Cause Determination
            </h3>
            {confirmedHypothesis && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 font-bold">
                {confirmedHypothesis.confidenceScore}% Certainty
              </span>
            )}
          </div>

          {confirmedHypothesis ? (
            <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/30 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-200 font-mono">
                    {confirmedHypothesis.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {confirmedHypothesis.statement}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-400 bg-black/30 p-3 rounded font-mono space-y-1">
                <div className="text-emerald-300 font-semibold">Supporting Telemetry:</div>
                <p className="text-slate-300">{confirmedHypothesis.rationale}</p>
              </div>

              <div className="text-[11px] text-amber-300/80 bg-amber-950/20 p-2.5 rounded border border-amber-900/30">
                <span className="font-semibold text-amber-200 font-mono">Limits of Evidence: </span>
                {confirmedHypothesis.limitsOfEvidence}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-lg bg-slate-900/40 border border-slate-800/80 text-slate-400">
              <Clock className="w-6 h-6 mx-auto mb-2 text-cyan-400 animate-spin" />
              <p className="text-sm font-medium">No investigation executed yet for this incident session.</p>
              <button
                onClick={onRunInvestigation}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition"
              >
                <span>Run Autonomous Investigation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Evidence Supporting Each Hypothesis Matrix Summary */}
          {session.hypotheses.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
                Hypotheses Evaluated & Verified
              </h4>
              <div className="space-y-2">
                {session.hypotheses.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400">{h.id}:</span>
                      <span className="text-slate-200 font-medium">{h.title}</span>
                      {h.isMisleadingCandidate && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                          Misleading Theory
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          h.status === 'CONFIRMED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : h.status === 'REFUTED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {h.status}
                      </span>
                      <span className="text-slate-400">{h.confidenceScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unresolved Questions & Recommended Safe Next Steps */}
        <div className="space-y-6">
          {/* Recommended Next Step / Action Proposal */}
          <div className="rounded-xl bg-[#0b1329]/90 border border-cyan-900/40 p-5 space-y-3 shadow-md">
            <h3 className="text-sm font-mono font-bold text-cyan-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Recommended Next Step
            </h3>

            {session.report?.simulatedActionTask ? (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-slate-900/70 border border-cyan-900/50">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-300 font-bold">
                      {session.report.simulatedActionTask.title}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        session.report.simulatedActionTask.status === 'APPROVED'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {session.report.simulatedActionTask.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1.5 leading-snug">
                    {session.report.simulatedActionTask.description}
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 bg-black/40 p-2.5 rounded font-mono">
                  <div className="text-slate-300 font-semibold mb-1">Human Approval Gate:</div>
                  <p className="text-slate-400">
                    Production changes and rollbacks require verified human approval before deployment execution.
                  </p>
                </div>

                <button
                  onClick={() => onNavigateTab('report')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition"
                >
                  <span>Review Action Task</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Action tasks will be generated after the agent finishes investigating telemetry.
              </p>
            )}
          </div>

          {/* Unresolved Questions Card */}
          <div className="rounded-xl bg-[#0b1329]/90 border border-slate-800 p-5 space-y-3 shadow-md">
            <h3 className="text-sm font-mono font-bold text-slate-300 flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-violet-400" />
              Unresolved Questions
            </h3>

            {session.report?.unresolvedQuestions && session.report.unresolvedQuestions.length > 0 ? (
              <ul className="space-y-2">
                {session.report.unresolvedQuestions.map((q, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-300 font-sans flex items-start gap-2"
                  >
                    <span className="text-violet-400 font-mono font-bold">Q{idx + 1}:</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">
                The agent highlights boundary limits and open operational questions during the verification phase.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
