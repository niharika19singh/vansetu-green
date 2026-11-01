import React, { useEffect, useState } from 'react';
import {
  Trees,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Ruler,
  Zap,
  Droplets,
  Layers,
  Search,
  Filter,
  Info,
  RefreshCw,
  Building2,
  MapPin,
} from 'lucide-react';
import { api } from '../api/client';
import ErrorBoundary from './ui/ErrorBoundary';

const FEASIBILITY_BADGES = {
  FEASIBLE_ESTIMATE: {
    label: 'Feasible (Estimate)',
    color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    icon: CheckCircle2,
  },
  FIELD_VERIFICATION_REQUIRED: {
    label: 'Verification Required',
    color: 'bg-amber-950/80 text-amber-300 border-amber-800',
    icon: HelpCircle,
  },
  CONSTRAINT_IDENTIFIED: {
    label: 'Constraint Identified',
    color: 'bg-purple-950/80 text-purple-300 border-purple-800',
    icon: AlertTriangle,
  },
  NOT_FEASIBLE: {
    label: 'Not Feasible',
    color: 'bg-rose-950/80 text-rose-300 border-rose-800',
    icon: XCircle,
  },
};

function SegmentSuitabilityContent({ selectedCorridor }) {
  const corridorId = selectedCorridor?.code || selectedCorridor?.id || 'C-14';

  const [activeTab, setActiveTab] = useState('segments'); // 'segments' | 'species'
  const [segmentData, setSegmentData] = useState(null);
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState(0);
  const [speciesCatalog, setSpeciesCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters for species catalog
  const [widthFilter, setWidthFilter] = useState('');
  const [droughtFilter, setDroughtFilter] = useState('');

  const loadData = () => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      api.getSegmentSuitability(corridorId),
      api.getTreeSpeciesCatalog(),
    ])
      .then(([segRes, specRes]) => {
        if (!mounted) return;
        if (segRes.status === 'fulfilled' && segRes.value) {
          setSegmentData(segRes.value);
        } else {
          const reason = segRes.reason?.message || 'Failed to load segment feasibility';
          setError(reason);
        }

        if (specRes.status === 'fulfilled' && specRes.value) {
          setSpeciesCatalog(specRes.value.species || []);
        }

        setSelectedSegmentIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load segment suitability');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  };

  useEffect(() => {
    const cleanup = loadData();
    return cleanup;
  }, [corridorId]);

  const currentSegment = segmentData?.segments?.[selectedSegmentIndex] || null;

  // Filtered species with defensive checks
  const filteredSpecies = (speciesCatalog || []).filter((sp) => {
    if (!sp) return false;
    if (widthFilter && typeof sp.minimum_sidewalk_width_m === 'number' && sp.minimum_sidewalk_width_m > parseFloat(widthFilter)) {
      return false;
    }
    if (droughtFilter && (!sp.drought_tolerance || !sp.drought_tolerance.includes(droughtFilter))) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#071C16] overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-emerald-900/40 bg-[#0D2821]/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[#00f5d4]">
            <Trees className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">
                Right Tree, Right Place (Segment-Level Site Suitability)
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-[#071C16] text-[#00f5d4] border border-emerald-900/50">
                {corridorId}
              </span>
            </div>
            <p className="text-xs text-emerald-200/60">
              Micro-spatial segmentation (~100–250m) • 5 Archetypes • IRC:103 Sidewalk Compliance • NCT Delhi Species
            </p>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-[#071C16] border border-emerald-900/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('segments')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'segments'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Segment Feasibility ({segmentData?.segments?.length || segmentData?.total_segments || 0})
          </button>
          <button
            onClick={() => setActiveTab('species')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'species'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Delhi Native Species Catalog ({speciesCatalog.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="text-center py-24 space-y-3">
            <div className="inline-block p-4 rounded-2xl bg-[#0D2821] border border-emerald-900/40 animate-pulse text-[#00f5d4]">
              <Trees className="w-8 h-8 animate-spin" />
            </div>
            <p className="text-xs text-emerald-300 font-medium">
              Evaluating segment-level geometry, underground utilities, and species fit...
            </p>
            <p className="text-[11px] text-slate-500 font-mono">Corridor {corridorId}</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-200 text-xs space-y-3 max-w-xl mx-auto my-12">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Segment Evaluation Unavailable</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-800 text-white font-semibold flex items-center gap-2 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Evaluation</span>
            </button>
          </div>
        )}

        {/* Empty Data State */}
        {!loading && !error && activeTab === 'segments' && (!segmentData || !segmentData.segments || segmentData.segments.length === 0) && (
          <div className="text-center py-20 p-8 rounded-2xl bg-[#0D2821]/60 border border-emerald-900/40 max-w-md mx-auto space-y-3">
            <Info className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Segment Feasibility Records</h3>
            <p className="text-xs text-slate-400">
              Geospatial micro-segments for corridor {corridorId} have not been evaluated or coordinates are missing.
            </p>
            <button
              onClick={loadData}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
            >
              Re-run Segment Analysis
            </button>
          </div>
        )}

        {/* Tab 1: Segments Evaluation */}
        {!loading && !error && activeTab === 'segments' && segmentData && segmentData.segments && segmentData.segments.length > 0 && (
          <div className="space-y-4">
            {/* Horizontal Segment Selector */}
            <div className="bg-[#0D2821]/80 p-3 rounded-2xl border border-emerald-900/40 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Select Corridor Sub-Segment</span>
                <span className="font-mono text-[#00f5d4]">
                  Total Length: {segmentData.total_length_m || '—'}m across {segmentData.segments.length} segments
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {segmentData.segments.map((seg, idx) => {
                  const isSel = idx === selectedSegmentIndex;
                  const sidewalkText = seg?.site_geometry?.estimated_sidewalk_width_m != null
                    ? `${seg.site_geometry.estimated_sidewalk_width_m}m Walkway`
                    : 'Walkway Unmeasured';

                  return (
                    <button
                      key={seg.segment_id || `seg-${idx}`}
                      onClick={() => setSelectedSegmentIndex(idx)}
                      className={`px-3 py-2 rounded-xl border text-left shrink-0 transition ${
                        isSel
                          ? 'bg-emerald-950/80 border-[#00f5d4] text-white shadow-lg shadow-emerald-950/50'
                          : 'bg-[#071C16] border-emerald-900/40 text-slate-300 hover:bg-emerald-950/40'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs">{seg.segment_id}</div>
                      <div className="text-[10px] text-emerald-400/80">
                        {seg.length_m || '—'}m &bull; {sidewalkText}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Segment Deep Dive */}
            {currentSegment && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Physical Geometry & Constraints */}
                <div className="bg-[#0D2821]/80 border border-emerald-900/40 p-4 rounded-2xl space-y-4">
                  <div className="border-b border-emerald-900/30 pb-2">
                    <h3 className="font-bold text-white text-sm">
                      {currentSegment.segment_id} Site Geometry
                    </h3>
                    <p className="text-xs text-emerald-200/60">Physical field envelope &amp; clearances</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#071C16] border border-emerald-900/40">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                        Sidewalk Width
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment?.site_geometry?.estimated_sidewalk_width_m != null
                          ? `${currentSegment.site_geometry.estimated_sidewalk_width_m}m`
                          : 'Unmeasured (Field Survey Required)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#071C16] border border-emerald-900/40">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Overhead Wire Clearance
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment?.site_geometry?.overhead_clearance_m != null
                          ? `${currentSegment.site_geometry.overhead_clearance_m}m`
                          : 'Unmeasured (Requires Survey)'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#071C16] border border-emerald-900/40">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        Underground Utility Risk
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment?.site_geometry?.underground_utility_risk || 'Pending GPR Survey'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded-xl bg-[#071C16] border border-emerald-900/40">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-400" />
                        Waterlogging Risk
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment?.site_geometry?.waterlogging_risk || 'Unverified Drainage Study'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#071C16] border border-emerald-900/50 text-[11px] space-y-1">
                      <div className="font-bold text-emerald-300">Primary Recommendation:</div>
                      <div className="text-white font-medium text-xs">
                        {currentSegment.primary_recommendation || 'Linear Street Trees (Subject to GPR)'}
                      </div>
                      <div className="text-slate-400">
                        {currentSegment?.site_geometry?.estimated_sidewalk_width_m != null && currentSegment.site_geometry.estimated_sidewalk_width_m >= 1.8
                          ? 'Meets IRC:103 clear walkway threshold (>= 1.80m).'
                          : 'IRC:103 compliance verification required on site.'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: 5 Intervention Archetypes Evaluation */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">
                      5 Intervention Archetypes Feasibility Evaluation
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">Segment {currentSegment.segment_id}</span>
                  </div>

                  <div className="space-y-2.5">
                    {Object.entries(currentSegment.archetypes || currentSegment.archetypes_evaluation || {}).map(([key, arch]) => {
                      if (!arch) return null;
                      const badgeCfg = FEASIBILITY_BADGES[arch.feasibility_state] || FEASIBILITY_BADGES.FIELD_VERIFICATION_REQUIRED;
                      const Icon = badgeCfg.icon || HelpCircle;

                      return (
                        <div
                          key={key}
                          className="p-3.5 rounded-xl bg-[#0D2821]/80 border border-emerald-900/40 space-y-2 hover:border-emerald-600/50 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{arch.name || key}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-bold flex items-center gap-1 font-mono ${badgeCfg.color}`}
                            >
                              <Icon className="w-3 h-3" />
                              {badgeCfg.label}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300">{arch.constraint_details || 'Constraint assessment in progress.'}</p>

                          {arch.recommended_alternative && (
                            <div className="text-[11px] text-amber-400/90 bg-amber-950/30 p-2 rounded-lg border border-amber-900/40">
                              <span className="font-bold">Constraint-Driven Alternative: </span>
                              {arch.recommended_alternative}
                            </div>
                          )}

                          {arch.recommended_species && Array.isArray(arch.recommended_species) && arch.recommended_species.length > 0 && (
                            <div className="text-[11px] text-emerald-400/90 flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-slate-400">Recommended Native Species:</span>
                              <span>{arch.recommended_species.map(s => typeof s === 'string' ? s : s.name).join(', ')}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: NCT Delhi Species Catalog */}
        {!loading && !error && activeTab === 'species' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-[#0D2821]/80 p-3 rounded-2xl border border-emerald-900/40 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-[#00f5d4]" /> Filter Species:
                </span>
                <select
                  value={widthFilter}
                  onChange={(e) => setWidthFilter(e.target.value)}
                  className="bg-[#071C16] border border-emerald-800 text-slate-200 px-2.5 py-1 rounded-lg"
                >
                  <option value="">Any Sidewalk Width</option>
                  <option value="2.0">&le; 2.0m Sidewalk (Compact)</option>
                  <option value="2.5">&le; 2.5m Sidewalk (Standard)</option>
                  <option value="3.5">&le; 3.5m Sidewalk (Wide)</option>
                </select>

                <select
                  value={droughtFilter}
                  onChange={(e) => setDroughtFilter(e.target.value)}
                  className="bg-[#071C16] border border-emerald-800 text-slate-200 px-2.5 py-1 rounded-lg"
                >
                  <option value="">All Drought Tolerances</option>
                  <option value="VERY_HIGH">Very High Drought Tolerance</option>
                  <option value="HIGH">High Drought Tolerance</option>
                </select>
              </div>

              <div className="text-emerald-400/80 font-mono text-xs">
                Showing {filteredSpecies.length} of {speciesCatalog.length} native species
              </div>
            </div>

            {/* Species Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSpecies.map((sp) => (
                <div
                  key={sp.id || sp.botanical_name}
                  className="bg-[#0D2821]/80 border border-emerald-900/40 p-4 rounded-2xl space-y-2.5 hover:border-emerald-600/50 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{sp.common_name}</h4>
                        <div className="text-xs text-[#00f5d4] italic">{sp.botanical_name}</div>
                      </div>
                      <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded-lg bg-[#071C16] border border-emerald-900/40">
                        {sp.hindi_name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">{sp.growth_habit}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mt-2.5 bg-[#071C16] p-2 rounded-xl border border-emerald-900/40">
                      <div>
                        <span className="text-slate-500">Mature Height: </span>
                        <span className="font-bold text-slate-200">{sp.mature_height_m}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Canopy Spread: </span>
                        <span className="font-bold text-slate-200">{sp.canopy_spread_m}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Min Walkway: </span>
                        <span className="font-bold text-slate-200">{sp.minimum_sidewalk_width_m}m</span>
                      </div>
                      <div>
                        <span className="text-slate-500">PM2.5 Capture: </span>
                        <span className="font-bold text-[#00f5d4]">{sp.pm25_filtration_capacity}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 mt-2">
                      <span className="text-slate-500 font-semibold">Root Architecture: </span>
                      {sp.root_architecture}
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-400/80 bg-[#071C16] p-2 rounded-lg border border-emerald-900/40">
                    {sp.planting_guidelines}
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

export default function SegmentSuitabilityView(props) {
  return (
    <ErrorBoundary featureName="Right Tree, Right Place (Segment Suitability)">
      <SegmentSuitabilityContent {...props} />
    </ErrorBoundary>
  );
}
