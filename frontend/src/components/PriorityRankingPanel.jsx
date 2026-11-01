import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Search,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  RotateCcw,
  Thermometer,
  Trees,
  Wind,
  ShieldCheck,
  ArrowUpDown,
  Info,
} from 'lucide-react';
import {
  FeasibilityStatusBadge,
  deriveCorridorFeasibilityStatus,
} from './ui/ScientificBadges';
import {
  safeToFixed,
  formatScore,
  formatTemperature,
  formatNDVI,
  formatPercentage,
  formatDistanceKm,
} from '../utils/numericFormat';

const SCENARIO_LIST = [
  { id: 'baseline', label: 'Baseline', badge: 'Balanced 6-Factor' },
  { id: 'heat_resilience', label: 'Heat-Resilience', badge: '40% LST / 25% NDVI' },
  { id: 'air_quality', label: 'Air-Quality', badge: '40% AQI / 20% NDVI' },
  { id: 'pedestrian_equity', label: 'Pedestrian-Equity', badge: '30% Footfall / 20% Vuln' },
  { id: 'extreme_vulnerability', label: 'Extreme-Vulnerability', badge: '25% Vuln / 25% Health' },
];

export default function PriorityRankingPanel({
  corridors = [],
  districts = [],
  selectedDistrict = 'All Districts',
  onSelectDistrict = () => {},
  activeScenario = 'baseline',
  onSelectScenario = () => {},
  whatIfHeatWeight,
  onChangeWhatIfHeatWeight = () => {},
  selectedCorridor,
  onSelectCorridor = () => {},
  mekoEnabled = true,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'heat' | 'ndvi_deficit' | 'feasibility' | 'district' | 'length'
  const [sortAsc, setSortAsc] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const filteredAndSortedCorridors = useMemo(() => {
    const list = (corridors || []).filter((c) => {
      if (!c) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q)) ||
        (c.highway && c.highway.toLowerCase().includes(q)) ||
        (c.recommended_intervention && c.recommended_intervention.toLowerCase().includes(q))
      );
    });

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      switch (sortBy) {
        case 'heat':
          valA = a.lst_mean || 0;
          valB = b.lst_mean || 0;
          break;
        case 'ndvi_deficit':
          valA = 1.0 - (a.ndvi_mean || 0);
          valB = 1.0 - (b.ndvi_mean || 0);
          break;
        case 'feasibility':
          valA = a.feasibility_status === 'High Feasibility' ? 2 : 1;
          valB = b.feasibility_status === 'High Feasibility' ? 2 : 1;
          break;
        case 'district':
          return sortAsc
            ? (a.district || '').localeCompare(b.district || '')
            : (b.district || '').localeCompare(a.district || '');
        case 'length':
          valA = a.length_km || 0;
          valB = b.length_km || 0;
          break;
        case 'score':
        default:
          valA = a.priority_score ?? a.score ?? 0;
          valB = b.priority_score ?? b.score ?? 0;
          break;
      }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [corridors, searchQuery, sortBy, sortAsc]);

  return (
    <div className="flex flex-col h-full bg-slate-900/95 border-r border-slate-800 select-none">
      {/* Panel Header & Filters */}
      <div className="p-3.5 border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Corridor Prioritization Engine
            </h2>
            <p className="text-[11px] text-slate-400">
              {filteredAndSortedCorridors.length} walkable corridors ranked across NCT Delhi
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
              title="Toggle Multi-Criteria Formula Explanation"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            {whatIfHeatWeight !== null && (
              <button
                onClick={() => onChangeWhatIfHeatWeight(null)}
                className="text-[11px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 flex items-center gap-1 border border-slate-700"
                title="Reset What-If slider to 6-factor scenario mode"
              >
                <RotateCcw className="w-3 h-3" /> 6-Factor Mode
              </button>
            )}
          </div>
        </div>

        {/* Multi-Criteria Formula Explanation Box */}
        {showFormulaInfo && (
          <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[10px] text-slate-300 space-y-1">
            <div className="font-bold text-emerald-300">Analytical Ranking Formula:</div>
            <div className="font-mono text-cyan-300">
              Score = w_heat × Heat + (1 - w_heat) × (1 - NDVI)
            </div>
            <div className="text-slate-400">
              Heat = (LST - 22°C) / 10°C | Deficit = 1.0 - NDVI | Normalized [0, 1]
            </div>
          </div>
        )}

        {/* District & Search Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              aria-label="Filter corridors by district"
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="All Districts">All 11 Districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              aria-label="Search corridors"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code (C-14), name..."
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="flex items-center justify-between gap-1.5 pt-0.5 text-[11px]">
          <span className="text-slate-400 text-[10px] font-semibold shrink-0">Sort By:</span>
          <div className="flex items-center gap-1 overflow-x-auto flex-1">
            {[
              { id: 'score', label: 'Priority' },
              { id: 'heat', label: 'Heat (LST)' },
              { id: 'ndvi_deficit', label: 'NDVI Deficit' },
              { id: 'feasibility', label: 'Feasibility' },
              { id: 'length', label: 'Length' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  if (sortBy === opt.id) {
                    setSortAsc(!sortAsc);
                  } else {
                    setSortBy(opt.id);
                    setSortAsc(false);
                  }
                }}
                className={`px-2 py-1 rounded text-[10px] font-medium transition border whitespace-nowrap ${
                  sortBy === opt.id
                    ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
                {sortBy === opt.id && (sortAsc ? ' ↑' : ' ↓')}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Policy Scenarios Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-300">Policy Scenario (5 Profiles)</span>
            <span className="text-emerald-400 font-mono text-[10px]">
              {whatIfHeatWeight !== null
                ? `What-If Slider (${Math.round(whatIfHeatWeight * 100)}% Heat)`
                : SCENARIO_LIST.find((s) => s.id === activeScenario)?.badge}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {SCENARIO_LIST.map((sc) => {
              const isActive = whatIfHeatWeight === null && activeScenario === sc.id;
              return (
                <button
                  key={sc.id}
                  aria-pressed={isActive}
                  onClick={() => {
                    onChangeWhatIfHeatWeight(null);
                    onSelectScenario(sc.id);
                  }}
                  className={`px-1.5 py-1.5 rounded text-[10px] font-medium leading-tight text-center transition border focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    isActive
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300 font-semibold shadow-sm'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-Factor What-If Sensitivity Slider */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">
              What-If Surface LST vs. Canopy Deficit Slider
            </span>
            <span className="font-mono text-[10px] text-amber-300">
              {whatIfHeatWeight !== null
                ? `${Math.round(whatIfHeatWeight * 100)}% Heat / ${Math.round(
                    (1 - whatIfHeatWeight) * 100
                  )}% Green`
                : 'Click slider to test 2-factor sensitivity'}
            </span>
          </div>
          <input
            type="range"
            aria-label="What-If surface LST versus canopy deficit weight"
            min="0"
            max="1"
            step="0.05"
            value={whatIfHeatWeight !== null ? whatIfHeatWeight : 0.6}
            onChange={(e) => onChangeWhatIfHeatWeight(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0% Heat (100% NDVI Deficit)</span>
            <span>Baseline (60% / 40%)</span>
            <span>100% Heat (LST)</span>
          </div>
        </div>
      </div>

      {/* Ranked Corridors Scrollable List */}
      <div
        className="flex-1 overflow-y-auto divide-y divide-slate-800/70"
        role="listbox"
        aria-label="Ranked urban corridors"
      >
        {filteredAndSortedCorridors.map((corr) => {
          const isSelected = selectedCorridor?.id === corr.id;
          const rankDelta = corr.rank_delta || 0;
          const feasStatus = deriveCorridorFeasibilityStatus(corr, mekoEnabled);

          return (
            <div
              key={corr.id}
              role="option"
              aria-selected={isSelected}
              tabIndex={0}
              onClick={() => onSelectCorridor(corr)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCorridor(corr);
                }
              }}
              className={`p-3 cursor-pointer transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 ${
                isSelected
                  ? 'bg-emerald-950/40 border-l-4 border-l-emerald-400'
                  : 'hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0"
                    style={{
                      backgroundColor: `${corr.severity_color || '#f97316'}22`,
                      color: corr.severity_color || '#f97316',
                      border: `1px solid ${corr.severity_color || '#f97316'}55`,
                    }}
                  >
                    #{corr.rank}
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-100 truncate">{corr.name}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span>{corr.district}</span>
                      <span>•</span>
                      <span className="uppercase text-[10px] font-mono text-slate-500">
                        {corr.highway}
                      </span>
                      <span>•</span>
                      <span>{formatDistanceKm(corr.length_km)}</span>
                    </div>
                  </div>
                </div>

                {/* Score & Rank Shift vs Baseline */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {formatScore(corr.priority_score, 3)}
                  </div>
                  <div className="flex items-center justify-end gap-0.5 text-[10px]">
                    {rankDelta > 0 ? (
                      <span className="text-emerald-400 flex items-center font-semibold">
                        <ArrowUpRight className="w-3 h-3" /> +{rankDelta} vs Base
                      </span>
                    ) : rankDelta < 0 ? (
                      <span className="text-rose-400 flex items-center font-semibold">
                        <ArrowDownRight className="w-3 h-3" /> {rankDelta} vs Base
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center">
                        <Minus className="w-2.5 h-2.5 mr-0.5" /> Base #{corr.baseline_rank}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Environmental Metrics Bar */}
              <div className="mt-2 grid grid-cols-4 gap-1.5 text-[10px] bg-slate-950/70 p-1.5 rounded border border-slate-800/80">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-orange-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block leading-none">Surf. LST</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatTemperature(corr.lst_mean)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Trees className="w-3 h-3 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block leading-none">NDVI</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatNDVI(corr.ndvi_mean, 3)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-3 h-3 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block leading-none">AQI</span>
                    <span className="font-mono font-semibold text-slate-200">{corr.aqi || '—'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-sky-400 shrink-0" />
                  <div>
                    <span className="text-slate-500 block leading-none">Conf.</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {formatPercentage(corr.confidence_score, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Feasibility Status + Primary Recommended Intervention Tag */}
              <div className="mt-1.5 flex items-center justify-between gap-1.5 flex-wrap text-[10px]">
                <FeasibilityStatusBadge status={feasStatus} compact />
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium truncate max-w-[55%]">
                  Fit: {corr.recommended_intervention}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
