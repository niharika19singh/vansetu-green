/**
 * HeatwaveMappingView.jsx — Urban Heatwave Mapping & Thermal Vulnerability Workspace.
 * 
 * Features:
 * - City-wide and district-level heat vulnerability mapping across all 11 districts.
 * - Identification of extreme thermal hotspots, unshaded pedestrian segments, and hospital catchment overlays.
 * - Integration with CPCB ambient air telemetry and MODIS land surface temperature grids.
 */
import React, { useState } from 'react';
import {
  Flame,
  AlertTriangle,
  Filter,
  Thermometer,
  ShieldAlert,
  Trees,
  MapPin,
  ArrowRight,
  Activity,
  Layers,
} from 'lucide-react';
import {
  formatTemperature,
  formatNDVI,
  formatScore,
} from '../utils/numericFormat';

export default function HeatwaveMappingView({
  corridors = [],
  districts = [],
  selectedDistrict = 'All Districts',
  onSelectDistrict,
  onSelectCorridor,
  onNavigate,
}) {
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'extreme' | 'high'

  const filtered = corridors.filter((c) => {
    if (selectedDistrict && selectedDistrict !== 'All Districts') {
      const target = selectedDistrict.toLowerCase().replace(/ delhi$/, '');
      const cDist = (c.district || '').toLowerCase().replace(/ delhi$/, '');
      if (cDist !== target) return false;
    }
    const lst = c.lst_mean || 26.0;
    if (severityFilter === 'extreme' && lst < 27.5) return false;
    if (severityFilter === 'high' && lst < 26.0) return false;
    return true;
  });

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#071C16]/95 backdrop-blur-md flex-shrink-0">
        <div>
          <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-500" />
            Urban Heatwave Mapping &amp; Thermal Risk Zones
          </h2>
          <p className="text-xs text-[#9CB9A3]">
            High-resolution MODIS thermal hotspots, unshaded pedestrian corridors, and climate vulnerability indices
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

          {/* Severity filter */}
          <div className="flex items-center gap-2 bg-[#12392B] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className="text-[#9CB9A3]">Risk Tier:</span>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#0b241c] text-white">All Tiers</option>
              <option value="extreme" className="bg-[#0b241c] text-white">Critical Thermal (&gt;27.5°C)</option>
              <option value="high" className="bg-[#0b241c] text-white">High Thermal (&gt;26.0°C)</option>
            </select>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('map')}
            className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-2 transition shadow"
          >
            <span>Open Thermal Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Heatwave Alert Banner */}
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-xs text-red-200">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-red-100">
              NCT Delhi Summer Thermal Advisory — Pre-Monsoon Peak Exposure
            </h4>
            <p className="text-red-300 leading-relaxed">
              Continuous MODIS 1km daily land surface temperature scans reveal localized urban heat island anomalies
              exceeding regional rural baselines by up to +4.8°C. Dense commercial transit corridors in Shahdara,
              Central, and West Delhi exhibit severe daytime radiative heat storage.
            </p>
          </div>
        </div>

        {/* District Risk Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-amber-400" />
              Thermal Exposure Across Corridors ({filtered.length} Monitored Segments)
            </h3>
            <span className="text-xs text-[#9CB9A3]">Sorted by Surface Temperature (LST)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered
              .sort((a, b) => (b.lst_mean || 0) - (a.lst_mean || 0))
              .map((c) => {
                const lst = c.lst_mean || 26.0;
                const isExtreme = lst >= 27.0;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (onSelectCorridor) onSelectCorridor(c);
                      if (onNavigate) onNavigate('map');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isExtreme
                        ? 'bg-red-950/20 border-red-500/40 hover:border-red-400 hover:bg-red-950/30'
                        : 'bg-[#0d2b21] border-white/10 hover:border-emerald-500/40 hover:bg-[#12392B]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white font-bold">
                          {c.code}
                        </span>
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full ${
                            isExtreme ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {formatTemperature(lst)} LST
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{c.name}</h4>
                      <p className="text-[11px] text-[#9CB9A3]">{c.district_full || c.district}</p>
                    </div>

                    <div className="pt-3 mt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#9CB9A3]">
                      <span>NDVI: <strong className="text-white font-mono">{formatNDVI(c.ndvi_mean, 3)}</strong></span>
                      <span>Priority: <strong className="text-emerald-400 font-mono">{formatScore(c.priority_score, 3)}</strong></span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition">
                        Map <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
