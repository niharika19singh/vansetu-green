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
} from 'lucide-react';
import { api } from '../api/client';

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

export default function SegmentSuitabilityView({ selectedCorridor }) {
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

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getSegmentSuitability(corridorId),
      api.getTreeSpeciesCatalog(),
    ])
      .then(([segRes, specRes]) => {
        if (!mounted) return;
        setSegmentData(segRes);
        setSpeciesCatalog(specRes.species || []);
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
  }, [corridorId]);

  const currentSegment = segmentData?.segments?.[selectedSegmentIndex];

  // Filtered species
  const filteredSpecies = speciesCatalog.filter((sp) => {
    if (widthFilter && sp.minimum_sidewalk_width_m > parseFloat(widthFilter)) return false;
    if (droughtFilter && !sp.drought_tolerance.includes(droughtFilter)) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Trees className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">
                Right Tree, Right Place (Segment-Level Site Suitability)
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-emerald-300">
                {corridorId}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Micro-spatial segmentation (~100–250m) &bull; 5 Archetypes &bull; IRC:103 Sidewalk Compliance &bull; NCT Delhi Species
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('segments')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'segments'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Segment Feasibility ({segmentData?.total_segments || 0})
          </button>
          <button
            onClick={() => setActiveTab('species')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === 'species'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Delhi Native Species Catalog ({speciesCatalog.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Evaluating segment-level geometry, underground utilities, and species fit...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tab 1: Segments Evaluation */}
        {!loading && !error && activeTab === 'segments' && segmentData && (
          <div className="space-y-4">
            {/* Horizontal Segment Selector */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Select Corridor Sub-Segment</span>
                <span className="font-mono text-emerald-400">
                  Total Length: {segmentData.total_length_m}m across {segmentData.total_segments} segments
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {segmentData.segments.map((seg, idx) => {
                  const isSel = idx === selectedSegmentIndex;
                  return (
                    <button
                      key={seg.segment_id}
                      onClick={() => setSelectedSegmentIndex(idx)}
                      className={`px-3 py-2 rounded-lg border text-left shrink-0 transition ${
                        isSel
                          ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-mono font-bold text-xs">{seg.segment_id}</div>
                      <div className="text-[10px] text-slate-400">
                        {seg.length_m}m &bull; {seg.site_geometry.estimated_sidewalk_width_m}m Walkway
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
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
                  <div className="border-b border-slate-800 pb-2">
                    <h3 className="font-bold text-white text-sm">
                      {currentSegment.segment_id} Site Geometry
                    </h3>
                    <p className="text-xs text-slate-400">Physical field envelope &amp; clearances</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5 text-emerald-400" />
                        Sidewalk Width
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment.site_geometry.estimated_sidewalk_width_m}m
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Overhead Wire Clearance
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment.site_geometry.overhead_clearance_m}m
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-purple-400" />
                        Underground Utility Risk
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment.site_geometry.underground_utility_risk}
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-sky-400" />
                        Waterlogging Risk
                      </span>
                      <span className="font-mono font-bold text-white">
                        {currentSegment.site_geometry.waterlogging_risk}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/60 text-[11px] space-y-1">
                      <div className="font-bold text-emerald-300">Primary Recommendation:</div>
                      <div className="text-white font-medium text-xs">
                        {currentSegment.primary_recommendation}
                      </div>
                      <div className="text-slate-400">
                        Meets IRC:103 clear walkway threshold ({'>='} 1.80m).
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
                    <span className="text-xs text-slate-400">Segment {currentSegment.segment_id}</span>
                  </div>

                  <div className="space-y-2.5">
                    {Object.entries(currentSegment.archetypes).map(([key, arch]) => {
                      const badgeCfg = FEASIBILITY_BADGES[arch.feasibility_state] || FEASIBILITY_BADGES.FEASIBLE_ESTIMATE;
                      const Icon = badgeCfg.icon;

                      return (
                        <div
                          key={key}
                          className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 hover:border-slate-700 transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{arch.name}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded border font-bold flex items-center gap-1 font-mono ${badgeCfg.color}`}
                            >
                              <Icon className="w-3 h-3" />
                              {badgeCfg.label}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-300">{arch.constraint_details}</p>

                          {arch.recommended_alternative && (
                            <div className="text-[11px] text-amber-400/90 bg-amber-950/30 p-2 rounded border border-amber-900/40">
                              <span className="font-bold">Constraint-Driven Alternative: </span>
                              {arch.recommended_alternative}
                            </div>
                          )}

                          {arch.recommended_species && arch.recommended_species.length > 0 && (
                            <div className="text-[11px] text-emerald-400/90 flex items-center gap-1.5">
                              <span className="font-bold text-slate-400">Recommended Native Species:</span>
                              {arch.recommended_species.join(', ')}
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
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-bold text-white flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-emerald-400" /> Filter Species:
                </span>
                <select
                  value={widthFilter}
                  onChange={(e) => setWidthFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1 rounded"
                >
                  <option value="">Any Sidewalk Width</option>
                  <option value="2.0">&le; 2.0m Sidewalk (Compact)</option>
                  <option value="2.5">&le; 2.5m Sidewalk (Standard)</option>
                  <option value="3.5">&le; 3.5m Sidewalk (Wide)</option>
                </select>

                <select
                  value={droughtFilter}
                  onChange={(e) => setDroughtFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 text-slate-200 px-2.5 py-1 rounded"
                >
                  <option value="">All Drought Tolerances</option>
                  <option value="VERY_HIGH">Very High Drought Tolerance</option>
                  <option value="HIGH">High Drought Tolerance</option>
                </select>
              </div>

              <div className="text-slate-400">
                Showing {filteredSpecies.length} of {speciesCatalog.length} native species
              </div>
            </div>

            {/* Species Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredSpecies.map((sp) => (
                <div
                  key={sp.id}
                  className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2.5 hover:border-emerald-600/50 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">{sp.common_name}</h4>
                        <div className="text-xs text-emerald-400 italic">{sp.botanical_name}</div>
                      </div>
                      <span className="text-xs font-bold text-slate-300 px-2 py-0.5 rounded bg-slate-800">
                        {sp.hindi_name}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">{sp.growth_habit}</p>

                    <div className="grid grid-cols-2 gap-2 text-[11px] mt-2.5 bg-slate-950/80 p-2 rounded border border-slate-800">
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
                        <span className="font-bold text-emerald-400">{sp.pm25_filtration_capacity}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-300 mt-2">
                      <span className="text-slate-500 font-semibold">Root Architecture: </span>
                      {sp.root_architecture}
                    </div>
                  </div>

                  <div className="text-[10px] text-emerald-400/80 bg-emerald-950/20 p-2 rounded border border-emerald-900/40">
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
