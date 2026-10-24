import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import {
  Layers,
  Search,
  Filter,
  FileSpreadsheet,
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { InvestigationSession, EvidenceCitation } from '../types/incident';

interface EvidenceExplorerProps {
  session: InvestigationSession | null;
}

export const EvidenceExplorer: React.FC<EvidenceExplorerProps> = ({ session }) => {
  const [activeEvidenceType, setActiveEvidenceType] = useState<string>('ALL');
  const [logFilterQuery, setLogFilterQuery] = useState<string>('');
  const [selectedStatusCode, setSelectedStatusCode] = useState<string>('ALL');
  const [selectedDatasetTab, setSelectedDatasetTab] = useState<number>(0);

  if (!session) return null;

  const evidence = session.evidence || [];
  const metricsDataset = session.datasets[0];
  const logsDataset = session.datasets.find((d) => d.name.toLowerCase().includes('log')) || session.datasets[1];

  // Process time series rows for Recharts
  const chartData = (metricsDataset?.rows || []).map((r, idx) => {
    const timeLabel = r.timestamp ? r.timestamp.split('T')[1]?.substring(0, 5) || `T+${idx}` : `T+${idx}`;
    return {
      time: timeLabel,
      requests: Number(r.request_count || 0),
      orders: Number(r.successful_orders || 0),
      failures: Number(r.failed_payments || r.http_504_count || r.db_timeout_errors || 0),
      latency: Number(r.avg_latency_ms || r.p95_latency_ms || 0),
      failureRate: Number(r.payment_gateway_error_rate_pct || 0),
    };
  });

  // Filter evidence cards
  const filteredEvidence = evidence.filter((ev) => {
    if (activeEvidenceType === 'ALL') return true;
    return ev.type === activeEvidenceType;
  });

  // Filter logs
  const logRows = (logsDataset?.rows || []).filter((log) => {
    const matchesQuery =
      !logFilterQuery ||
      JSON.stringify(log).toLowerCase().includes(logFilterQuery.toLowerCase());
    const matchesStatus =
      selectedStatusCode === 'ALL' ||
      String(log.status_code) === selectedStatusCode;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Evidence Type Navigation / Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#0b1329]/90 border border-slate-800">
        <div>
          <h2 className="text-sm font-bold font-mono text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Empirical Evidence Explorer
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Strict separation between directly observed facts, calculated metrics, hypotheses, and unresolved questions
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
          {['ALL', 'METRIC', 'LOG_ENTRY', 'TIMESTAMP', 'STATISTICAL_TEST'].map((type) => (
            <button
              key={type}
              onClick={() => setActiveEvidenceType(type)}
              className={`px-3 py-1 rounded-lg transition ${
                activeEvidenceType === type
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Recharts Interactive Telemetry Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Traffic Volume vs Successful Orders & Payment Failures */}
        <div className="rounded-2xl bg-[#0b1329]/90 border border-slate-800 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                Inbound Traffic vs Orders & Failures
              </h3>
              <p className="text-[11px] text-slate-400">
                Notice: Traffic remained steady (~2,050 req/min) while orders collapsed at 14:14 UTC
              </p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              1-Minute Granularity
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailures" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine x="14:12" stroke="#a855f7" strokeDasharray="4 4" label={{ value: 'v2.4.1 Deploy', fill: '#c084fc', fontSize: 10 }} />
                <ReferenceLine x="14:14" stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'Failures Surge', fill: '#fb7185', fontSize: 10 }} />
                <Area type="monotone" dataKey="requests" stroke="#38bdf8" fillOpacity={1} fill="url(#colorRequests)" name="Request Count (req/min)" />
                <Area type="monotone" dataKey="orders" stroke="#34d399" fill="#10b981" fillOpacity={0.2} name="Successful Orders" />
                <Area type="monotone" dataKey="failures" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailures)" name="Failed Payments / 504s" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Latency Spike & Gateway Error Rate % */}
        <div className="rounded-2xl bg-[#0b1329]/90 border border-slate-800 p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-300">
                Response Latency (ms) & Failure Rate (%)
              </h3>
              <p className="text-[11px] text-slate-400">
                15-second read timeouts caused average checkout latency to jump from 110ms to &gt;3,400ms
              </p>
            </div>
            <span className="text-[10px] font-mono text-violet-400 bg-violet-950/80 px-2 py-0.5 rounded border border-violet-800">
              Correlated Spike
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <ReferenceLine x="14:14" stroke="#f43f5e" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="latency" stroke="#a855f7" strokeWidth={2} dot={false} name="Avg Latency (ms)" />
                <Line type="monotone" dataKey="failureRate" stroke="#fb923c" strokeWidth={2} dot={false} name="Failure Rate (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Traceable Evidence Cards Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          Traceable Evidence Citations ({filteredEvidence.length} items)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvidence.map((ev) => (
            <div
              key={ev.id}
              className="p-4 rounded-xl bg-[#0b1329]/90 border border-slate-800 hover:border-cyan-800/60 transition space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 font-bold">
                  {ev.type}
                </span>
                <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                  {ev.sourceDataset}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100 font-mono">
                  {ev.metricOrField}
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed font-sans">
                  {ev.description}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-black/40 p-2.5 rounded border border-slate-900">
                <div>
                  <span className="text-slate-400 text-[10px] block">Observed:</span>
                  <span className="text-emerald-300 font-bold">{ev.observedValue}</span>
                </div>
                {ev.baselineValue && (
                  <div>
                    <span className="text-slate-400 text-[10px] block">Baseline:</span>
                    <span className="text-slate-300">{ev.baselineValue}</span>
                  </div>
                )}
                {ev.timestampOrWindow && (
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Window / Time:</span>
                    <span className="text-violet-300">{ev.timestampOrWindow}</span>
                  </div>
                )}
              </div>

              {/* Support / Refute Badge */}
              <div className="flex items-center gap-2 text-[11px] font-mono pt-1">
                {ev.supportsHypothesisId && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Supports {ev.supportsHypothesisId}
                  </span>
                )}
                {ev.refutesHypothesisId && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Refutes {ev.refutesHypothesisId}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Log Inspector & Raw Dataset Viewer */}
      <div className="rounded-2xl bg-[#0b1329]/90 border border-slate-800 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-violet-400" />
            <div>
              <h3 className="text-sm font-bold font-mono text-slate-100">
                Application Error Logs & Event Telemetry
              </h3>
              <p className="text-xs text-slate-400">
                {logsDataset?.name || 'checkout_application_logs.csv'} ({logRows.length} matching rows)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search error messages..."
                value={logFilterQuery}
                onChange={(e) => setLogFilterQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono w-48 sm:w-64"
              />
            </div>

            <select
              value={selectedStatusCode}
              onChange={(e) => setSelectedStatusCode(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-900 border border-slate-700 text-slate-200 font-mono"
            >
              <option value="ALL">Status: All</option>
              <option value="504">504 Gateway Timeout</option>
              <option value="500">500 Server Error</option>
              <option value="503">503 Unavailable</option>
              <option value="200">200 OK</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800/80 bg-slate-950/60">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/80 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Level</th>
                <th className="py-2.5 px-3">Service</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {logRows.slice(0, 15).map((log, i) => (
                <tr key={i} className="hover:bg-slate-900/40 transition">
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{log.timestamp}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        log.level === 'ERROR'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : log.level === 'WARN'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-cyan-400 whitespace-nowrap">{log.service}</td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`font-bold ${
                        String(log.status_code) === '504'
                          ? 'text-rose-400'
                          : String(log.status_code) === '200'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                      }`}
                    >
                      {log.status_code}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-sans max-w-lg truncate">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
