import React, { useState } from 'react';
import {
  FileText,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Check,
  Send,
  Terminal,
  Printer,
  Share2,
  Lock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { InvestigationSession, IncidentReport, SimulatedActionTask } from '../types/incident';

interface IncidentReportViewProps {
  session: InvestigationSession | null;
  onOpenCorrectionModal: () => void;
  onApproveAction: (actionId: string, notes: string, operator: string) => Promise<void>;
}

export const IncidentReportView: React.FC<IncidentReportViewProps> = ({
  session,
  onOpenCorrectionModal,
  onApproveAction,
}) => {
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [operatorName, setOperatorName] = useState('Incident Commander');
  const [approvalNotes, setApprovalNotes] = useState('Reviewed rollback changes against staging runbook. Authorization granted.');
  const [isApproving, setIsApproving] = useState(false);

  if (!session || !session.report) {
    return (
      <div className="p-12 text-center rounded-2xl bg-[#0b1329]/90 border border-slate-800 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-3 text-cyan-400 animate-pulse" />
        <h3 className="text-base font-bold text-slate-200 font-mono">Incident Report Pending</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Run the autonomous investigation loop to synthesize verified findings, timeline, and actionable remediation.
        </p>
      </div>
    );
  }

  const report: IncidentReport = session.report;
  const actionTask: SimulatedActionTask = report.simulatedActionTask;

  const handleApprovalSubmit = async () => {
    setIsApproving(true);
    try {
      await onApproveAction(actionTask.id, approvalNotes, operatorName);
      setShowApprovalModal(false);
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0b1329]/90 border border-slate-800">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          <span className="font-mono text-xs uppercase tracking-wider text-slate-400">
            Post-Mortem Incident Document
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
            {report.id}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCorrectionModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-950/80 hover:bg-violet-900 text-violet-300 border border-violet-800 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Challenge / Add Evidence</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Main Document Body */}
      <div className="rounded-2xl bg-[#0b1329]/95 border border-slate-800 p-6 md:p-8 space-y-8 shadow-2xl">
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
              {report.severity} SEVERITY POST-MORTEM
            </span>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span>Investigation Duration: {report.investigationDurationMs}ms</span>
              <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold font-mono text-slate-100 tracking-tight">
            {report.incidentTitle}
          </h1>
        </div>

        {/* Executive Summary */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            1. Executive Summary
          </h2>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-200 text-sm leading-relaxed font-sans">
            {report.executiveSummary}
          </div>
        </div>

        {/* Verified Root Cause Analysis */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
            2. Verified Root Cause Determination
          </h2>
          <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold font-mono text-emerald-200">
                  {report.rootCauseAnalysis.confirmedRootCause}
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 shrink-0">
                {report.rootCauseAnalysis.confidence}% Certainty
              </span>
            </div>

            {/* Correlation vs Causation */}
            <div className="text-xs font-sans text-slate-300 bg-black/40 p-3 rounded-lg border border-slate-900 space-y-1">
              <span className="font-mono font-semibold text-cyan-300 block">
                Causality Proof vs Pure Correlation:
              </span>
              <p>{report.rootCauseAnalysis.correlationVsCausationNote}</p>
            </div>

            {/* Limits of Available Evidence */}
            <div className="text-xs font-sans text-amber-300/90 bg-amber-950/20 p-3 rounded-lg border border-amber-900/30 space-y-1">
              <span className="font-mono font-semibold text-amber-200 block">
                Epistemological Limits of Evidence:
              </span>
              <p>{report.rootCauseAnalysis.limitsOfAvailableEvidence}</p>
            </div>
          </div>
        </div>

        {/* Chronological Incident Timeline */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">
            3. Chronological Event Timeline
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Timestamp (UTC)</th>
                  <th className="py-2.5 px-3">Milestone Event</th>
                  <th className="py-2.5 px-3">Source Dataset</th>
                  <th className="py-2.5 px-3">Significance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 font-sans">
                {report.timeline.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/30 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {item.timestamp}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{item.event}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {item.source}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-300">{item.significance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hypotheses Comparison Summary */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400">
            4. Evaluated Explanations & Evidence Matrix
          </h2>
          <div className="space-y-2">
            {report.hypothesesEvaluated.map((h) => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{h.id}:</span>
                    <span className="font-bold text-slate-200">{h.title}</span>
                    {h.isMisleadingCandidate && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                        Misleading Hypothesis
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 font-sans text-xs">{h.rationale}</p>
                </div>

                <div className="shrink-0 flex items-center gap-2 font-mono">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-bold ${
                      h.status === 'CONFIRMED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {h.status} ({h.confidenceScore}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unresolved Questions */}
        <div className="space-y-3">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">
            5. Unresolved Operational Questions & Boundary Inquiries
          </h2>
          <ul className="space-y-2">
            {report.unresolvedQuestions.map((q, idx) => (
              <li
                key={idx}
                className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-300 font-sans flex items-start gap-2"
              >
                <span className="text-violet-400 font-mono font-bold">#{idx + 1}</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Simulated Action & Safe Human Approval Gate */}
        <div className="space-y-3 border-t border-slate-800 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-cyan-400" />
              6. Proposed Safe Remediation Task (Human Approval Required)
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${
                actionTask.status === 'APPROVED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {actionTask.status}
            </span>
          </div>

          <div className="p-5 rounded-xl bg-[#09101f] border border-cyan-900/50 space-y-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold font-mono text-cyan-200">
                  {actionTask.title}
                </h3>
                <p className="text-xs text-slate-300 font-sans mt-0.5">
                  {actionTask.description}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 self-start sm:self-center">
                Urgency: {actionTask.urgency}
              </span>
            </div>

            {/* Proposed Command Snippets */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                Proposed Automated Configuration Changes:
              </span>
              {actionTask.proposedChanges.map((change, i) => (
                <div key={i} className="p-3 rounded-lg bg-black/50 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-cyan-300 font-semibold">{change.targetSystem}</span>
                    <span className="text-slate-400">{change.actionType}</span>
                  </div>
                  <pre className="p-2 rounded bg-slate-950 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-900">
                    {change.commandOrConfigSnippet}
                  </pre>
                </div>
              ))}
            </div>

            {/* Rollback Safety Plan */}
            <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs space-y-1">
              <span className="font-mono text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Fallback & Rollback Assurance Plan:
              </span>
              <p className="text-slate-300 font-sans">{actionTask.rollbackPlan}</p>
            </div>

            {/* Human Approval Status or Button */}
            {actionTask.status === 'APPROVED' ? (
              <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved by: {actionTask.approvedBy}</span>
                </div>
                <span className="text-slate-400 text-[11px]">{actionTask.approvalNotes}</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <p className="text-xs text-amber-300/80 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  No destructive operations executed without human sign-off.
                </p>
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-950/50 transition flex items-center gap-2 justify-center"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Approve & Authorize Remediation Task</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Human Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0b1329] border border-cyan-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-mono text-base font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-400" />
                Human Authorization Gate
              </h3>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-300 font-sans leading-relaxed">
              You are authorizing execution of the simulated remediation plan:{' '}
              <strong className="text-cyan-300 font-mono">{actionTask.title}</strong>.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Operator Name / Role:</label>
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Authorization Notes:</label>
                <textarea
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-mono text-slate-300 hover:bg-slate-800 transition"
              >
                Dismiss
              </button>
              <button
                onClick={handleApprovalSubmit}
                disabled={isApproving}
                className="px-5 py-2 rounded-lg text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{isApproving ? 'Authorizing...' : 'Sign & Authorize'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
