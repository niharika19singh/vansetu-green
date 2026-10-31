import React from 'react';
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
  Activity,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  Layers,
} from 'lucide-react';

const INDICATOR_LABELS = {
  heat: 'Heat Exposure (LST)',
  green_deficit: 'Vegetation Deficit (1-NDVI)',
  pollution: 'Air Quality Stress (AQI)',
  pedestrian: 'Pedestrian Demand',
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

export default function CorridorAnalyticalDetail({
  corridor,
  sensitivityRow,
  activeScenario,
}) {
  if (!corridor) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Select an urban corridor on the map or ranking list to inspect its explainable calculation breakdown.
      </div>
    );
  }

  const calc = corridor.calculation_breakdown || {};
  const normInputs = calc.normalized_inputs || {};
  const activeWeights = calc.active_weights || {};
  const configWeights = calc.configured_weights || {};
  const contributions = calc.weighted_contributions || {};
  const confBreakdown = calc.confidence_breakdown || {};
  const feasBreakdown = calc.feasibility_breakdown || {};
  const completeness = corridor.data_completeness || {};

  // Prepare Recharts data for 6-factor weighted contribution breakdown
  const factorChartData = Object.keys(INDICATOR_LABELS).map((key) => ({
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

  // Prepare Recharts data for 5-scenario sensitivity comparison
  const scenarioComp = sensitivityRow?.scenario_comparison || {};
  const scenarioChartData = [
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

  const stability = sensitivityRow?.stability_metrics || {};

  return (
    <div className="space-y-4 text-xs">
      {/* Tri-Vector Score Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-950/90 border border-emerald-500/30 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Priority Score
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
            {corridor.priority_score !== null ? corridor.priority_score.toFixed(4) : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-400">
            Rank #{corridor.rank} ({corridor.severity})
          </div>
        </div>

        <div className="bg-slate-950/90 border border-sky-500/30 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Feasibility
          </div>
          <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
            {(corridor.feasibility_score * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-400">
            ROW ~{feasBreakdown.estimated_row_width_m || 18}m ({corridor.highway})
          </div>
        </div>

        <div className="bg-slate-950/90 border border-amber-500/30 rounded-lg p-2.5">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">
            Evidence Conf.
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
            {(corridor.confidence_score * 100).toFixed(0)}%
          </div>
          <div className="text-[10px] text-slate-400">
            {completeness.active_signal_count || 6}/{completeness.total_signal_count || 6} Signals Active
          </div>
        </div>
      </div>

      {/* Native vs Display Resolution Disclosure Card */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Geospatial Measurements (Native vs. Display Resolution)
          </span>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
            EPSG:4326 Verified
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">MODIS LST (1,000m Native Pixel)</div>
            <div className="font-mono font-bold text-orange-400 text-sm">
              {corridor.lst_native_mean}°C
            </div>
            <div className="text-[10px] text-slate-500">
              Un-interpolated 57×79 native thermal cell
            </div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">MODIS LST (10m Bilinear Display)</div>
            <div className="font-mono font-bold text-amber-300 text-sm">
              {corridor.lst_mean}°C (Max {corridor.lst_max}°C)
            </div>
            <div className="text-[10px] text-slate-500">
              Aligned to 10m grid for visual overlay
            </div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">Sentinel-2 NDVI (10m Native)</div>
            <div className="font-mono font-bold text-emerald-400 text-sm">
              {corridor.ndvi_mean} (Deficit: {corridor.green_deficit})
            </div>
            <div className="text-[10px] text-slate-500">
              5572×7794 native surface reflectance
            </div>
          </div>

          <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">
              Nearest CPCB AQI ({corridor.aqi_distance_km} km)
            </div>
            <div className="font-mono font-bold text-yellow-400 text-sm">
              AQI {corridor.aqi} (PM2.5: {corridor.pm25})
            </div>
            <div className="text-[10px] text-slate-500 truncate" title={corridor.aqi_station}>
              {corridor.aqi_station} [{corridor.aqi_is_live ? 'Live API' : 'CPCB Baseline'}]
            </div>
          </div>
        </div>
      </div>

      {/* Explainable Formula Trace & Table */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
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
                  `${Number(val).toFixed(4)} (Norm: ${props.payload.normalized.toFixed(
                    3
                  )} × Weight: ${props.payload.activeWeight.toFixed(2)})`,
                  props.payload.fullLabel,
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
                      {nVal !== null && nVal !== undefined ? nVal.toFixed(3) : 'MISSING'}
                    </td>
                    <td className="py-1 text-right text-slate-400">
                      {cW !== undefined ? cW.toFixed(2) : '-'}
                    </td>
                    <td className="py-1 text-right text-emerald-400">
                      {aW !== undefined ? aW.toFixed(3) : '-'}
                    </td>
                    <td className="py-1 text-right font-bold text-slate-100">
                      {contrib !== null && contrib !== undefined ? contrib.toFixed(4) : 'Excl.'}
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
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
              5-Scenario Sensitivity &amp; Ranking Stability
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30 font-mono text-[10px]">
              Stability S = {stability.stability_index?.toFixed(3)} ({stability.stability_class})
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Across all 5 policy scenarios, this corridor ranks between{' '}
            <span className="text-slate-200 font-semibold">#{stability.min_rank}</span> and{' '}
            <span className="text-slate-200 font-semibold">#{stability.max_rank}</span> (Rank
            range: {stability.rank_range}, StdDev: ±{stability.rank_std}).
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
                    `Score: ${Number(val).toFixed(4)} | Rank: #${props.payload.rank}`,
                    props.payload.name,
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
                <div className="font-mono font-bold text-slate-100">#{sc.rank}</div>
                <div className="font-mono text-[10px] text-emerald-400">
                  {sc.score.toFixed(3)}
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
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Evidence Confidence Deduction Ledger
          </span>
          <span className="font-mono text-amber-400 font-bold">
            1.00 {confBreakdown.total_deduction} = {corridor.confidence_score?.toFixed(2)}
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
                {pen.deduction.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
