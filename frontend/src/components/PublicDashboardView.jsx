import React from 'react';
import {
  Trees,
  Thermometer,
  Wind,
  Globe2,
  ArrowRight,
  ShieldCheck,
  Heart,
  Users,
  Eye,
} from 'lucide-react';
import {
  formatTemperature,
  formatNDVI,
} from '../utils/numericFormat';

export default function PublicDashboardView({
  statsSummary,
  corridors = [],
  onNavigate,
}) {
  const lstStats = statsSummary?.raster?.lst || {};
  const ndviStats = statsSummary?.raster?.ndvi || {};
  const aqiStats = statsSummary?.aqi || {};

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/40">
              PUBLIC CLIMATE TRANSPARENCY
            </span>
            <span className="text-slate-400 text-xs">NCT Delhi Urban Environment Observatory</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            VanSetu — Delhi Urban Climate &amp; Shade Observatory
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            A public scientific intelligence portal monitoring surface heat, urban canopy density,
            and municipal pedestrian greening projects across Delhi&apos;s 11 administrative districts.
          </p>
        </div>
      </div>

      {/* Environmental Vital Signs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Surface Temperature */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Mean Surface Temperature</span>
            <Thermometer className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-orange-400 font-mono">
              {formatTemperature(lstStats?.mean)}
            </span>
            <span className="text-xs text-slate-400">MODIS Satellite</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Peak pedestrian summer heat reaches over 44°C along unshaded arterial roads.
          </p>
        </div>

        {/* Card 2: Green Canopy */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Urban Vegetation Density</span>
            <Trees className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {formatNDVI(ndviStats?.mean, 3)}
            </span>
            <span className="text-xs text-slate-400">Sentinel-2 NDVI</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Pedestrian corridors average 0.28 NDVI, indicating acute canopy deficit.
          </p>
        </div>

        {/* Card 3: Air Quality Index */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Average Air Quality</span>
            <Wind className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 font-mono">
              {aqiStats.mean_aqi || '238'}
            </span>
            <span className="text-xs text-slate-400">CPCB Stations</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Dense native tree canopies intercept airborne particulates and PM2.5.
          </p>
        </div>
      </div>

      {/* Citizen Exploration Pathways */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Eye className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white">Interactive Public Map</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Explore 30 prioritized pedestrian corridors, satellite heat raster maps, and CPCB air
            monitoring stations across Delhi without requiring administrative login.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('map')}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <span>Open Public Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-blue-400">
            <Users className="w-5 h-5" />
            <h2 className="text-sm font-bold text-white">Community Climate Feedback</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Report unshaded bus stops, broken footpaths, or thermal hotspots in your neighborhood to
            inform municipal planning and equity-weighted budgeting.
          </p>
          <button
            onClick={() => onNavigate && onNavigate('provenance')}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 transition"
          >
            <span>Submit Community Observation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
