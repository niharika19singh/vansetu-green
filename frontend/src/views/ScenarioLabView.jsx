/**
 * ScenarioLabView.jsx — Scenario Lab & Sensitivity Analysis Workspace.
 * Features:
 * - 5 Municipal policy scenarios: Baseline, Heat Resilience, Air Quality, Pedestrian Equity, Extreme Vulnerability.
 * - Dynamic What-If Heat Weight Sensitivity slider (0.10 to 0.80).
 * - Corridor sensitivity ranking shifts and comparative analytics.
 * - One-click launch into Decision Studio with active scenario weights.
 */
import React from 'react';
import {
  Sliders,
  Calculator,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Flame,
  Wind,
  Footprints,
  ShieldAlert,
} from 'lucide-react';
import {
  safeToFixed,
  formatPercentage,
  formatScore,
  isValidNumber,
} from '../utils/numericFormat';

export const SCENARIOS = [
  {
    id: 'baseline',
    label: 'Baseline Policy',
    desc: 'Balanced composite weights across heat, vegetation, and transit density.',
    icon: Sliders,
    weights: { heat: 0.35, ndvi: 0.25, aqi: 0.20, transit: 0.20 },
  },
  {
    id: 'heat_resilience',
    label: 'Heat Resilience',
    desc: 'Prioritizes thermal LST mitigation along unshaded transit corridors.',
    icon: Flame,
    weights: { heat: 0.55, ndvi: 0.20, aqi: 0.15, transit: 0.10 },
  },
  {
    id: 'air_quality',
    label: 'Air Quality Focus',
    desc: 'Concentrates on CPCB particulate hotspots and vehicular dust corridors.',
    icon: Wind,
    weights: { heat: 0.20, ndvi: 0.20, aqi: 0.45, transit: 0.15 },
  },
  {
    id: 'pedestrian_equity',
    label: 'Pedestrian Equity',
    desc: 'Targets high-volume walkable corridors near schools, hospitals, and transit hubs.',
    icon: Footprints,
    weights: { heat: 0.25, ndvi: 0.20, aqi: 0.15, transit: 0.40 },
  },
  {
    id: 'extreme_vulnerability',
    label: 'Extreme Vulnerability',
    desc: 'Identifies compounding socio-climatic clusters requiring emergency interventions.',
    icon: ShieldAlert,
    weights: { heat: 0.40, ndvi: 0.25, aqi: 0.20, transit: 0.15 },
  },
];

export default function ScenarioLabView({
  activeScenario,
  onSelectScenario,
  whatIfHeatWeight,
  onChangeWhatIfHeatWeight,
  sensitivityData,
  onNavigate,
}) {
  const currentScenarioObj =
    SCENARIOS.find((s) => s.id === activeScenario) || SCENARIOS[0];

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto bg-[#071C16] text-[#F3F1E7] p-6 lg:p-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            Policy Modeling &amp; What-If Simulation
          </div>
          <h2 className="font-editorial text-2xl sm:text-4xl font-bold text-white tracking-tight mt-1">
            Scenario Lab &amp; Sensitivity Analysis
          </h2>
          <p className="text-xs sm:text-sm text-[#9CB9A3] mt-1 max-w-2xl">
            Simulate municipal policy weight shifts and observe real-time priority ranking re-orderings
            across Delhi's 44 critical transport corridors.
          </p>
        </div>

        <button
          onClick={() => onNavigate('studio')}
          className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow self-start sm:self-auto transition"
        >
          <Calculator className="w-4 h-4" />
          <span>Run Budget Optimization</span>
        </button>
      </div>

      {/* Scenario Selection Grid */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-white uppercase tracking-wider block">
          Select Municipal Policy Scenario
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SCENARIOS.map((sc) => {
            const Icon = sc.icon;
            const isActive = activeScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectScenario(sc.id)}
                className={`p-4 rounded-3xl border text-left transition flex flex-col justify-between ${
                  isActive
                    ? 'bg-emerald-700 border-emerald-400 text-white shadow-xl shadow-emerald-950/60'
                    : 'bg-[#12392B]/40 border-white/10 text-slate-300 hover:text-white hover:bg-[#12392B]/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="w-5 h-5 text-emerald-300" />
                    {isActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-white">{sc.label}</h4>
                  <p className="text-[11px] opacity-80 mt-1 leading-relaxed">{sc.desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/10 text-[10px] font-mono text-[#9CB9A3]">
                  Heat: {formatPercentage(sc.weights?.heat, 0)} • Transit: {formatPercentage(sc.weights?.transit, 0)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* What-If Heat Weight Sensitivity Slider */}
      <div className="bg-[#12392B]/40 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-editorial text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-300" />
              Dynamic What-If Heat Weight Sensitivity
            </h3>
            <p className="text-xs text-[#9CB9A3]">
              Adjust the mathematical heat anomaly weighting (alpha-heat) to stress-test corridor priority scores.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Heat Weight:</span>
            <div className="font-mono text-2xl font-bold text-amber-300">
              {isValidNumber(whatIfHeatWeight) ? formatPercentage(whatIfHeatWeight, 0) : 'Scenario Default'}
            </div>
          </div>
        </div>

        <input
          type="range"
          min="0.10"
          max="0.80"
          step="0.05"
          value={isValidNumber(whatIfHeatWeight) ? whatIfHeatWeight : 0.35}
          onChange={(e) => onChangeWhatIfHeatWeight(parseFloat(e.target.value))}
          className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />

        <div className="flex justify-between text-[11px] text-[#9CB9A3] font-mono">
          <span>0.10 (Minimum Heat Focus)</span>
          <span>0.35 (Default Baseline)</span>
          <span>0.80 (Emergency Heat Wave Protocol)</span>
        </div>
      </div>

      {/* Sensitivity Ranking Shift Table */}
      {sensitivityData?.corridors && (
        <div className="bg-[#071C16]/80 border border-white/10 rounded-3xl p-6 space-y-4">
          <div>
            <h3 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Corridor Rank Shifts Under {currentScenarioObj.label}
            </h3>
            <p className="text-xs text-[#9CB9A3]">
              Top corridors most sensitive to the current scenario weighting formula.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-[#9CB9A3] uppercase font-mono border-b border-white/10 bg-[#12392B]/30">
                <tr>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">District</th>
                  <th className="py-2.5 px-3">Baseline Rank</th>
                  <th className="py-2.5 px-3">Scenario Rank</th>
                  <th className="py-2.5 px-3">Rank Shift</th>
                  <th className="py-2.5 px-3">Sensitivity Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {sensitivityData.corridors.slice(0, 8).map((c) => {
                  const shift = (c.baseline_rank || 0) - (c.scenario_rank || 0);
                  const isPositive = shift > 0;
                  return (
                    <tr key={c.id} className="hover:bg-white/5 transition">
                      <td className="py-2.5 px-3 font-bold text-white font-sans">{c.name}</td>
                      <td className="py-2.5 px-3 text-[#9CB9A3] font-sans">{c.district}</td>
                      <td className="py-2.5 px-3 text-slate-300">#{c.baseline_rank || '-'}</td>
                      <td className="py-2.5 px-3 text-white font-bold">#{c.scenario_rank || '-'}</td>
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isPositive ? 'text-emerald-400' : shift < 0 ? 'text-rose-400' : 'text-slate-400'
                        }`}
                      >
                        {isPositive ? `+${shift} ↑` : shift < 0 ? `${shift} ↓` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-amber-300 font-bold">
                        {formatScore(c.sensitivity_score, 3, '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
