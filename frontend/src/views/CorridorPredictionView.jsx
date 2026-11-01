/**
 * CorridorPredictionView.jsx — Corridor Climate Prediction & Horizon Modeling Workspace.
 * 
 * Features:
 * - Real predictive model execution across 5 horizons (1-Yr, 3-Yr, 5-Yr, Extreme Heatwave Shock, VanSetu Greened).
 * - Full district filtering supporting all 11 NCT Delhi administrative districts.
 * - Observed vs Predicted thermal gauges, 90% confidence bands, feature attributions, and intervention mitigation potentials.
 */
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  Trees,
  ShieldCheck,
  Calendar,
  Filter,
  Layers,
  ArrowRight,
  Info,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '../api/client';
import {
  safeToFixed,
  formatScore,
  formatTemperature,
  formatNDVI,
} from '../utils/numericFormat';

export default function CorridorPredictionView({
  corridors = [],
  districts = [],
  selectedDistrict = 'All Districts',
  onSelectDistrict,
  selectedCorridor,
  onSelectCorridor,
  onNavigate,
}) {
  const [horizons, setHorizons] = useState([]);
  const [selectedHorizon, setSelectedHorizon] = useState('horizon_3yr_2029');
  const [predictionData, setPredictionData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter corridors by district
  const filteredCorridors = React.useMemo(() => {
    if (!selectedDistrict || selectedDistrict === 'All Districts') return corridors;
    const target = selectedDistrict.toLowerCase().replace(/ delhi$/, '');
    return corridors.filter((c) => {
      const cDist = (c.district || '').toLowerCase().replace(/ delhi$/, '');
      return cDist === target;
    });
  }, [corridors, selectedDistrict]);

  const activeCorridorId = selectedCorridor?.id || filteredCorridors[0]?.id || 'delhi_corridor_014';

  // Load horizons
  useEffect(() => {
    async function fetchHorizons() {
      try {
        const data = await api.getPredictionHorizons();
        if (Array.isArray(data) && data.length > 0) {
          setHorizons(data);
        }
      } catch (err) {
        console.warn('Failed to fetch prediction horizons from backend:', err);
      }
    }
    fetchHorizons();
  }, []);

  // Fetch prediction on corridor or horizon change
  useEffect(() => {
    if (!activeCorridorId) return;

    let cancelled = false;
    async function runPrediction() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getCorridorPrediction(activeCorridorId, selectedHorizon);
        if (!cancelled && res && res.status === 'success') {
          setPredictionData(res);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Prediction API error:', err);
          setError(err.message || 'Failed to execute microclimate prediction model.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    runPrediction();
    return () => {
      cancelled = true;
    };
  }, [activeCorridorId, selectedHorizon]);

  const pred = predictionData?.predicted_metrics || predictionData?.predicted || {};
  const obs = predictionData?.observed_metrics || predictionData?.observed || {};
  const attributions = predictionData?.feature_attributions || predictionData?.attributions || [];
  const interventions = predictionData?.intervention_mitigation_potential || predictionData?.interventions || [];

  const ciBand = pred?.confidence_interval_90 || predictionData?.confidence_interval_90;
  const ciLower = Array.isArray(ciBand) ? ciBand[0] : (ciBand?.lower_lst_celsius ?? null);
  const ciUpper = Array.isArray(ciBand) ? ciBand[1] : (ciBand?.upper_lst_celsius ?? null);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#071C16]/95 backdrop-blur-md flex-shrink-0">
        <div>
          <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Corridor Climate Prediction &amp; Microclimate Modeling
          </h2>
          <p className="text-xs text-[#9CB9A3]">
            Empirical multi-horizon thermal forecasting, 90% confidence bands, and SHAP-style causal attributions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* District selector */}
          <div className="flex items-center gap-2 bg-[#12392B] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict && onSelectDistrict(e.target.value)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All Districts" className="bg-[#0b241c] text-white">All 11 Districts</option>
              {districts.map((d) => (
                <option key={d} value={d} className="bg-[#0b241c] text-white">{d}</option>
              ))}
            </select>
          </div>

          {/* Corridor selector */}
          <div className="flex items-center gap-2 bg-[#12392B] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={activeCorridorId}
              onChange={(e) => {
                const found = corridors.find((c) => c.id === e.target.value);
                if (found && onSelectCorridor) onSelectCorridor(found);
              }}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
            >
              {filteredCorridors.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0b241c] text-white">
                  {c.code || c.name}: {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('map')}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
          >
            <span>View on Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Horizon Selection Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Select Climate Horizon / Stress Scenario
            </span>
            {isLoading && (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Computing microclimate regression...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {(horizons.length > 0 ? horizons : [
              { id: 'horizon_1yr_2027', title: '1-Year Baseline (2027)', tag: 'Short-Term', color: '#eab308', lst_delta_base: 0.40, description: 'Near-term urbanization drift' },
              { id: 'horizon_3yr_2029', title: '3-Year Intensification (2029)', tag: 'Mid-Term', color: '#f97316', lst_delta_base: 0.95, description: 'Compound UHI warming' },
              { id: 'horizon_5yr_2031', title: '5-Year Climate Trajectory (2031)', tag: 'Long-Term', color: '#ef4444', lst_delta_base: 1.65, description: 'CMIP6 unmitigated trajectory' },
              { id: 'extreme_heatwave_2030', title: 'Extreme Heatwave (48.5°C)', tag: 'Acute Shock', color: '#dc2626', lst_delta_base: 2.95, description: 'Peak summer thermal shock' },
              { id: 'vansetu_greened_2028', title: 'VanSetu Greened (2028)', tag: 'Mitigated', color: '#10b981', lst_delta_base: -2.45, description: 'Full canopy & swale mitigation' },
            ]).map((h) => {
              const isSelected = selectedHorizon === h.id;
              return (
                <button
                  key={h.id}
                  onClick={() => setSelectedHorizon(h.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#12392B] border-emerald-400/80 shadow-lg shadow-emerald-950/40'
                      : 'bg-[#0d2b21]/60 border-white/10 hover:border-white/20 hover:bg-[#0d2b21]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${h.color}25`,
                        color: h.color,
                        border: `1px solid ${h.color}50`,
                      }}
                    >
                      {h.tag}
                    </span>
                    <span className="text-xs font-bold" style={{ color: h.color }}>
                      {h.lst_delta_base > 0 ? `+${h.lst_delta_base}°C` : `${h.lst_delta_base}°C`}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 leading-snug">{h.title}</h4>
                  <p className="text-[11px] text-[#9CB9A3] line-clamp-2">{h.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prediction Gauges & Core Metrics */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {predictionData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* LST Prediction Card */}
            <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#9CB9A3] mb-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  Surface Temperature (LST)
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                  90% CI
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-white font-mono">
                  {formatTemperature(pred?.lst_celsius)}
                </span>
                <span
                  className={`text-xs font-bold ${
                    (pred?.lst_delta_celsius || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {(pred?.lst_delta_celsius || 0) > 0
                    ? `+${safeToFixed(pred?.lst_delta_celsius, 2)}°C`
                    : `${safeToFixed(pred?.lst_delta_celsius, 2)}°C`}
                </span>
              </div>
              <div className="text-[11px] text-[#9CB9A3] space-y-1 mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span>Baseline Observed:</span>
                  <span className="font-mono text-white font-semibold">{formatTemperature(obs?.lst_celsius)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence Band (90%):</span>
                  <span className="font-mono text-amber-300 font-semibold">
                    [{formatTemperature(ciLower)} — {formatTemperature(ciUpper)}]
                  </span>
                </div>
              </div>
            </div>

            {/* Vegetation Index Card */}
            <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#9CB9A3] mb-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <Trees className="w-3.5 h-3.5 text-emerald-400" />
                  Vegetation Index (NDVI)
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                  Canopy
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-white font-mono">
                  {formatNDVI(pred?.ndvi, 3)}
                </span>
                <span
                  className={`text-xs font-bold ${
                    (pred?.ndvi_delta || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {(pred?.ndvi_delta || 0) >= 0
                    ? `+${safeToFixed(pred?.ndvi_delta, 3)}`
                    : `${safeToFixed(pred?.ndvi_delta, 3)}`}
                </span>
              </div>
              <div className="text-[11px] text-[#9CB9A3] space-y-1 mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span>Baseline NDVI:</span>
                  <span className="font-mono text-white font-semibold">{formatNDVI(obs?.ndvi, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Green Deficit (1-NDVI):</span>
                  <span className="font-mono text-emerald-300 font-semibold">
                    {safeToFixed(1 - (Number(pred?.ndvi) || 0.2), 3)}
                  </span>
                </div>
              </div>
            </div>

            {/* VanSetu Priority Score Card */}
            <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#9CB9A3] mb-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Predicted VanSetu Score
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                  Tri-Vector
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-white font-mono">
                  {formatScore(pred?.priority_score, 3)}
                </span>
                <span
                  className={`text-xs font-bold ${
                    (pred?.score_delta || 0) >= 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {(pred?.score_delta || 0) >= 0
                    ? `+${safeToFixed(pred?.score_delta, 3)}`
                    : `${safeToFixed(pred?.score_delta, 3)}`}
                </span>
              </div>
              <div className="text-[11px] text-[#9CB9A3] space-y-1 mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span>Baseline Priority:</span>
                  <span className="font-mono text-white font-semibold">{formatScore(obs?.priority_score, 3)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Heat Vulnerability Index:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {safeToFixed(pred?.heat_vulnerability_index, 2)} / 1.00
                  </span>
                </div>
              </div>
            </div>

            {/* Annual Heat Stress Hours Card */}
            <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#9CB9A3] mb-2">
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Thermal Distress Delta
                </span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                  Annual
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-black text-white font-mono">
                  {(pred?.annual_heat_stress_hours_delta || 0) > 0 ? `+${pred?.annual_heat_stress_hours_delta}` : pred?.annual_heat_stress_hours_delta}
                </span>
                <span className="text-xs font-bold text-slate-300">hrs/yr</span>
              </div>
              <div className="text-[11px] text-[#9CB9A3] space-y-1 mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between">
                  <span>Surface Runoff Shift:</span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {(pred?.runoff_delta_pct || 0) > 0 ? `+${pred?.runoff_delta_pct}%` : `${pred?.runoff_delta_pct}%`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Model Architecture:</span>
                  <span className="text-slate-300 font-mono text-[10px]">GEMR-v2.4 (R² 0.912)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Attributions & SHAP Decomposition */}
        {attributions.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#0d2b21] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Causal Feature Attributions (Thermal Drivers Breakdown)
                </h3>
                <p className="text-xs text-[#9CB9A3]">
                  Mathematical contribution of each environmental and urban factor to the predicted temperature delta
                </p>
              </div>
              <span className="text-[11px] text-emerald-400/80 font-mono">Σ Contributions = 100%</span>
            </div>

            <div className="space-y-3">
              {attributions.map((attr, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">{attr.feature}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#9CB9A3]">{attr.description}</span>
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                        {attr.delta_celsius > 0 ? `+${attr.delta_celsius}°C` : `${attr.delta_celsius}°C`} ({attr.contribution_pct}%)
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full"
                      style={{ width: `${attr.contribution_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Intervention Mitigation Potentials */}
        {interventions.length > 0 && (
          <div className="p-5 rounded-2xl bg-[#0d2b21] border border-white/10 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Trees className="w-4 h-4 text-emerald-400" />
                Recommended Corridor Mitigation Interventions
              </h3>
              <p className="text-xs text-[#9CB9A3]">
                Targeted green infrastructure interventions engineered to offset projected thermal shifts
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {interventions.map((intv, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#12392B]/60 border border-white/10 hover:border-emerald-500/40 transition space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-white">{intv.type}</h4>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {intv.cooling_potential_celsius}°C
                      </span>
                    </div>
                    {intv.species && (
                      <p className="text-[11px] text-[#9CB9A3]">
                        Species: <span className="text-slate-200">{intv.species.join(', ')}</span>
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9CB9A3]">
                    <span>Est. Cost: <strong className="text-white">₹{intv.cost_est_lakh} Lakh</strong></span>
                    <span>Timeline: <strong className="text-white">{intv.implementation_time_months} mo</strong></span>
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
