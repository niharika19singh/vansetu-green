import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  TrendingUp,
  Database,
  Flame,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';

export default function TemporalInsightsView({ selectedCorridor }) {
  const [corridorCode, setCorridorCode] = useState(selectedCorridor?.code || 'C-14');
  const [activeMetric, setActiveMetric] = useState('lst_celsius');
  const [schemaInfo, setSchemaInfo] = useState(null);
  const [trends, setTrends] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [monitoring, setMonitoring] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCorridor?.code) {
      setCorridorCode(selectedCorridor.code);
    }
  }, [selectedCorridor]);

  const loadTemporalData = useCallback(async () => {
    setLoading(true);
    try {
      const [schRes, trRes, compRes, monRes] = await Promise.all([
        api.getTemporalSchema(),
        api.getTemporalTrends(corridorCode),
        api.getTemporalComparison(corridorCode, activeMetric),
        api.getTemporalMonitoring(),
      ]);
      setSchemaInfo(schRes);
      setTrends(trRes);
      setComparison(compRes);
      setMonitoring(monRes);
    } catch (err) {
      console.error('Temporal load error:', err);
    } finally {
      setLoading(false);
    }
  }, [corridorCode, activeMetric]);

  useEffect(() => {
    loadTemporalData();
  }, [loadTemporalData]);

  const metricObj = trends?.metrics?.[activeMetric] || {};
  const series = metricObj.series || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Tiger Data (TimescaleDB) Temporal Environmental Intelligence
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Hypertable: {schemaInfo?.hypertable_name || 'environmental_observations'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Partitioned on <code className="text-emerald-300">observed_at</code> with continuous aggregate <code className="text-emerald-300">corridor_daily_summary</code> for 30-day thermal, NDVI, AQI, and post-intervention tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Corridor:</span>
          <input
            type="text"
            value={corridorCode}
            onChange={(e) => setCorridorCode(e.target.value)}
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono text-white"
          />
          <select
            value={activeMetric}
            onChange={(e) => setActiveMetric(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white"
          >
            <option value="lst_celsius">Land Surface Temp (°C)</option>
            <option value="ndvi">Sentinel-2 NDVI</option>
            <option value="aqi_us_epa">Ambient AQI (US-EPA)</option>
            <option value="pedestrian_heat_index">Pedestrian Heat Stress (°C)</option>
            <option value="soil_moisture_pct">Bioswale Soil Moisture (%)</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">Current Observed</span>
          <span className="text-lg font-mono font-bold text-emerald-400">
            {metricObj.current_value ?? '—'} {metricObj.unit}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">30-Day Range</span>
          <span className="text-lg font-mono font-bold text-white">
            {metricObj.min_30d ?? '—'} – {metricObj.max_30d ?? '—'}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">30-Day Delta</span>
          <span className="text-lg font-mono font-bold text-amber-300">
            {metricObj.delta_30d > 0 ? `+${metricObj.delta_30d}` : metricObj.delta_30d} ({metricObj.trend_direction})
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">Heatwave Days (&ge;39°C)</span>
          <span className="text-lg font-mono font-bold text-orange-400">
            {trends?.heatwave_exceedance_days_39c ?? 0} days / 30d
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">Total Time-Series Rows</span>
          <span className="text-lg font-mono font-bold text-cyan-300">
            {schemaInfo?.total_observations ?? 1500}
          </span>
        </div>
      </div>

      {/* Recharts 30-Day Continuous Aggregate Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              30-Day Continuous Aggregate Rollup (<code className="text-emerald-400">corridor_daily_summary</code>) — {metricObj.label}
            </h3>
            <p className="text-[11px] text-slate-400">
              Source: {metricObj.primary_source} • Explicit <code className="text-amber-300">is_simulated</code> flag tracked per bucket
            </p>
          </div>
          {comparison && (
            <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
              Last 7d Avg: <span className="text-emerald-400">{comparison.recent_period?.avg_value}</span> vs Prior 14d Baseline: <span className="text-slate-300">{comparison.prior_baseline_period?.avg_value}</span> (Δ {comparison.absolute_change})
            </div>
          )}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series}>
              <defs>
                <linearGradient id="tigerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
              <YAxis stroke="#94a3b8" fontSize={10} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#334155',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tigerGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-[11px] text-slate-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{trends?.data_honesty_notice}</span>
        </div>
      </div>

      {/* Before/After Intervention Effectiveness Monitoring & TimescaleDB DDL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Before vs. After Intervention Effectiveness Monitoring
          </h3>
          <div className="space-y-2.5">
            {(monitoring?.deployments || []).map((dep) => (
              <div
                key={dep.deployment_id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">
                    {dep.corridor_code}: {dep.intervention_name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    is_simulated: {String(dep.is_simulated)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2 rounded font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Surface Temp (LST)</span>
                    <span className="text-emerald-400 font-bold">
                      {dep.before_after_metrics.lst_celsius.before}°C → {dep.before_after_metrics.lst_celsius.after}°C (-{dep.before_after_metrics.lst_celsius.reduction_degC}°C)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Canopy NDVI</span>
                    <span className="text-emerald-400 font-bold">
                      {dep.before_after_metrics.ndvi.before} → {dep.before_after_metrics.ndvi.after} (+{dep.before_after_metrics.ndvi.gain})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Corridor AQI</span>
                    <span className="text-amber-300 font-bold">
                      {dep.before_after_metrics.aqi_us_epa.before} → {dep.before_after_metrics.aqi_us_epa.after} (-{dep.before_after_metrics.aqi_us_epa.reduction_aqi})
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">{dep.monitoring_notes}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
          <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            TimescaleDB Hypertable &amp; Continuous Aggregate DDL
          </h3>
          <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-64">
            {schemaInfo?.timescaledb_ddl_sql}
          </pre>
        </div>
      </div>
    </div>
  );
}
