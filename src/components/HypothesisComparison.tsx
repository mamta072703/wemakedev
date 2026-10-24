import React from 'react';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  ShieldAlert,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { InvestigationSession, Hypothesis, HypothesisStatus } from '../types/incident';

interface HypothesisComparisonProps {
  session: InvestigationSession | null;
  onNavigateToEvidence?: () => void;
  onOpenCorrection?: () => void;
}

export const HypothesisComparison: React.FC<HypothesisComparisonProps> = ({
  session,
  onNavigateToEvidence,
  onOpenCorrection,
}) => {
  if (!session) return null;

  const hypotheses = session.hypotheses || [];

  const getStatusBadge = (status: HypothesisStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700 shadow-sm shadow-emerald-950">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            CONFIRMED
          </span>
        );
      case 'REFUTED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-700 shadow-sm shadow-rose-950">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            REFUTED
          </span>
        );
      case 'PARTIALLY_SUPPORTED':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            PARTIALLY SUPPORTED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
            INSUFFICIENT DATA
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Principle Banner */}
      <div className="p-4 rounded-xl bg-[#0b1329]/90 border border-cyan-900/40 flex items-start gap-3">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1 font-sans">
          <p className="font-semibold text-cyan-200 font-mono">
            Scientific Epistemology & Anti-Conflation Rule:
          </p>
          <p>
            VerityOps AI does not declare a root cause confirmed solely because two events occurred at the same time. Every hypothesis is tested against negative evidence, baseline deltas, and error codes. Competing claims are systematically verified or refuted.
          </p>
        </div>
      </div>

      {/* Hypotheses Comparison Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {hypotheses.map((h) => {
          const isConfirmed = h.status === 'CONFIRMED';
          const isRefuted = h.status === 'REFUTED';

          return (
            <div
              key={h.id}
              className={`rounded-2xl p-5 border transition flex flex-col justify-between shadow-xl ${
                isConfirmed
                  ? 'bg-gradient-to-b from-[#0e1a2f] to-[#09101f] border-emerald-500/50 shadow-emerald-950/20 ring-1 ring-emerald-500/20'
                  : isRefuted
                  ? 'bg-[#0a0f1d]/90 border-rose-900/40 shadow-rose-950/10'
                  : 'bg-[#0b1329]/90 border-slate-800'
              }`}
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-mono font-bold text-xs text-cyan-300 border border-slate-700">
                      {h.id}
                    </span>
                    {h.isMisleadingCandidate && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950 text-amber-300 border border-amber-800">
                        Misleading Hypothesis
                      </span>
                    )}
                  </div>
                  {getStatusBadge(h.status)}
                </div>

                <div>
                  <h3 className="text-base font-bold font-mono text-slate-100">
                    {h.title}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
                    {h.statement}
                  </p>
                </div>

                {/* Confidence Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Certainty / Confidence:</span>
                    <span
                      className={`font-bold ${
                        isConfirmed
                          ? 'text-emerald-400'
                          : isRefuted
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {h.confidenceScore}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isConfirmed
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                          : isRefuted
                          ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${h.confidenceScore}%` }}
                    />
                  </div>
                </div>

                {/* Empirical Telemetry Rationale */}
                <div className="p-3 rounded-lg bg-black/40 border border-slate-800 space-y-1 text-xs">
                  <span className="font-mono text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                    Empirical Assessment Rationale:
                  </span>
                  <p className="text-slate-300 font-sans leading-relaxed">
                    {h.rationale}
                  </p>
                </div>

                {/* Evidence Citations */}
                <div className="space-y-2">
                  <span className="font-mono text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                    Telemetry Citations:
                  </span>
                  {isConfirmed && (
                    <div className="flex flex-wrap gap-1.5">
                      {h.supportingEvidenceIds.map((eid) => (
                        <span
                          key={eid}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800"
                        >
                          +{eid}
                        </span>
                      ))}
                    </div>
                  )}
                  {isRefuted && (
                    <div className="flex flex-wrap gap-1.5">
                      {h.refutingEvidenceIds.map((eid) => (
                        <span
                          key={eid}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800"
                        >
                          refuted by {eid}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Limits of Available Evidence */}
                <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-300/80 space-y-1">
                  <span className="font-mono font-bold text-amber-200 block">
                    Limits of Available Evidence:
                  </span>
                  <p className="font-sans leading-snug">{h.limitsOfEvidence}</p>
                </div>
              </div>

              {/* Action Button at bottom */}
              <div className="pt-4 border-t border-slate-800 mt-4">
                {isRefuted ? (
                  <button
                    onClick={onOpenCorrection}
                    className="w-full py-1.5 rounded-lg text-xs font-mono font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                  >
                    Challenge Refutation
                  </button>
                ) : (
                  <button
                    onClick={onNavigateToEvidence}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition"
                  >
                    <span>Inspect Raw Supporting Telemetry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
