import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Thermometer,
  Sun,
  CloudRain,
  Snowflake,
  ShieldAlert,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';

export default function SeasonalHeatIntelligenceView({ selectedCorridor, retryKey }) {
  const corridorId = selectedCorridor?.code || selectedCorridor?.id || 'C-14';

  const [activeTab, setActiveTab] = useState('corridor'); // 'corridor' | 'hotspots'
  const [seasonalData, setSeasonalData] = useState(null);
  const [persistentHotspots, setPersistentHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDetail, setErrorDetail] = useState(null);

  // Keep track of active request sequence to prevent stale overwrites
  const requestSeqRef = useRef(0);

  const fetchSeasonalData = useCallback(async () => {
    const currentSeq = ++requestSeqRef.current;
    setLoading(true);
    setError(null);
    setErrorDetail(null);

    try {
      const [profRes, hotRes] = await Promise.all([
        api.getSeasonalHeatProfile(corridorId),
        api.getSeasonalHotspots(),
      ]);

      if (currentSeq !== requestSeqRef.current) return;

      setSeasonalData(profRes);
      setPersistentHotspots(hotRes?.persistent_hotspots || []);
      setLoading(false);
    } catch (err) {
      if (currentSeq !== requestSeqRef.current) return;

      const rawMsg = err.message || 'Failed to fetch';
      setError(rawMsg);

      let detail = `Failed to connect to VanSetu backend (${api.getBaseUrl ? api.getBaseUrl() : 'API'}).`;
      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('Load failed')) {
        detail = `Network or CORS error communicating with ${api.getBaseUrl ? api.getBaseUrl() : 'backend server'}. Verify the service is running and cross-origin permissions are enabled.`;
      } else if (rawMsg.includes('404')) {
        detail = `Corridor '${corridorId}' was not found in the seasonal heat monitoring registry.`;
      }
      setErrorDetail(detail);
      setLoading(false);
    }
  }, [corridorId]);

  useEffect(() => {
    fetchSeasonalData();
    return () => {
      // Invalidate in-flight requests on unmount or corridor change
      requestSeqRef.current++;
    };
  }, [fetchSeasonalData, retryKey]);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Thermometer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">
                Seasonal Urban Heat Intelligence
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-rose-300">
                {corridorId}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-temporal radiometric composites &bull; Persistent thermal hotspot detection &bull; Sensor resolution provenance
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('corridor')}
            className={`px-3 py-1.5 font-medium rounded-md transition ${
              activeTab === 'corridor'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Corridor Thermal Profile
          </button>
          <button
            onClick={() => setActiveTab('hotspots')}
            className={`px-3 py-1.5 font-medium rounded-md transition ${
              activeTab === 'hotspots'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Persistent Hotspots ({persistentHotspots.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <p className="text-sm">Loading multi-seasonal thermal observations and satellite calibration curves...</p>
          </div>
        )}

        {/* Genuine Error Card with Active Retry Action */}
        {!loading && error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-white text-sm">Failed to Load Seasonal Heat Intelligence</h3>
                  <p className="text-xs text-rose-300 mt-0.5">{error}</p>
                  {errorDetail && (
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{errorDetail}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => fetchSeasonalData()}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition shadow disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Retrying...' : 'Retry'}
              </button>
            </div>
            <div className="pt-2 border-t border-rose-900/50 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>Endpoint: /api/seasonal/corridor/{corridorId}</span>
              <span>Target: {api.getBaseUrl ? api.getBaseUrl() : 'VanSetu backend'}</span>
            </div>
          </div>
        )}

        {/* Mandatory Scientific Disclaimer Banner */}
        {!loading && !error && seasonalData && (
          <div className="p-3.5 bg-amber-950/20 border border-amber-900/50 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              Human Physiological Thermal Comfort (UTCI / WBGT) Guardrail
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {seasonalData.scientific_disclaimer?.mandatory_notice}
            </p>
          </div>
        )}

        {/* Tab 1: Corridor Profile */}
        {!loading && !error && activeTab === 'corridor' && seasonalData && (
          <>
            {/* Top Hotspot Status Card */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Multi-Seasonal Anomaly Classification
                </span>
                <div className="text-lg font-bold text-white flex items-center gap-2 mt-0.5">
                  <span>{seasonalData.hotspot_classification?.replace(/_/g, ' ') || 'NOMINAL'}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      seasonalData.hotspot_classification === 'PERSISTENT_THERMAL_HOTSPOT'
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {seasonalData.hotspot_confidence} CONFIDENCE
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Corridor Info</span>
                <div className="text-xs text-slate-300 font-bold">{seasonalData.corridor_name}</div>
                <div className="text-[11px] text-slate-500">{seasonalData.district}</div>
              </div>
            </div>

            {/* 3 Seasonal Observations Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {(seasonalData.seasonal_observations || []).map((obs, idx) => {
                const isSummer = idx === 0;
                const isMonsoon = idx === 1;
                const Icon = isSummer ? Sun : isMonsoon ? CloudRain : Snowflake;
                const iconColor = isSummer ? 'text-amber-400' : isMonsoon ? 'text-sky-400' : 'text-blue-400';

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5">
                          <Icon className={`w-4 h-4 ${iconColor}`} />
                          {obs.season}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{obs.period}</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-white mt-1">
                        {obs.lst_celsius !== null && obs.lst_celsius !== undefined ? `${obs.lst_celsius}°C` : 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Regional Baseline: {obs.regional_baseline_celsius}&deg;C
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">Thermal Anomaly:</span>
                      <span
                        className={`text-xs font-mono font-bold ${
                          obs.thermal_anomaly_celsius > 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {obs.thermal_anomaly_celsius !== null && obs.thermal_anomaly_celsius !== undefined
                          ? obs.thermal_anomaly_celsius > 0
                            ? `+${obs.thermal_anomaly_celsius}°C`
                            : `${obs.thermal_anomaly_celsius}°C`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sensor Provenance Comparison */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Multi-Sensor Resolution &amp; Provenance Comparison
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-white">
                    Current Platform Sensor: NASA MODIS Terra (MOD11A2)
                  </div>
                  <div className="text-slate-400">
                    Native Spatial Resolution: <span className="font-mono text-amber-400 font-bold">1,000m &times; 1,000m</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Display Grid: 10m bilinear interpolation onto Sentinel-2 grid. Regional 8-day composite.
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="font-bold text-white">
                    Upgrade Path: USGS Landsat 8/9 Collection 2 (TIRS)
                  </div>
                  <div className="text-slate-400">
                    Native Spatial Resolution: <span className="font-mono text-emerald-400 font-bold">100m native / 30m grid</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Recommended for segment-level micro-hotspot confirmation prior to civil excavation.
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Persistent Hotspots */}
        {!loading && !error && activeTab === 'hotspots' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                NCT Delhi Persistent Thermal Hotspots (Multi-Seasonal Consistency)
              </h3>
              <span className="text-xs text-rose-400 font-mono font-bold">
                {persistentHotspots.length} Persistent Hotspots
              </span>
            </div>

            {persistentHotspots.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Persistent Thermal Hotspots Identified</h4>
                <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                  All 44 monitored urban transit corridors currently exhibit radiometric Land Surface Temperatures within nominal regional seasonal thresholds. Zero segments exceed the multi-seasonal persistence criteria in the current observation epoch.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {persistentHotspots.map((h, idx) => (
                  <div
                    key={h.corridor_id || idx}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-500 font-bold w-6 text-right">#{idx + 1}</span>
                      <div>
                        <div className="font-bold text-white">
                          {h.corridor_code} - {h.corridor_name}
                        </div>
                        <div className="text-[11px] text-slate-400">{h.district}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-rose-400 text-sm">
                        +{h.thermal_anomaly}&deg;C Anomaly
                      </div>
                      <div className="text-[10px] text-slate-500">Peak LST: {h.pre_monsoon_lst}&deg;C</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
