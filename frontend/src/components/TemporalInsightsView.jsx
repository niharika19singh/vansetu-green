import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Database,
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
import { TemporalDataBadge } from './ui/ScientificBadges';

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
  const hasSimulatedPoints = series.some((pt) => pt.is_simulated !== false);
  const dateRangeLabel =
    series.length > 0
      ? `${series[0].day} → ${series[series.length - 1].day}`
      : '30-Day Rolling Window';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Clock className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-white">
              Tiger Data (TimescaleDB) Temporal Environmental Intelligence
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Hypertable: {schemaInfo?.hypertable_name || 'environmental_observations'}
            </span>
            <TemporalDataBadge isSimulated={hasSimulatedPoints} isLive={false} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Partitioned on <code className="text-emerald-300">observed_at</code> with continuous aggregate{' '}
            <code className="text-emerald-300">corridor_daily_summary</code> for 30-day thermal, NDVI, AQI, and post-intervention tracking.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs flex-wrap">
          <label htmlFor="temporal-corridor-input" className="text-slate-400">
            Corridor:
          </label>
          <input
            id="temporal-corridor-input"
            type="text"
            value={corridorCode}
            onChange={(e) => setCorridorCode(e.target.value)}
            className="w-24 bg-slate-950 border border-slate-700 rounded px-2.5 py-1 font-mono text-white"
          />
          <label htmlFor="temporal-metric-select" className="sr-only">
            Select temporal metric
          </label>
          <select
            id="temporal-metric-select"
            value={activeMetric}
            onChange={(e) => setActiveMetric(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white"
          >
            <option value="lst_celsius">Surface Heat Indicator — LST (°C)</option>
            <option value="ndvi">Sentinel-2 Canopy NDVI</option>
            <option value="aqi_us_epa">Ambient AQI (US-EPA)</option>
            <option value="pedestrian_heat_index">Pedestrian Thermal Exposure Proxy (°C)</option>
            <option value="soil_moisture_pct">Bioswale Soil Moisture (%)</option>
          </select>
        </div>
      </div>

      {/* Data Provenance Legend Strip: LIVE DATA vs HISTORICAL DATA vs SIMULATED DATA */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-semibold">Data Classification Badges:</span>
          <TemporalDataBadge isSimulated={false} isLive={true} />
          <TemporalDataBadge isSimulated={false} isLive={false} />
          <TemporalDataBadge isSimulated={true} isLive={false} />
        </div>
        <div className="font-mono text-[11px] text-slate-300">
          Date Range: <span className="text-emerald-400">{dateRangeLabel}</span> • Source:{' '}
          <span className="text-slate-200">{metricObj.primary_source || 'MODIS / Sentinel-2 / CPCB'}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">Current Value</span>
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
          <span className="text-slate-400 block">LST Exceedance (&ge;39°C)</span>
          <span className="text-lg font-mono font-bold text-orange-400">
            {trends?.heatwave_exceedance_days_39c ?? 0} days / 30d
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-slate-400 block">Total Hypertable Rows</span>
          <span className="text-lg font-mono font-bold text-cyan-300">
            {schemaInfo?.total_observations ?? 1500}
          </span>
        </div>
      </div>

      {/* Recharts 30-Day Continuous Aggregate Chart */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">
                30-Day Continuous Aggregate Rollup (<code className="text-emerald-400">corridor_daily_summary</code>) — {metricObj.label}
              </h3>
              <TemporalDataBadge isSimulated={hasSimulatedPoints} isLive={false} />
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Source: {metricObj.primary_source} • Window: {dateRangeLabel} • Explicit{' '}
              <code className="text-amber-300">is_simulated</code> flag tracked per bucket
            </p>
          </div>
          {comparison && (
            <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
              Last 7d Avg:{' '}
              <span className="text-emerald-400">{comparison.recent_period?.avg_value}</span> vs Prior 14d Baseline:{' '}
              <span className="text-slate-300">{comparison.prior_baseline_period?.avg_value}</span> (Δ{' '}
              {comparison.absolute_change})
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
                formatter={(val, _n, props) => [
                  `${val} ${metricObj.unit || ''} [${
                    props.payload.is_simulated ? 'SIMULATED DATA' : 'HISTORICAL DATA'
                  }]`,
                  metricObj.label,
                ]}
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
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
          <span>
            {trends?.data_honesty_notice} Note: Physiological human heat stress (UTCI / WBGT) is Not available without street-level 2m air temperature, relative humidity, and wind sensors.
          </span>
        </div>
      </div>

      {/* Before/After Intervention Effectiveness Monitoring & TimescaleDB DDL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
            Before vs. After Intervention Effectiveness Monitoring
          </h3>
          <div className="space-y-2.5">
            {(monitoring?.deployments || []).map((dep) => (
              <div
                key={dep.deployment_id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-white">
                    {dep.corridor_code}: {dep.intervention_name}
                  </span>
                  <TemporalDataBadge isSimulated={Boolean(dep.is_simulated)} isLive={false} />
                </div>
                <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2 rounded font-mono text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Surface Temp (LST)</span>
                    <span className="text-emerald-400 font-bold">
                      {dep.before_after_metrics.lst_celsius.before}°C →{' '}
                      {dep.before_after_metrics.lst_celsius.after}°C (-
                      {dep.before_after_metrics.lst_celsius.reduction_degC}°C)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Canopy NDVI</span>
                    <span className="text-emerald-400 font-bold">
                      {dep.before_after_metrics.ndvi.before} → {dep.before_after_metrics.ndvi.after} (+
                      {dep.before_after_metrics.ndvi.gain})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Corridor AQI</span>
                    <span className="text-amber-300 font-bold">
                      {dep.before_after_metrics.aqi_us_epa.before} →{' '}
                      {dep.before_after_metrics.aqi_us_epa.after} (-
                      {dep.before_after_metrics.aqi_us_epa.reduction_aqi})
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
            <Database className="w-4 h-4" aria-hidden="true" />
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
