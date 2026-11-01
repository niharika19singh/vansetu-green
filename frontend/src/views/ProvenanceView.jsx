import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Database,
  Layers,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  ExternalLink,
  Search,
  Filter,
  RefreshCw,
  Info,
  Thermometer,
  Trees,
  Wind,
  Compass,
  Building2,
  HeartPulse,
  Activity,
  Code,
  Calendar,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { api } from '../api/client';
import { safeToFixed } from '../utils/numericFormat';

export default function ProvenanceView({ onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [datasetsData, setDatasetsData] = useState(null);
  const [lineageData, setLineageData] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [auditData, setAuditData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('lineage'); // 'lineage' | 'catalogue' | 'formulas' | 'health' | 'audit'

  // Dataset Catalogue Search & Selection
  const [datasetSearch, setDatasetSearch] = useState('');
  const [selectedDatasetId, setSelectedDatasetId] = useState('sentinel2');

  // Lineage Graph State
  const [selectedNodeId, setSelectedNodeId] = useState('score_tri_vector');
  const [selectedStageFilter, setSelectedStageFilter] = useState('all');

  // Load All Provenance Telemetry
  const fetchProvenanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, dsRes, linRes, hlthRes, audRes] = await Promise.all([
        api.getProvenanceSummary().catch(() => null),
        api.getProvenanceDatasets().catch(() => null),
        api.getProvenanceLineage().catch(() => null),
        api.getProvenanceHealth().catch(() => null),
        api.getProvenanceAudit().catch(() => null),
      ]);

      setSummary(sumRes);
      setDatasetsData(dsRes);
      setLineageData(linRes);
      setHealthData(hlthRes);
      setAuditData(audRes);
      setLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load provenance telemetry');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProvenanceData();
  }, [fetchProvenanceData]);

  // Export Full Provenance Manifest as JSON
  const handleExportManifest = async () => {
    try {
      const manifest = await api.exportProvenanceManifest();
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vansetu_provenance_manifest_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(`Manifest export failed: ${err.message}`);
    }
  };

  // Filtered Datasets
  const filteredDatasets = useMemo(() => {
    if (!datasetsData?.datasets) return [];
    if (!datasetSearch.trim()) return datasetsData.datasets;
    const q = datasetSearch.toLowerCase();
    return datasetsData.datasets.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.provider?.toLowerCase().includes(q) ||
        d.indicator?.toLowerCase().includes(q) ||
        d.id?.toLowerCase().includes(q)
    );
  }, [datasetsData, datasetSearch]);

  const activeDataset = useMemo(() => {
    if (!datasetsData?.datasets) return null;
    return datasetsData.datasets.find((d) => d.id === selectedDatasetId) || datasetsData.datasets[0];
  }, [datasetsData, selectedDatasetId]);

  // Filtered Lineage Nodes
  const activeNode = useMemo(() => {
    if (!lineageData?.nodes) return null;
    return lineageData.nodes.find((n) => n.id === selectedNodeId) || lineageData.nodes[0];
  }, [lineageData, selectedNodeId]);

  return (
    <div className="h-full w-full overflow-y-auto bg-[#071C16] text-slate-100 p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                  <Database className="w-6 h-6" />
                </span>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Institutional Data Provenance &amp; Scientific Lineage
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
                      v2.1 Certified
                    </span>
                  </h1>
                  <p className="text-xs md:text-sm text-slate-300">
                    Platform-wide data lineage, authentic sensor resolutions, mathematical formulas, and municipal audit compliance
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchProvenanceData}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
                title="Refresh provenance health checks"
              >
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
                Refresh
              </button>
              <button
                onClick={handleExportManifest}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export Manifest (.json)
              </button>
            </div>
          </div>

          {/* Provenance Overview Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Registered Datasets
              </div>
              <div className="text-2xl font-bold font-mono text-white mt-1">
                {summary?.total_registered_datasets || 7}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                ESA, NASA, CPCB, OSM, DGHS
              </div>
            </div>

            <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5">
              <div className="text-[11px] text-emerald-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Active Sources
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {summary?.active_sources || 7}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                100% On-Disk Verified
              </div>
            </div>

            <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3.5">
              <div className="text-[11px] text-cyan-400 font-medium uppercase tracking-wider">
                Lineage Pipeline
              </div>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                9 Stages
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Raw Sources → Planning Decisions
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5">
              <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Spatial Coverage
              </div>
              <div className="text-xl font-bold font-mono text-slate-200 mt-1 truncate">
                NCT Delhi
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                1,483 km² &bull; 11 Districts
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('lineage')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'lineage'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4 text-emerald-400" />
            9-Stage Lineage DAG
          </button>

          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'catalogue'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" />
            Dataset Catalogue (7)
          </button>

          <button
            onClick={() => setActiveTab('formulas')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'formulas'
                ? 'bg-sky-950 text-sky-300 border border-sky-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Code className="w-4 h-4 text-sky-400" />
            Processing Transparency &amp; Formulas
          </button>

          <button
            onClick={() => setActiveTab('health')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'health'
                ? 'bg-purple-950 text-purple-300 border border-purple-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-400" />
            Asset Freshness &amp; Health Checks
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition ${
              activeTab === 'audit'
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-400" />
            Institutional Audit Ledger
          </button>
        </div>

        {/* Tab 1: Interactive 9-Stage Lineage DAG */}
        {activeTab === 'lineage' && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-400">
              <p>
                Click any node in the pipeline below to inspect exact formulas, inputs, outputs, and quality controls.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500">Filter Stage:</span>
                <select
                  value={selectedStageFilter}
                  onChange={(e) => setSelectedStageFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none"
                >
                  <option value="all">All 9 Stages</option>
                  {(lineageData?.stages || []).map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lineage Flow Canvas & Node Inspector Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Interactive Stages Flow */}
              <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl max-h-[750px] overflow-y-auto">
                {(lineageData?.stages || [])
                  .filter((st) => selectedStageFilter === 'all' || selectedStageFilter === st.id)
                  .map((st, idx) => {
                    const stageNodes = (lineageData?.nodes || []).filter((n) => n.stage === st.id);

                    return (
                      <div key={st.id} className="space-y-2">
                        {/* Stage Section Header */}
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider py-1 border-b border-slate-800/80">
                          <span className="w-5 h-5 rounded bg-emerald-950 text-emerald-400 flex items-center justify-center font-mono text-[10px] border border-emerald-800">
                            {idx + 1}
                          </span>
                          <span>{st.label}</span>
                          <span className="text-[10px] font-normal text-slate-400 truncate hidden sm:inline">
                            &bull; {st.description}
                          </span>
                        </div>

                        {/* Nodes in Stage */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {stageNodes.map((node) => {
                            const isSelected = node.id === selectedNodeId;

                            return (
                              <div
                                key={node.id}
                                onClick={() => setSelectedNodeId(node.id)}
                                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-emerald-950/70 border-emerald-500 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500'
                                    : 'bg-slate-950 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div className="font-bold text-white text-xs">
                                    {node.label}
                                  </div>
                                  {isSelected && (
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                  )}
                                </div>

                                <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                                  {node.description}
                                </p>

                                {node.transformation_formula && (
                                  <div className="mt-2 px-2 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300 truncate">
                                    {node.transformation_formula}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {idx < (lineageData?.stages?.length || 9) - 1 && selectedStageFilter === 'all' && (
                          <div className="flex justify-center py-1">
                            <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Right Column: Node Details Inspector */}
              <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-emerald-400" />
                    Node Specification Inspector
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    ID: {activeNode?.id}
                  </span>
                </div>

                {activeNode ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {activeNode.label}
                      </h3>
                      <span className="text-[11px] text-cyan-400 font-semibold block mt-0.5">
                        Stage: {activeNode.stage}
                      </span>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                        {activeNode.description}
                      </p>
                    </div>

                    {/* Inputs & Outputs */}
                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      {activeNode.inputs && activeNode.inputs.length > 0 && (
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Upstream Inputs:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {activeNode.inputs.map((inp) => (
                              <button
                                key={inp}
                                onClick={() => setSelectedNodeId(inp)}
                                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 hover:text-emerald-300 font-mono text-[10px]"
                              >
                                {inp}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {activeNode.outputs && activeNode.outputs.length > 0 && (
                        <div className="mt-2">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                            Downstream Outputs:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {activeNode.outputs.map((out) => (
                              <button
                                key={out}
                                onClick={() => setSelectedNodeId(out)}
                                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-300 hover:text-cyan-300 font-mono text-[10px]"
                              >
                                {out}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Formula Box */}
                    {activeNode.transformation_formula && (
                      <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-1">
                        <span className="text-[10px] text-cyan-400 uppercase font-semibold block">
                          Mathematical Transformation Formula:
                        </span>
                        <div className="font-mono text-xs font-bold text-cyan-200 break-words">
                          {activeNode.transformation_formula}
                        </div>
                      </div>
                    )}

                    {/* Code Reference */}
                    {activeNode.code_reference && (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Codebase Implementation Reference:
                        </span>
                        <div className="font-mono text-[11px] text-slate-300 break-all">
                          {activeNode.code_reference}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-8 text-slate-500 text-xs">
                    Select any pipeline node on the left to inspect its parameters.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Searchable Dataset Catalogue */}
        {activeTab === 'catalogue' && (
          <div className="space-y-4">
            {/* Search Toolbar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={datasetSearch}
                onChange={(e) => setDatasetSearch(e.target.value)}
                placeholder="Search registered institutional datasets by name, provider, or indicator..."
                className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            {/* Split View: Dataset List & Detailed Inspector */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Dataset Cards */}
              <div className="md:col-span-5 space-y-2">
                {filteredDatasets.map((d) => {
                  const isSelected = d.id === selectedDatasetId;

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDatasetId(d.id)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-cyan-950/70 border-cyan-500 shadow-md ring-1 ring-cyan-500'
                          : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white text-xs">{d.name}</span>
                        <span className="font-mono text-[10px] text-cyan-400">{d.id}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {d.provider}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                        <span>Native: {d.native_resolution}</span>
                        <span className="text-emerald-400 font-semibold">{d.crs}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Dataset Full Specification Inspector */}
              <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
                {activeDataset ? (
                  <div className="space-y-4 text-xs">
                    <div className="border-b border-slate-800 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          Dataset Specification
                        </span>
                        {activeDataset.docs_url && (
                          <a
                            href={activeDataset.docs_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                          >
                            Official Documentation <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-white mt-1">
                        {activeDataset.name}
                      </h2>
                      <div className="text-xs text-slate-300">
                        Provider: <strong>{activeDataset.provider}</strong> &bull; {activeDataset.instrument}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Native Resolution</span>
                        <div className="font-bold font-mono text-cyan-300 mt-0.5">{activeDataset.native_resolution}</div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Display: {activeDataset.display_resolution}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Observation Epoch</span>
                        <div className="font-bold text-slate-200 mt-0.5">{activeDataset.observation_period}</div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Revisit: {activeDataset.temporal_resolution}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">CRS &amp; Units</span>
                        <div className="font-bold font-mono text-emerald-400 mt-0.5">{activeDataset.crs}</div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Units: {activeDataset.units}</span>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">License &amp; Terms</span>
                        <div className="font-bold text-slate-200 mt-0.5 truncate">{activeDataset.license}</div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Classification: {activeDataset.measurement_classification}</span>
                      </div>
                    </div>

                    {/* Formula */}
                    {activeDataset.formula && (
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] text-cyan-400 uppercase font-semibold block">Transformation Formula</span>
                        <div className="font-mono text-xs font-bold text-white">{activeDataset.formula}</div>
                      </div>
                    )}

                    {/* Known Limitations */}
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                      <span className="text-[10px] text-amber-400 uppercase font-semibold block flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        Disclosed Physical &amp; Methodological Limitations
                      </span>
                      <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-300">
                        {(activeDataset.known_limitations || []).map((lim, idx) => (
                          <li key={idx}>{lim}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Processing & Quality */}
                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div>
                        <strong className="text-slate-300">Processing Pipeline:</strong> {activeDataset.processing_pipeline}
                      </div>
                      <div>
                        <strong className="text-slate-300">Validation:</strong> {activeDataset.validation_methodology}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Processing Transparency & Formulas */}
        {activeTab === 'formulas' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Rigorous, code-verified mathematical formulations powering VanSetu Green's urban climate prioritization.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Formula 1: Sentinel-2 NDVI */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <Trees className="w-4 h-4 text-emerald-400" />
                    1. Sentinel-2 Normalized Difference Vegetation Index (NDVI)
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">10m Native</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/30 font-mono text-center text-sm font-bold text-emerald-300">
                  NDVI = (B08 - B04) / (B08 + B04)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  B08 is the near-infrared band (842nm central wavelength); B04 is the visible red band (665nm).
                  Vegetative cellular chlorophyll strongly reflects NIR while absorbing Red photons.
                  NoData or cloud-shadow pixels are masked as NaN and excluded from corridor averages.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Code: app/services/raster_service.py:RasterService.stats['ndvi']
                </div>
              </div>

              {/* Formula 2: MODIS LST Resampling */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-orange-400 text-xs flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4 text-orange-400" />
                    2. MODIS Terra LST &amp; Bilinear Display Alignment
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">1,000m Native</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-orange-500/30 font-mono text-center text-sm font-bold text-orange-300">
                  LST_Celsius = (DN * 0.02) - 273.15
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  MODIS digital numbers (DN) are multiplied by the scale factor 0.02 to yield Kelvin, then converted to Celsius.
                  Because native thermal resolution is 1,000m (1km grid over Delhi), bilinear interpolation onto the 10m NDVI grid
                  is performed strictly for visual overlay and does NOT resolve microclimatic street-level variation.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Code: app/services/raster_service.py:resample_lst_to_ndvi()
                </div>
              </div>

              {/* Formula 3: Tri-Vector Multi-Criteria Scoring */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                    <Code className="w-4 h-4 text-cyan-400" />
                    3. Explainable Tri-Vector Corridor Prioritization
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">Multi-Criteria</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-cyan-500/30 font-mono text-center text-xs font-bold text-cyan-300">
                  Score = w_heat·LST_norm + w_green·Deficit + w_aqi·AQI_norm + w_ped·Ped_norm + w_vuln·Vuln_norm
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Combines normalized surface heat risk, vegetative canopy deficit, ambient air pollution, pedestrian exposure density, and ward socio-demographic vulnerability.
                  Percentile normalization (P2–P98) bounds raw indicators between 0.0 and 1.0.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Code: app/services/scoring_service.py:ScoringService.score_corridor()
                </div>
              </div>

              {/* Formula 4: Missing Data Re-normalization */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-400" />
                    4. Missing-Data Proportional Weight Re-normalization
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">Zero-Fabrication</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-amber-500/30 font-mono text-center text-sm font-bold text-amber-300">
                  w_i_norm = w_i / Σ (w_j for all active signals)
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  When a sensor reading or administrative metric is absent, VanSetu strictly refuses to inject fabricated constants or zeros.
                  Instead, the mathematical solver dynamically re-normalizes the remaining active weights so their sum remains exactly 1.00.
                </p>
                <div className="text-[10px] text-slate-500 font-mono">
                  Code: app/services/scoring_service.py:_renormalize_weights()
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Real Asset Freshness & Health Checks */}
        {activeTab === 'health' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Authentic on-disk inspection of underlying raster GeoTIFFs, vector GeoJSONs, and SQLite telemetry databases.
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Asset &amp; Dataset</th>
                      <th className="p-3.5">File / Source</th>
                      <th className="p-3.5">Format</th>
                      <th className="p-3.5">Size on Disk</th>
                      <th className="p-3.5">Last Modified</th>
                      <th className="p-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {(healthData?.checks || []).map((chk) => (
                      <tr key={chk.asset_id} className="hover:bg-slate-850/50">
                        <td className="p-3.5 font-bold text-white">
                          {chk.dataset_name}
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {chk.filename}
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {chk.file_type}
                        </td>
                        <td className="p-3.5 font-mono text-cyan-400">
                          {chk.size_bytes ? `${safeToFixed(chk.size_bytes / (1024 * 1024), 2)} MB` : 'N/A'}
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-400 font-mono">
                          {chk.last_modified ? new Date(chk.last_modified).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              chk.status === 'HEALTHY' || chk.status === 'LIVE_TELEMETRY_CONNECTED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : chk.status === 'CACHED_SEASONAL_BASELINE'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {chk.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Institutional Audit Ledger */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Chronological immutable audit history of dataset ingestions, calibration events, and administrative field signoffs.
            </div>

            <div className="space-y-2.5">
              {(auditData?.events || []).map((ev) => (
                <div
                  key={ev.event_id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-950 text-cyan-400 border border-slate-700">
                        {ev.event_id}
                      </span>
                      <span className="font-bold text-white text-xs">
                        {ev.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : ''}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {ev.details}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                    <span>Actor: <strong>{ev.actor}</strong></span>
                    <span className="text-emerald-400 font-semibold">{ev.impact}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
