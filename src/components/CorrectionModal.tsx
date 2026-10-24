import React, { useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Scale,
  Send,
  X,
  Layers,
} from 'lucide-react';
import { InvestigationSession, CorrectionRecord } from '../types/incident';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: InvestigationSession | null;
  onSubmitCorrection: (feedbackText: string) => Promise<CorrectionRecord | null>;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  session,
  onSubmitCorrection,
}) => {
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestCorrection, setLatestCorrection] = useState<CorrectionRecord | null>(null);

  if (!isOpen || !session) return null;

  const quickPrompts = [
    'User traffic did not decline because mobile apps were retrying requests locally.',
    'Payment gateway was not completely offline; only requests with international 3D-Secure cards failed.',
    'Verify whether database connection pool was starved by background analytics queries.',
    'Check if the 504 errors were triggered by an expired TLS certificate on the upstream proxy.',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const record = await onSubmitCorrection(feedbackText);
      if (record) {
        setLatestCorrection(record);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-2xl bg-[#0b1329] border border-violet-900/60 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-950/80 border border-violet-700/60 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-slate-100">
                Investigation Correction & Feedback Loop
              </h2>
              <p className="text-xs text-slate-400">
                Challenge an interpretation, propose alternative causal factors, and trigger a verified rerun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Retraining Disclosure Note */}
        <div className="p-3 rounded-lg bg-violet-950/30 border border-violet-900/40 text-xs text-slate-300 font-sans space-y-1">
          <span className="font-mono font-semibold text-violet-300 block">
            Investigation Epistemology Notice:
          </span>
          <p>
            Providing feedback does not claim model retraining. Instead, the agent incorporates your feedback directly into the current investigation session context, re-runs relevant analysis tools against empirical telemetry, and produces a traceable Before-and-After comparison.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
              Enter Challenge, Alternative Hypothesis, or New Evidence:
            </label>
            <textarea
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g., We suspect the storefront caching layer masked a partial upstream outage..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 text-xs font-mono"
            />
          </div>

          {/* Quick suggestions */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono text-slate-400">Quick Suggestion Templates:</span>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFeedbackText(prompt)}
                  className="text-left text-[11px] font-sans px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !feedbackText.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-violet-950/50 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Rerunning Telemetry Tools...' : 'Rerun With Feedback'}</span>
            </button>
          </div>
        </form>

        {/* Before and After Comparison Diff */}
        {(latestCorrection || (session.corrections && session.corrections.length > 0)) && (
          <div className="space-y-4 border-t border-slate-800 pt-5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-cyan-400" />
              Before-and-After Investigation Comparison
            </h3>

            {(() => {
              const record = latestCorrection || session.corrections[session.corrections.length - 1];
              return (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono">
                    <span className="text-violet-400 font-semibold">User Challenge Recorded: </span>
                    <span className="text-slate-200">"{record.feedbackText}"</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Before */}
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <span className="font-mono text-slate-400 uppercase text-[10px] font-bold block">
                        Original Conclusion (Before):
                      </span>
                      <p className="text-slate-300 font-sans text-xs leading-relaxed line-clamp-4">
                        {record.beforeReportSummary || 'Initial empirical report based on telemetry.'}
                      </p>
                    </div>

                    {/* After */}
                    <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 space-y-2">
                      <span className="font-mono text-cyan-300 uppercase text-[10px] font-bold block">
                        Revised Investigation Output (After):
                      </span>
                      <p className="text-cyan-100 font-sans text-xs leading-relaxed line-clamp-4">
                        {record.afterReportSummary}
                      </p>
                    </div>
                  </div>

                  {/* Changes Identified */}
                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-xs space-y-1">
                    <span className="font-mono text-emerald-300 font-semibold block text-[11px]">
                      Changes Applied to Investigation:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 font-sans text-[11px]">
                      {record.changesIdentified.map((ch, i) => (
                        <li key={i}>{ch}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
