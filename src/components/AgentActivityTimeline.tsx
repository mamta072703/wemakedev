import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Code2,
  Play,
  Cpu,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { InvestigationSession, ToolCallExecution, InvestigationPhase } from '../types/incident';

interface AgentActivityTimelineProps {
  session: InvestigationSession | null;
  isRunning: boolean;
  onExecuteToolOnDemand?: (toolName: string, args: Record<string, any>) => void;
}

const PHASES: { id: InvestigationPhase; label: string; desc: string }[] = [
  { id: 'PLAN', label: '1. Plan', desc: 'Synthesize strategy' },
  { id: 'INSPECT', label: '2. Inspect', desc: 'Scan datasets & logs' },
  { id: 'ANALYZE', label: '3. Analyze', desc: 'Metrics & time windows' },
  { id: 'HYPOTHESIZE', label: '4. Hypothesize', desc: 'Propose explanations' },
  { id: 'TEST', label: '5. Test', desc: 'Empirical tests' },
  { id: 'VERIFY', label: '6. Verify', desc: 'Audit consistency' },
  { id: 'REPORT', label: '7. Report', desc: 'Generate post-mortem' },
  { id: 'ACT', label: '8. Act', desc: 'Simulate remediation' },
  { id: 'EVALUATE', label: '9. Evaluate', desc: 'Correction & feedback' },
];

export const AgentActivityTimeline: React.FC<AgentActivityTimelineProps> = ({
  session,
  isRunning,
  onExecuteToolOnDemand,
}) => {
  const [expandedToolId, setExpandedToolId] = useState<string | null>(null);
  const [selectedJsonView, setSelectedJsonView] = useState<any | null>(null);

  if (!session) return null;

  const toolCalls = session.toolCalls || [];
  const currentPhase = session.activePhase;

  return (
    <div className="space-y-6">
      {/* 9-Phase Workflow Header Progress */}
      <div className="rounded-2xl bg-[#0b1329]/90 border border-slate-800 p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold font-mono text-slate-100 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              Autonomous Agent Execution Loop
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict 9-phase evidence cycle with bounded maximum of 8 tool invocations per investigation
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-slate-400">Tool Calls:</span>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
              {toolCalls.length} / 8 budget
            </span>
          </div>
        </div>

        {/* Phase Stepper */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 pt-2">
          {PHASES.map((p, idx) => {
            const isDone = session.status === 'COMPLETED' || session.status === 'CORRECTED';
            const isActive = isRunning && currentPhase === p.id;
            return (
              <div
                key={p.id}
                className={`p-2 rounded-lg border text-center transition ${
                  isActive
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950'
                    : isDone
                    ? 'bg-[#0f172a]/60 border-slate-800 text-slate-300'
                    : 'bg-[#080d1a]/60 border-slate-900 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-mono font-bold truncate">
                  {p.label}
                </div>
                <div className="text-[9px] text-slate-400 truncate mt-0.5">{p.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Investigation Plan Card */}
      {session.plan && (
        <div className="rounded-xl bg-[#0b1329]/90 border border-cyan-900/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Structured Investigation Plan
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Formulated via Gemini Model Reasoning
            </span>
          </div>

          <p className="text-xs text-slate-300 bg-slate-900/50 p-2.5 rounded border border-slate-800">
            {session.plan.incidentSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80">
              <span className="font-mono text-cyan-400 font-semibold text-[11px]">Primary Questions:</span>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-300 text-[11px]">
                {session.plan.primaryQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-900/40 p-2.5 rounded border border-slate-800/80">
              <span className="font-mono text-violet-400 font-semibold text-[11px]">Planned Steps:</span>
              <ul className="list-decimal list-inside mt-1 space-y-1 text-slate-300 text-[11px]">
                {session.plan.plannedSteps.slice(0, 4).map((s, i) => (
                  <li key={i}>
                    <span className="font-mono text-slate-400">{s.tool}</span>: {s.rationale}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tool Call Execution Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-violet-400" />
            Tool Call Trace ({toolCalls.length} executed)
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            Bounded loop max: 8 calls
          </span>
        </div>

        {toolCalls.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-900/30 border border-slate-800 text-slate-400">
            <Clock className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
            <p className="text-xs">No tool calls executed yet. Click "Run Investigation" to start.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {toolCalls.map((call, index) => {
              const isExpanded = expandedToolId === call.id;
              const isSuccess = call.status === 'SUCCESS';

              return (
                <div
                  key={call.id}
                  className={`rounded-xl border transition ${
                    isSuccess
                      ? 'bg-[#0b1329]/90 border-slate-800 hover:border-cyan-800/60'
                      : 'bg-rose-950/20 border-rose-900/50'
                  }`}
                >
                  {/* Tool Call Header */}
                  <div
                    onClick={() => setExpandedToolId(isExpanded ? null : call.id)}
                    className="flex items-center justify-between p-3.5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 text-cyan-300 font-mono text-xs font-bold border border-slate-700">
                        {index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-cyan-300">
                            {call.toolName}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800/80 text-slate-400">
                            {call.phase}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                          {call.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <span className="text-slate-400 text-[11px]">{call.durationMs}ms</span>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          isSuccess
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                        {call.status}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Parameters & Outputs */}
                  {isExpanded && (
                    <div className="border-t border-slate-800/80 p-4 space-y-3 bg-black/20 text-xs">
                      {/* Arguments */}
                      <div>
                        <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                          Tool Inputs / Arguments:
                        </span>
                        <pre className="p-2.5 rounded bg-slate-950/90 text-cyan-300 font-mono overflow-x-auto text-[11px] border border-slate-800">
                          {JSON.stringify(call.arguments, null, 2)}
                        </pre>
                      </div>

                      {/* Result */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-slate-400 uppercase tracking-wider text-[10px]">
                            Tool Execution Output:
                          </span>
                          <button
                            onClick={() => setSelectedJsonView(call.result)}
                            className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                          >
                            <Code2 className="w-3 h-3" />
                            View Raw JSON
                          </button>
                        </div>
                        <pre className="p-2.5 rounded bg-slate-950/90 text-emerald-300 font-mono overflow-x-auto text-[11px] max-h-48 border border-slate-800">
                          {JSON.stringify(call.result, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw JSON Modal */}
      {selectedJsonView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0b1329] border border-cyan-800 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-mono text-sm font-bold text-cyan-300 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                Raw Tool Result JSON
              </h3>
              <button
                onClick={() => setSelectedJsonView(null)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono px-2 py-1 rounded bg-slate-800"
              >
                Close
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-950 text-cyan-200 font-mono text-xs overflow-auto max-h-96 border border-slate-800">
              {JSON.stringify(selectedJsonView, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
