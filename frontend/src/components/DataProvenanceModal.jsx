import React, { useEffect } from 'react';
import {
  Database,
  X,
  Thermometer,
  Info,
} from 'lucide-react';

export default function DataProvenanceModal({ open, onClose, provenance, statsSummary }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const datasets = provenance?.datasets ? Object.values(provenance.datasets) : [];
  const rasterStats = statsSummary?.raster || {};
  const aqiMeta = statsSummary?.aqi || {};

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="provenance-modal-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <Database className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <h2 id="provenance-modal-title" className="text-base font-bold text-slate-100">
                Scientific Data Provenance &amp; Spatial Resolution Registry
              </h2>
              <p className="text-xs text-slate-400">
                Verification of native vs. display resolutions, CRS validation, observation epochs, and measured vs. interpolated status
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close provenance modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {/* Integrity Guarantees Banner */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                Sentinel-2 NDVI Grid
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                10m Native (5572×7794)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                NoData Pixels Masked: {rasterStats.ndvi?.nodata_pixel_count?.toLocaleString() || '39,791'}
              </div>
            </div>

            <div className="bg-slate-950 border border-orange-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                MODIS Terra LST Grid
              </div>
              <div className="text-sm font-bold font-mono text-orange-400 mt-0.5">
                1,000m Native (57×79)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Display: Bilinearly aligned to 10m
              </div>
            </div>

            <div className="bg-slate-950 border border-sky-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                CRS &amp; Missing Data Policy
              </div>
              <div className="text-sm font-bold font-mono text-sky-400 mt-0.5">
                EPSG:4326 (WGS84)
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Missing signals never coerced to 0
              </div>
            </div>

            <div className="bg-slate-950 border border-amber-500/30 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase font-semibold">
                CPCB AQI Telemetry Mode
              </div>
              <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                {aqiMeta.is_live ? 'Live Sensor API' : 'Historical Reference'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                8 CPCB Stations ({aqiMeta.data_mode || 'historical_reference'})
              </div>
            </div>
          </div>

          {/* Section 6A & 6B: Sensor Resolution & Thermal Disambiguation Reference Matrix */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-slate-100">
                Satellite Sensor Resolution Hierarchy &amp; Human Heat Stress Disambiguation
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-emerald-400">
                  Sentinel-2 L2A MSI (Active Optical)
                </div>
                <div className="font-mono text-[10px] text-slate-300">
                  Native: 10m • Display: 10m (True Pixel)
                </div>
                <p className="text-slate-400 text-[10px]">
                  Red (B04) and NIR (B08) bands provide true 10m street-corridor canopy reflectance without spatial interpolation.
                </p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1">
                <div className="font-bold text-orange-400">
                  MODIS Terra vs. Landsat 8/9 TIRS (Thermal)
                </div>
                <div className="font-mono text-[10px] text-slate-300">
                  MODIS: 1,000m Native • Landsat: 100m Native (30m Grid)
                </div>
                <p className="text-slate-400 text-[10px]">
                  Current raster pipeline uses MODIS MOD11A2 (1km native resampled to 10m display). Note: Even Landsat 8/9 Collection 2 Surface Temperature has a 100m native thermal sensor resampled to 30m pixels.
                </p>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-lg border border-amber-500/30 space-y-1">
                <div className="font-bold text-amber-300">
                  Human Heat Stress (UTCI / WBGT): Not available
                </div>
                <div className="font-mono text-[10px] text-amber-200">
                  Requires 2m Air Temp, RH%, Wind &amp; MRT
                </div>
                <p className="text-slate-400 text-[10px]">
                  Satellite LST measures roof/pavement radiometric skin temperature, not pedestrian thermal comfort. UTCI/WBGT is marked &ldquo;Not available&rdquo; until street-level weather stations are connected.
                </p>
              </div>
            </div>
          </div>

          {/* Dataset Cards */}
          <div className="space-y-3">
            {datasets.map((ds) => (
              <div
                key={ds.id}
                className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-400">{ds.name}</h3>
                    <div className="text-[11px] text-slate-400">{ds.provider}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-slate-300">
                      CRS: {ds.crs}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold ${
                        ds.is_live
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {ds.measurement_classification}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">
                      Native vs. Display Resolution
                    </span>
                    <span className="font-mono font-semibold text-slate-100">
                      Native: {ds.native_resolution_m}m → Display: {ds.display_resolution_m}m
                    </span>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Observation Period</span>
                    <span className="font-semibold text-slate-200">{ds.observation_period}</span>
                  </div>

                  <div className="bg-slate-900/90 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Formula / Units</span>
                    <span className="font-mono text-slate-200">
                      {ds.formula || ds.units}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800/80">
                  <span className="font-semibold text-amber-300">Resolution &amp; Resampling Disclosure: </span>
                  {ds.resampling_note}
                </div>

                <div className="text-[11px] text-slate-300">
                  <span className="font-semibold text-sky-300">NoData Handling: </span>
                  {ds.nodata_handling}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Known Scientific &amp; Sensor Limitations:
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                    {(ds.limitations || []).map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>

                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 flex justify-between">
                  <span>Instrument: {ds.instrument}</span>
                  <span>License / Attribution: {ds.license}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
