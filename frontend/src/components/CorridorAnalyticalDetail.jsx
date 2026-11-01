import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Calculator,
  CheckCircle2,
  ShieldAlert,
  TrendingUp,
  Layers,
  Footprints,
  Info,
  ThumbsUp,
  MessageSquare,
  Box,
  Send,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import Corridor3DViewer from './Corridor3DViewer';
import {
  FeasibilityStatusBadge,
  ThermalSeparationCard,
  deriveCorridorFeasibilityStatus,
  FEASIBILITY_STATUS_META,
} from './ui/ScientificBadges';
import {
  safeToFixed,
  formatScore,
  formatPercentage,
  formatDistanceKm,
} from '../utils/numericFormat';

const INDICATOR_LABELS = {
  heat: 'Heat Exposure (Surface LST)',
  green_deficit: 'Vegetation Deficit (1-NDVI)',
  pollution: 'Air Quality Stress (AQI)',
  pedestrian: 'Pedestrian Exposure Proxy',
  health_risk: 'Compound Health Risk',
  vulnerable_pop: 'Socio-Spatial Vulnerability',
};

const INDICATOR_COLORS = {
  heat: '#f97316',
  green_deficit: '#10b981',
  pollution: '#eab308',
  pedestrian: '#38bdf8',
  health_risk: '#f43f5e',
  vulnerable_pop: '#a855f7',
};

function CorridorAnalyticalDetail({
  corridor,
  sensitivityRow,
  activeScenario,
  mekoEnabled = true,
  onOpenPassport,
}) {
  const calc = corridor?.calculation_breakdown || {};
  const normInputs = calc.normalized_inputs || {};
  const activeWeights = calc.active_weights || {};
  const configWeights = calc.configured_weights || {};
  const contributions = calc.weighted_contributions || {};
  const confBreakdown = calc.confidence_breakdown || {};
  const feasBreakdown = calc.feasibility_breakdown || {};
  const completeness = corridor?.data_completeness || {};

  // Memoize Recharts data for 6-factor weighted contribution breakdown
  const factorChartData = useMemo(() => {
    if (!corridor) return [];
    return Object.keys(INDICATOR_LABELS).map((key) => ({
      key,
      name: INDICATOR_LABELS[key].split(' (')[0],
      fullLabel: INDICATOR_LABELS[key],
      normalized: normInputs[key] !== null && normInputs[key] !== undefined ? normInputs[key] : 0,
      activeWeight: activeWeights[key] || 0,
      contribution:
        contributions[key] !== null && contributions[key] !== undefined ? contributions[key] : 0,
      isMissing: normInputs[key] === null || normInputs[key] === undefined,
      color: INDICATOR_COLORS[key],
    }));
  }, [corridor, normInputs, activeWeights, contributions]);

  // Memoize Recharts data for 5-scenario sensitivity comparison
  const scenarioChartData = useMemo(() => {
    const scenarioComp = sensitivityRow?.scenario_comparison || {};
    return [
      { id: 'baseline', label: 'Baseline' },
      { id: 'heat_resilience', label: 'Heat Res.' },
      { id: 'air_quality', label: 'Air Qual.' },
      { id: 'pedestrian_equity', label: 'Ped. Equity' },
      { id: 'extreme_vulnerability', label: 'Ext. Vuln.' },
    ].map((sc) => {
      const entry = scenarioComp[sc.id] || {};
      return {
        id: sc.id,
        name: sc.label,
        score: entry.score || 0,
        rank: entry.rank || '-',
        delta: entry.rank_shift_vs_baseline || 0,
        isCurrent: sc.id === activeScenario,
      };
    });
  }, [sensitivityRow, activeScenario]);

  if (!corridor) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Select an urban corridor on the map or ranking list to inspect its Tri-Vector evidence breakdown, thermal disambiguation, and sensitivity profile.
      </div>
    );
  }

  const stability = sensitivityRow?.stability_metrics || {};
  const feasibilityStatus = deriveCorridorFeasibilityStatus(corridor, mekoEnabled);
  const feasibilityMeta =
    FEASIBILITY_STATUS_META[feasibilityStatus] ||
    FEASIBILITY_STATUS_META.FIELD_VERIFICATION_REQUIRED;

  // Legacy Parity: Community Upvoting & Suggestions State
  const [upvotes, setUpvotes] = useState(0);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [isUpvoting, setIsUpvoting] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newSuggestionText, setNewSuggestionText] = useState('');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  // Legacy Parity: 3D Physical Cross-Section Viewer
  const [show3DViewer, setShow3DViewer] = useState(false);

  useEffect(() => {
    if (!corridor) return;
    const cid = corridor.code || corridor.id;
    api
      .getCorridorUpvotes(cid)
      .then((res) => {
        setUpvotes(res.upvotes || 0);
      })
      .catch(() => {});

    api
      .getCorridorSuggestions(cid)
      .then((res) => {
        setSuggestions(res.suggestions || []);
      })
      .catch(() => {});
  }, [corridor]);

  const handleUpvote = useCallback(async () => {
    if (!corridor || isUpvoting || hasUpvoted) return;
    setIsUpvoting(true);
    const cid = corridor.code || corridor.id;
    try {
      const res = await api.upvoteCorridor(cid);
      setUpvotes(res.upvotes || upvotes + 1);
      setHasUpvoted(true);
    } catch (err) {
      console.error('Upvote failed:', err);
    } finally {
      setIsUpvoting(false);
    }
  }, [corridor, isUpvoting, hasUpvoted, upvotes]);

  const handleSubmitSuggestion = useCallback(async (e) => {
    e.preventDefault();
    if (!corridor || !newSuggestionText.trim() || submittingSuggestion) return;
    setSubmittingSuggestion(true);
    const cid = corridor.code || corridor.id;
    try {
      const res = await api.addCorridorSuggestion(cid, newSuggestionText.trim());
      setSuggestions((prev) => [
        {
          id: res.id,
          text: newSuggestionText.trim(),
          upvotes: 0,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewSuggestionText('');
    } catch (err) {
      console.error('Submit suggestion failed:', err);
    } finally {
      setSubmittingSuggestion(false);
    }
  }, [corridor, newSuggestionText, submittingSuggestion]);

  return (
    <div className="space-y-4 text-xs">
      {/* Evidence Passport Action Banner */}
      <div className="bg-emerald-950/30 border border-emerald-800/60 p-2.5 rounded-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white text-[11px]">Corridor Evidence Passport (v2.0)</div>
            <div className="text-[10px] text-slate-400">Verified satellite, sensor gaps &amp; 5 quality dimensions</div>
          </div>
        </div>
        <button
          onClick={() => onOpenPassport && onOpenPassport(corridor.code || corridor.id)}
          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition shadow"
        >
          View Passport
        </button>
      </div>

      {/* Community Participation & 3D Cross-Section Action Row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleUpvote}
          disabled={hasUpvoted || isUpvoting}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition border ${
            hasUpvoted
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="Upvote this corridor to demonstrate citizen greening demand"
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'text-emerald-400 fill-emerald-400' : 'text-slate-400'}`} />
          <span>{hasUpvoted ? 'Upvoted' : 'Upvote Corridor'} ({upvotes})</span>
        </button>

        <button
          type="button"
          onClick={() => setShow3DViewer(!show3DViewer)}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition border ${
            show3DViewer
              ? 'bg-emerald-600 border-emerald-400 text-white shadow'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="Toggle interactive 3D physical cross-section preview"
        >
          <Box className="w-3.5 h-3.5 text-emerald-400" />
          <span>3D Cross-Section</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSuggestions(!showSuggestions)}
          className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition border ${
            showSuggestions
              ? 'bg-emerald-600 border-emerald-400 text-white shadow'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="View and submit citizen suggestions for this corridor"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>Suggestions ({suggestions.length})</span>
        </button>
      </div>

      {/* 3D Corridor Cross-Section Viewer Panel */}
      {show3DViewer && (
        <div className="space-y-1.5">
          <Corridor3DViewer corridor={corridor} height="280px" />
        </div>
      )}

      {/* Community Suggestions Section */}
      {showSuggestions && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Community Citizen Suggestions
            </span>
            <span className="text-[10px] text-slate-400">Rate limit: 3/hr per corridor</span>
          </div>

          <form onSubmit={handleSubmitSuggestion} className="space-y-2">
            <div className="relative">
              <textarea
                value={newSuggestionText}
                onChange={(e) => setNewSuggestionText(e.target.value)}
                maxLength={300}
                placeholder="Suggest a specific greening, shade pergola, or water point intervention for this corridor..."
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 resize-none"
              />
              <span className="absolute bottom-1.5 right-2 text-[9px] text-slate-400">
                {newSuggestionText.length}/300
              </span>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newSuggestionText.trim() || submittingSuggestion}
                className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1 transition"
              >
                {submittingSuggestion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                Submit Suggestion
              </button>
            </div>
          </form>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {suggestions.length === 0 ? (
              <div className="text-center py-3 text-slate-400 text-xs">
                No citizen suggestions submitted yet. Be the first to propose an intervention!
              </div>
            ) : (
              suggestions.map((s) => (
                <div key={s.id} className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg space-y-1">
                  <div className="text-slate-200 text-xs">{s.text}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    <span className="text-emerald-400 font-semibold">👍 {s.upvotes || 0} votes</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {/* Section 6C & 6D: Tri-Vector Evidence Cards (Never Collapsed Into One Score) */}
      <div
        className="space-y-2"
        role="region"
        aria-label="Tri-Vector Decision Assessment: Priority Need, Implementation Feasibility, and Evidence Confidence"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">
            Tri-Vector Decision Framework (Separated Dimensions)
          </span>
          <FeasibilityStatusBadge status={feasibilityStatus} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Vector 1: Priority Need */}
          <div className="bg-slate-950/90 border border-emerald-500/30 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              1. Priority Need
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              {formatScore(corridor.priority_score, 4)}
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              Rank #{corridor.rank ?? '—'} ({corridor.severity || 'Unranked'})
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              6-indicator multi-hazard index
            </div>
          </div>

          {/* Vector 2: Implementation Feasibility */}
          <div className="bg-slate-950/90 border border-sky-500/30 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              2. Site Feasibility
            </div>
            <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
              {formatPercentage(corridor.feasibility_score, 0)}
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              Est. ROW ~{feasBreakdown.estimated_row_width_m || 18}m ({corridor.highway || 'local'})
            </div>
            <div className="text-[10px] text-amber-300/90 mt-0.5">
              OSM proxy — civil survey pending
            </div>
          </div>

          {/* Vector 3: Evidence Confidence */}
          <div className="bg-slate-950/90 border border-amber-500/30 rounded-lg p-2.5">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">
              3. Evidence Confidence
            </div>
            <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
              {formatPercentage(corridor.confidence_score, 0)}
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              {completeness.active_signal_count || 6}/{completeness.total_signal_count || 6} Signals Active
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {corridor.aqi_is_live ? 'Live AQI + Historical Raster' : 'Historical Reference Mode'}
            </div>
          </div>
        </div>

        {/* Explicit Engineering Feasibility & Uncertainty Notice (Section 6D) */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-[11px] flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-slate-300 leading-relaxed">
            <strong className="text-sky-300">{feasibilityMeta.humanLabel}: </strong>
            {feasibilityMeta.description} Estimated road width (~{feasBreakdown.estimated_row_width_m || 18}m) is derived from OpenStreetMap highway tag (<code className="text-slate-200">{corridor.highway}</code>) and must not be treated as a completed engineering survey.
          </div>
        </div>
      </div>

      {/* Section 6A: Research-Backed Thermal & Human Heat Stress Disambiguation Card */}
      <ThermalSeparationCard corridor={corridor} />

      {/* Section 6B & Section 8: Native vs Display Resolution & Pedestrian Connectivity Card */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            Raster Provenance (Native vs. Display Grid) &amp; Pedestrian Continuity
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
            CRS: EPSG:4326
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">MODIS LST (1,000m Native)</span>
              <span className="text-[9px] font-mono px-1 rounded bg-orange-500/15 text-orange-300">
                MEASURED
              </span>
            </div>
            <div className="font-mono font-bold text-orange-400 text-sm">
              {corridor.lst_native_mean}°C
            </div>
            <div className="text-[10px] text-slate-500">
              Un-interpolated 57×79 native thermal cell (Mar–Jun 2024)
            </div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">MODIS LST (10m Display Grid)</span>
              <span className="text-[9px] font-mono px-1 rounded bg-amber-500/15 text-amber-300">
                RESAMPLED
              </span>
            </div>
            <div className="font-mono font-bold text-amber-300 text-sm">
              {corridor.lst_mean}°C (Max {corridor.lst_max}°C)
            </div>
            <div className="text-[10px] text-slate-500">
              Bilinearly aligned to 10m grid for visual co-registration
            </div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Sentinel-2 NDVI (10m Native)</span>
              <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/15 text-emerald-300">
                MEASURED
              </span>
            </div>
            <div className="font-mono font-bold text-emerald-400 text-sm">
              {corridor.ndvi_mean} (Deficit: {corridor.green_deficit})
            </div>
            <div className="text-[10px] text-slate-500">
              5572×7794 native surface reflectance (B08/B04)
            </div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                CPCB Station AQI ({corridor.aqi_distance_km} km)
              </span>
              <span className="text-[9px] font-mono px-1 rounded bg-sky-500/15 text-sky-300">
                {corridor.aqi_is_live ? 'LIVE API' : 'STATION REF'}
              </span>
            </div>
            <div className="font-mono font-bold text-yellow-400 text-sm">
              AQI {corridor.aqi} (PM2.5: {corridor.pm25})
            </div>
            <div className="text-[10px] text-slate-500 truncate" title={corridor.aqi_station}>
              {corridor.aqi_station}
            </div>
          </div>
        </div>

        {/* Pedestrian Corridor Continuity & Exposure Proxy Summary (Section 8) */}
        <div className="bg-slate-900/70 border border-slate-800 rounded p-2 text-[11px] flex items-start gap-2">
          <Footprints className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-slate-300">
            <strong className="text-sky-300">Pedestrian Corridor Continuity: </strong>
            Span <span className="font-mono text-white">{formatDistanceKm(corridor.length_km)}</span> along <span className="font-mono uppercase text-slate-200">{corridor.highway || 'local'}</span> right-of-way in {corridor.district || 'Delhi'} ({corridor.ward_id || '—'}). Canopy gap ratio <span className="font-mono text-emerald-300">{formatPercentage(corridor.green_deficit, 1)}</span> indicates priority for continuous shaded pedestrian walkability.
          </div>
        </div>
      </div>

      {/* Explainable Formula Trace & Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            Explainable Scoring Inputs &amp; Formula Trace
          </span>
          <span className="text-[10px] text-slate-400">
            Missing Data Policy: Dynamic Weight Re-Normalization
          </span>
        </div>

        {/* Formula Expression Box */}
        <div className="bg-slate-900 border border-slate-800 rounded p-2 font-mono text-[10px] text-emerald-300 break-words leading-relaxed">
          {calc.formula_trace}
        </div>

        {/* Recharts Bar Chart of Weighted Contributions */}
        <div className="h-36 w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={factorChartData}
              layout="vertical"
              margin={{ top: 2, right: 16, left: 4, bottom: 2 }}
            >
              <XAxis type="number" domain={[0, 0.35]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                tick={{ fill: '#cbd5e1', fontSize: 10 }}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  fontSize: '11px',
                  color: '#f1f5f9',
                }}
                formatter={(val, _name, props) => [
                  `${safeToFixed(val, 4)} (Norm: ${safeToFixed(
                    props?.payload?.normalized,
                    3
                  )} × Weight: ${safeToFixed(props?.payload?.activeWeight, 2)})`,
                  props?.payload?.fullLabel || '',
                ]}
              />
              <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
                {factorChartData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Calculation Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                <th className="py-1">Indicator</th>
                <th className="py-1 text-right">Norm [0,1]</th>
                <th className="py-1 text-right">Config W</th>
                <th className="py-1 text-right">Active W</th>
                <th className="py-1 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {Object.keys(INDICATOR_LABELS).map((k) => {
                const nVal = normInputs[k];
                const cW = configWeights[k];
                const aW = activeWeights[k];
                const contrib = contributions[k];
                return (
                  <tr key={k}>
                    <td className="py-1 font-sans text-slate-300">{INDICATOR_LABELS[k]}</td>
                    <td className="py-1 text-right text-slate-200">
                      {safeToFixed(nVal, 3, 'MISSING')}
                    </td>
                    <td className="py-1 text-right text-slate-400">
                      {safeToFixed(cW, 2, '-')}
                    </td>
                    <td className="py-1 text-right text-emerald-400">
                      {safeToFixed(aW, 3, '-')}
                    </td>
                    <td className="py-1 text-right font-bold text-slate-100">
                      {safeToFixed(contrib, 4, 'Excl.')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5-Scenario Comparative Ranking & Stability Analysis */}
      {sensitivityRow && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              5-Scenario Sensitivity &amp; Ranking Stability
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono text-[10px]">
              Stability S = {safeToFixed(stability.stability_index, 3)} ({stability.stability_class || 'N/A'})
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Across all 5 policy scenarios, this corridor ranks between{' '}
            <span className="text-slate-200 font-semibold">#{stability.min_rank ?? '—'}</span> and{' '}
            <span className="text-slate-200 font-semibold">#{stability.max_rank ?? '—'}</span> (Rank
            range: {stability.rank_range ?? '—'}, StdDev: ±{stability.rank_std ?? '—'}).
          </p>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={scenarioChartData}
                margin={{ top: 4, right: 8, left: -18, bottom: 2 }}
              >
                <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                <YAxis domain={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    fontSize: '11px',
                  }}
                  formatter={(val, _n, props) => [
                    `Score: ${safeToFixed(val, 4)} | Rank: #${props?.payload?.rank ?? '—'}`,
                    props?.payload?.name || '',
                  ]}
                />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {scenarioChartData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.isCurrent ? '#10b981' : '#38bdf8'}
                      fillOpacity={entry.isCurrent ? 1.0 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-5 gap-1 text-center">
            {scenarioChartData.map((sc) => (
              <div
                key={sc.id}
                className={`p-1.5 rounded border ${
                  sc.isCurrent
                    ? 'bg-emerald-950/50 border-emerald-500/50'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="text-[10px] text-slate-400 truncate">{sc.name}</div>
                <div className="font-mono font-bold text-slate-100">#{sc.rank ?? '—'}</div>
                <div className="font-mono text-[10px] text-emerald-400">
                  {safeToFixed(sc.score, 3)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidence Confidence Penalty Ledger */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            Evidence Confidence Deduction Ledger
          </span>
          <span className="font-mono text-amber-400 font-bold">
            1.00 {confBreakdown.total_deduction || '- 0.00'} = {safeToFixed(corridor.confidence_score, 2)}
          </span>
        </div>
        <div className="space-y-1.5">
          {(confBreakdown.penalties || []).map((pen, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-2 bg-slate-900/80 p-2 rounded border border-slate-800/80 text-[11px]"
            >
              <span className="text-slate-300">{pen.detail}</span>
              <span className="font-mono font-bold text-amber-400 shrink-0">
                {safeToFixed(pen.deduction, 2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default React.memo(CorridorAnalyticalDetail);
