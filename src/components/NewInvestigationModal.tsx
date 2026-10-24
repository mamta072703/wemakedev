import React, { useState } from 'react';
import Papa from 'papaparse';
import {
  UploadCloud,
  Database,
  FileSpreadsheet,
  X,
  Play,
  CheckCircle2,
  Sparkles,
  Layers,
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { DatasetFile, DatasetColumn } from '../types/incident';

interface NewInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchInvestigation: (incidentDescription: string, datasets: DatasetFile[]) => void;
  presets: {
    id: string;
    title: string;
    description: string;
    datasetCount: number;
    datasets: DatasetFile[];
    severity: string;
    recommendedHypotheses: string[];
  }[];
}

export const NewInvestigationModal: React.FC<NewInvestigationModalProps> = ({
  isOpen,
  onClose,
  onLaunchInvestigation,
  presets,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ecommerce-payment-fail');
  const [incidentDescription, setIncidentDescription] = useState<string>(
    presets[0]?.description ||
      'Storefront business alert: Executive on-call received an alert reporting completed online store orders dropped by over 80%. Need an evidence-driven investigation to determine ground truth.'
  );
  const [uploadedDatasets, setUploadedDatasets] = useState<DatasetFile[]>(presets[0]?.datasets || []);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setIncidentDescription(preset.description);
    setUploadedDatasets(preset.datasets);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingCsv(true);
    setParseError(null);

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setIsParsingCsv(false);
        if (results.errors.length > 0) {
          setParseError(`CSV parsing warning: ${results.errors[0]?.message || 'Invalid CSV syntax'}`);
        }

        const rows = results.data as Record<string, any>[];
        if (rows.length === 0) {
          setParseError('The uploaded CSV file contains no data rows.');
          return;
        }

        const keys = Object.keys(rows[0]);
        const columns: DatasetColumn[] = keys.map((key) => {
          const values = rows.map((r) => r[key]).filter((v) => v !== undefined && v !== null);
          const isNum = values.every((v) => !isNaN(Number(v)));
          const nums = isNum ? values.map(Number) : [];

          return {
            name: key,
            type: isNum ? 'number' : key.toLowerCase().includes('time') ? 'timestamp' : 'string',
            sampleValues: values.slice(0, 3),
            min: isNum && nums.length > 0 ? Math.min(...nums) : undefined,
            max: isNum && nums.length > 0 ? Math.max(...nums) : undefined,
          };
        });

        const newDataset: DatasetFile = {
          id: `ds-${Date.now().toString(36)}`,
          name: file.name,
          description: `User uploaded CSV: ${file.name} (${rows.length} rows, ${columns.length} columns)`,
          rowCount: rows.length,
          columns,
          rows,
          uploadedAt: new Date().toISOString(),
        };

        setUploadedDatasets((prev) => [newDataset, ...prev]);
        setActiveTab('custom');
      },
      error: (err) => {
        setIsParsingCsv(false);
        setParseError(`Error parsing CSV: ${err.message}`);
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedDatasets.length === 0) {
      setParseError('Please select or upload at least one CSV dataset.');
      return;
    }
    onLaunchInvestigation(incidentDescription, uploadedDatasets);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl my-8 rounded-2xl bg-[#0b1329] border border-cyan-800/80 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-600/50 flex items-center justify-center">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold font-mono text-slate-100">
                New Operational Incident Investigation
              </h2>
              <p className="text-xs text-slate-400">
                Load reproducible benchmark telemetry datasets or upload custom metrics CSV files
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

        {/* Tab Switcher: Presets vs Custom Upload */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'presets'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reproducible Benchmark Incidents (3 Presets)</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload Custom CSV Telemetry</span>
          </button>
        </div>

        {/* Tab Content: Presets */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Select Incident Profile:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {presets.map((p) => {
                const isSelected = selectedPresetId === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition select-none flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                          {p.severity}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">
                          {p.datasetCount} datasets
                        </span>
                      </div>
                      <h4 className="text-xs font-bold font-mono text-slate-100 line-clamp-1">
                        {p.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 line-clamp-3 font-sans">
                        {p.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                      {isSelected ? (
                        <span className="text-cyan-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Selected Dataset
                        </span>
                      ) : (
                        <span>Click to load</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Content: Custom CSV Upload */}
        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center bg-slate-900/40 transition">
              <UploadCloud className="w-8 h-8 mx-auto text-cyan-400 mb-2" />
              <p className="text-xs font-mono text-slate-200 font-semibold">
                Drop CSV telemetry files or click to browse
              </p>
              <p className="text-[11px] text-slate-400 mt-1 font-sans">
                Supports timestamps, request counts, response times, status codes, and error logs
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-3 text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
              />
            </div>

            {isParsingCsv && (
              <p className="text-xs text-cyan-400 font-mono">Parsing CSV with Papa Parse...</p>
            )}
          </div>
        )}

        {parseError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{parseError}</span>
          </div>
        )}

        {/* Selected Datasets Preview */}
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Active Datasets for Investigation ({uploadedDatasets.length}):
          </span>
          <div className="space-y-2 max-h-36 overflow-y-auto">
            {uploadedDatasets.map((ds) => (
              <div
                key={ds.id}
                className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-bold">{ds.name}</span>
                  <span className="text-slate-400 text-[11px]">({ds.rowCount} rows)</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                  <span>{ds.columns.length} columns</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident Description Input */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Incident Problem Statement / Operational Alert:
            </label>
            <textarea
              rows={3}
              value={incidentDescription}
              onChange={(e) => setIncidentDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 font-sans text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-slate-950 font-bold text-xs font-mono shadow-lg shadow-cyan-950/60 transition flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Launch Evidence-Driven Investigation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
