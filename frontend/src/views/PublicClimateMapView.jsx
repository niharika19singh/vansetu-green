import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Trees,
  Thermometer,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Info,
  Droplets,
  Sun,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../api/client';
import InteractiveMap from '../components/InteractiveMap';

export const CANONICAL_DELHI_DISTRICTS = [
  'Central Delhi',
  'East Delhi',
  'New Delhi',
  'North Delhi',
  'North East Delhi',
  'North West Delhi',
  'Shahdara',
  'South Delhi',
  'South East Delhi',
  'South West Delhi',
  'West Delhi',
];

export function normalizeDistrict(d) {
  if (!d) return '';
  const s = String(d).trim().toLowerCase();
  if (s.includes('shahdara')) return 'Shahdara';
  if (s.includes('new delhi')) return 'New Delhi';
  if (s.includes('north east')) return 'North East Delhi';
  if (s.includes('north west')) return 'North West Delhi';
  if (s.includes('south east')) return 'South East Delhi';
  if (s.includes('south west')) return 'South West Delhi';
  if (s.includes('north')) return 'North Delhi';
  if (s.includes('south')) return 'South Delhi';
  if (s.includes('east')) return 'East Delhi';
  if (s.includes('west')) return 'West Delhi';
  if (s.includes('central')) return 'Central Delhi';
  return d;
}

export default function PublicClimateMapView({
  corridors = [],
  selectedCorridor,
  onSelectCorridor,
  onNavigate,
}) {
  const [district, setDistrict] = useState('All Districts');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'hottest', 'coolest'
  const [search, setSearch] = useState('');
  const [activeCorridor, setActiveCorridor] = useState(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [resizeTrigger, setResizeTrigger] = useState(0);

  const togglePanel = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev);
    setResizeTrigger((c) => c + 1);
  }, []);

  // Filter corridors for citizens
  const filteredCorridors = corridors.filter((c) => {
    const props = c.properties || c;
    const cDistrict = props.district || '';
    const cName = props.name || '';
    const cCode = props.code || props.id || '';

    if (district !== 'All Districts') {
      const normC = normalizeDistrict(cDistrict);
      const normD = normalizeDistrict(district);
      if (normC !== normD) {
        return false;
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const match = cName.toLowerCase().includes(q) || cCode.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filterMode === 'hottest') {
      const lst = props.lst_mean_celsius || props.surface_temp_celsius || 35;
      return lst >= 40.0;
    }

    if (filterMode === 'coolest') {
      const ndvi = props.ndvi_mean || props.vegetation_density || 0.2;
      return ndvi >= 0.35;
    }

    return true;
  });

  const displayCorridor = activeCorridor || selectedCorridor || filteredCorridors[0];

  return (
    <div className="h-full flex flex-col lg:flex-row bg-[#071C16] text-slate-100 overflow-hidden font-body relative">
      {/* Left Sidebar: Citizen Controls & Corridor Cards */}
      <div
        className={`${
          isPanelCollapsed
            ? 'hidden lg:hidden'
            : 'w-full lg:w-96 flex flex-col border-b lg:border-b-0 lg:border-r border-emerald-500/20 bg-[#0D2821] shrink-0 h-1/2 lg:h-full'
        } overflow-hidden transition-all duration-300 z-10`}
      >
        {/* Header */}
        <div className="p-4 border-b border-emerald-500/20 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-[10px] uppercase tracking-wider border border-teal-500/30">
                Citizen Map Guide
              </span>
              <h1 className="text-lg font-bold text-white mt-1">Explore Delhi Heat &amp; Shade</h1>
              <p className="text-xs text-slate-400">
                Discover street-level pedestrian heat risks and cool tree-covered corridors.
              </p>
            </div>
            <button
              onClick={togglePanel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-emerald-500/20 border border-emerald-500/30 transition shrink-0"
              title="Collapse explore panel"
              aria-label="Collapse explore panel"
            >
              <ChevronLeft className="w-4 h-4 text-emerald-400" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by street or road name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#071C16] border border-emerald-500/30 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* District & Heat Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">District:</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-[#071C16] border border-emerald-500/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="All Districts">All 11 Districts</option>
                {CANONICAL_DELHI_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Show Streets:</label>
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="w-full bg-[#071C16] border border-emerald-500/30 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
              >
                <option value="all">All Corridors (44)</option>
                <option value="hottest">Hottest Roads (Over 40°C)</option>
                <option value="coolest">Cool Shaded Roads</option>
              </select>
            </div>
          </div>
        </div>

        {/* Corridor List for Citizens */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          <div className="text-[11px] text-slate-400 px-1 flex items-center justify-between">
            <span className="font-medium text-emerald-300">
              Showing {filteredCorridors.length} corridors {district !== 'All Districts' ? `in ${district}` : 'in Delhi'}
            </span>
            <span className="text-[10px] text-slate-500">Click street to inspect</span>
          </div>

          {filteredCorridors.map((c) => {
            const props = c.properties || c;
            const code = props.code || props.id;
            const name = props.name || `Corridor ${code}`;
            const cDist = props.district || 'Delhi';
            const lst = props.lst_mean_celsius || props.surface_temp_celsius || 41.5;
            const ndvi = props.ndvi_mean || props.vegetation_density || 0.28;
            const isSelected = displayCorridor && (displayCorridor.code === code || displayCorridor.id === code);

            return (
              <button
                key={code}
                onClick={() => {
                  setActiveCorridor(c);
                  if (onSelectCorridor) onSelectCorridor(c);
                }}
                className={`w-full text-left p-3 rounded-xl border transition space-y-1.5 ${
                  isSelected
                    ? 'bg-teal-950/60 border-teal-400 shadow-lg'
                    : 'bg-[#071C16] border-emerald-500/15 hover:border-emerald-500/40 hover:bg-[#071C16]/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white truncate max-w-[180px]">
                    {name}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    lst >= 41.0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {lst.toFixed(1)}°C
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{cDist}</span>
                  <span>Tree Cover: {(ndvi * 100).toFixed(0)}%</span>
                </div>

                <div className="text-[10px] text-slate-400 leading-snug">
                  {lst >= 41.0
                    ? '⚠️ Unshaded asphalt road. Acute pedestrian heat exposure.'
                    : '🌿 Shaded pedestrian path with moderate canopy cover.'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Canvas: Interactive Map & Street Explainer Card */}
      <div className="flex-1 flex flex-col h-1/2 lg:h-full relative overflow-hidden">
        {/* Floating Reopen Button when left panel is collapsed */}
        {isPanelCollapsed && (
          <div className="absolute top-4 left-4 z-30 pointer-events-auto">
            <button
              onClick={togglePanel}
              className="px-3.5 py-2 rounded-xl bg-[#0D2821]/95 hover:bg-[#12392B] border border-emerald-500/40 text-white font-semibold text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all hover:border-emerald-400"
              title="Open Explore Delhi Heat & Shade panel"
            >
              <ChevronRight className="w-4 h-4 text-emerald-400" />
              <span>Explore Delhi Heat &amp; Shade</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                {filteredCorridors.length}
              </span>
            </button>
          </div>
        )}

        {/* Top Floating Status Pill */}
        <div
          className={`absolute ${
            isPanelCollapsed ? 'top-16 left-4' : 'top-4 left-4'
          } z-20 bg-[#0D2821]/95 backdrop-blur-md border border-emerald-500/30 rounded-xl px-4 py-2.5 shadow-xl max-w-md pointer-events-auto transition-all`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
            <span className="text-xs font-bold text-white">Public Heat Overlay Active</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Cyan highlighted line marks the selected pedestrian walking corridor.
          </p>
        </div>

        {/* Map View */}
        <div className="flex-1 w-full h-full">
          <InteractiveMap
            corridors={filteredCorridors}
            selectedCorridor={displayCorridor}
            hasRightDrawer={false}
            resizeTrigger={resizeTrigger}
            onSelectCorridor={(c) => {
              setActiveCorridor(c);
              if (onSelectCorridor) onSelectCorridor(c);
            }}
          />
        </div>

        {/* Bottom Inspection Drawer for Selected Corridor */}
        {displayCorridor && (
          <div className="bg-[#0D2821] border-t border-emerald-500/30 p-4 z-20 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                    {displayCorridor.properties?.code || displayCorridor.code || displayCorridor.id}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {displayCorridor.properties?.name || displayCorridor.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  District: <strong>{displayCorridor.properties?.district || displayCorridor.district}</strong> •
                  Length: <strong>{((displayCorridor.properties?.length_m || displayCorridor.length_m || 2000) / 1000).toFixed(1)} km</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate && onNavigate('public_report')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <span>Report Missing Trees</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onNavigate && onNavigate('public_heat')}
                  className="px-3 py-2 rounded-lg bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-xs text-slate-200 font-medium transition"
                >
                  <span>Heat Advisory</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
