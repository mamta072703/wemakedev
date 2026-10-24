import React from 'react';
import {
  ShieldAlert,
  Play,
  RotateCcw,
  Sparkles,
  Database,
  Cpu,
  Layers,
  FileText,
  Activity,
  CheckCircle2,
  Sliders,
  Scale,
  Compass,
} from 'lucide-react';
import { InvestigationSession } from '../types/incident';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: InvestigationSession | null;
  onRunInvestigation: () => void;
  isRunning: boolean;
  onNewInvestigationClick: () => void;
  onOpenCorrectionModal: () => void;
  geminiConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  session,
  onRunInvestigation,
  isRunning,
  onNewInvestigationClick,
  onOpenCorrectionModal,
  geminiConfigured,
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'timeline', label: 'Agent Timeline', icon: Cpu, badge: session?.toolCalls.length },
    { id: 'evidence', label: 'Evidence Explorer', icon: Layers, badge: session?.evidence.length },
    { id: 'hypotheses', label: 'Hypotheses', icon: Scale, badge: session?.hypotheses.length },
    { id: 'report', label: 'Incident Report', icon: FileText, badge: session?.report ? 'Ready' : undefined },
    { id: 'evaluations', label: 'Evaluation Hub', icon: CheckCircle2 },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080d1a]/95 backdrop-blur-md border-b border-cyan-900/40 px-4 lg:px-6 py-3">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-violet-500/20 to-purple-500/30 border border-cyan-500/40 shadow-lg shadow-cyan-950/50">
            <ShieldAlert className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-cyan-300 via-sky-200 to-violet-300 bg-clip-text text-transparent font-mono">
                VerityOps<span className="text-cyan-400">.AI</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                Evidence Agent
              </span>
              <span
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                  geminiConfigured
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                    : 'bg-violet-950/80 text-violet-300 border border-violet-800/50'
                }`}
                title={geminiConfigured ? 'Gemini 3.8 Flash Active' : 'Deterministic Empirical Mode (Ready)'}
              >
                <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                {geminiConfigured ? 'Gemini 3.8 Flash' : 'Deterministic Empirical Mode'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans tracking-tight">
              Don't just ask AI. Let it investigate, verify, and act.
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNewInvestigationClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 transition"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Switch / Load Incident</span>
          </button>

          {session?.report && (
            <button
              onClick={onOpenCorrectionModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-950/60 hover:bg-violet-900/60 text-violet-200 border border-violet-700/50 transition"
              title="Challenge findings or provide feedback"
            >
              <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
              <span>Challenge / Correct</span>
            </button>
          )}

          <button
            onClick={onRunInvestigation}
            disabled={isRunning}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold shadow-md transition ${
              isRunning
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-slate-950 font-bold shadow-cyan-900/50'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin text-cyan-400' : 'fill-slate-950'}`} />
            <span>{isRunning ? 'Investigating...' : 'Run Investigation'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 mt-3 overflow-x-auto no-scrollbar border-t border-slate-800/80 pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-950/90 to-violet-950/90 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-cyan-400 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
