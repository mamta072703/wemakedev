import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewDashboard } from './components/OverviewDashboard';
import { AgentActivityTimeline } from './components/AgentActivityTimeline';
import { EvidenceExplorer } from './components/EvidenceExplorer';
import { HypothesisComparison } from './components/HypothesisComparison';
import { IncidentReportView } from './components/IncidentReportView';
import { EvaluationHub } from './components/EvaluationHub';
import { NewInvestigationModal } from './components/NewInvestigationModal';
import { CorrectionModal } from './components/CorrectionModal';
import {
  fetchHealth,
  fetchPresets,
  fetchSession,
  executeInvestigation,
  sendCorrection,
  approveSimulatedAction,
  runToolOnDemand,
} from './services/api';
import { InvestigationSession, DatasetFile, CorrectionRecord } from './types/incident';
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Zap } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [session, setSession] = useState<InvestigationSession | null>(null);
  const [presets, setPresets] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Initialize data on load
  useEffect(() => {
    async function init() {
      try {
        const health = await fetchHealth();
        setGeminiConfigured(health.geminiConfigured);

        const presetsData = await fetchPresets();
        setPresets(presetsData.presets);

        const sessionData = await fetchSession();
        setSession(sessionData.session);

        // Auto-run initial investigation if draft
        if (sessionData.session && sessionData.session.toolCalls.length === 0) {
          runInvestigationAsync(sessionData.session);
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setNotification({
          type: 'error',
          message: 'Failed to initialize session. Using fallback dataset.',
        });
      }
    }
    init();
  }, []);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const runInvestigationAsync = async (sess: InvestigationSession) => {
    setIsRunning(true);
    showNotification('info', 'Agent starting investigation loop (max 8 tools budget)...');
    try {
      const res = await executeInvestigation(sess.id, sess.incidentDescription, sess.datasets);
      if (res.success && res.session) {
        setSession(res.session);
        showNotification('success', `Investigation complete! ${res.session.toolCalls.length} tools executed, findings verified.`);
      }
    } catch (err: any) {
      console.error('Investigation error:', err);
      showNotification('error', `Investigation run failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunInvestigation = () => {
    if (!session || isRunning) return;
    runInvestigationAsync(session);
  };

  const handleLaunchNew = async (description: string, datasets: DatasetFile[]) => {
    const newSessionId = `session-${Date.now().toString(36)}`;
    const newSession: InvestigationSession = {
      id: newSessionId,
      title: description.slice(0, 50),
      incidentDescription: description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'PLANNING',
      datasets,
      toolCalls: [],
      hypotheses: [],
      evidence: [],
      corrections: [],
      activePhase: 'PLAN',
    };

    setSession(newSession);
    setActiveTab('timeline');
    runInvestigationAsync(newSession);
  };

  const handleApproveAction = async (actionId: string, notes: string, operator: string) => {
    if (!session) return;
    try {
      const res = await approveSimulatedAction(session.id, actionId, notes, operator);
      if (res.success && session.report) {
        const updated = { ...session };
        if (updated.report) {
          updated.report.simulatedActionTask = res.actionTask;
        }
        setSession(updated);
        showNotification('success', `Remediation task "${res.actionTask.title}" approved by ${operator}.`);
      }
    } catch (err: any) {
      showNotification('error', `Approval failed: ${err.message}`);
      throw err;
    }
  };

  const handleSubmitCorrection = async (feedbackText: string): Promise<CorrectionRecord | null> => {
    if (!session) return null;
    try {
      const res = await sendCorrection(session.id, feedbackText);
      if (res.success && res.session) {
        setSession(res.session);
        showNotification('success', 'Investigation updated with user challenge. Before-and-after comparison generated.');
        return res.correctionRecord;
      }
      return null;
    } catch (err: any) {
      showNotification('error', `Correction failed: ${err.message}`);
      return null;
    }
  };

  const handleExecuteToolOnDemand = async (toolName: string, args: Record<string, any>) => {
    if (!session) return;
    try {
      const res = await runToolOnDemand(toolName, args, session.datasets);
      if (res.toolExecution) {
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            toolCalls: [...prev.toolCalls, res.toolExecution],
          };
        });
        showNotification('success', `Tool ${toolName} executed successfully.`);
      }
    } catch (err: any) {
      showNotification('error', `Tool execution error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        session={session}
        onRunInvestigation={handleRunInvestigation}
        isRunning={isRunning}
        onNewInvestigationClick={() => setIsNewModalOpen(true)}
        onOpenCorrectionModal={() => setIsCorrectionModalOpen(true)}
        geminiConfigured={geminiConfigured}
      />

      {/* Live Toast Notification */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-mono backdrop-blur-md ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700/80'
                : notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-200 border-rose-700/80'
                : 'bg-cyan-950/90 text-cyan-200 border-cyan-700/80'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            )}
            <span className="flex-1">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 ml-2"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6">
        {activeTab === 'overview' && (
          <OverviewDashboard
            session={session}
            onRunInvestigation={handleRunInvestigation}
            isRunning={isRunning}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onOpenNewModal={() => setIsNewModalOpen(true)}
          />
        )}

        {activeTab === 'timeline' && (
          <AgentActivityTimeline
            session={session}
            isRunning={isRunning}
            onExecuteToolOnDemand={handleExecuteToolOnDemand}
          />
        )}

        {activeTab === 'evidence' && <EvidenceExplorer session={session} />}

        {activeTab === 'hypotheses' && (
          <HypothesisComparison
            session={session}
            onNavigateToEvidence={() => setActiveTab('evidence')}
            onOpenCorrection={() => setIsCorrectionModalOpen(true)}
          />
        )}

        {activeTab === 'report' && (
          <IncidentReportView
            session={session}
            onOpenCorrectionModal={() => setIsCorrectionModalOpen(true)}
            onApproveAction={handleApproveAction}
          />
        )}

        {activeTab === 'evaluations' && <EvaluationHub />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs font-mono text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
          <span>VerityOps AI — Autonomous Evidence-Driven Incident Response Platform</span>
          <span className="text-[11px] text-slate-400">
            Powered by Gemini API & Multi-Tool Empirical Inference
          </span>
        </div>
      </footer>

      {/* Modals */}
      <NewInvestigationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onLaunchInvestigation={handleLaunchNew}
        presets={presets}
      />

      <CorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        session={session}
        onSubmitCorrection={handleSubmitCorrection}
      />
    </div>
  );
}
