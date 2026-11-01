/**
 * MapExplorerView.jsx — Flagship Geographic Workspace.
 * 
 * Design:
 * - "The Map is the Hero": Large interactive Leaflet canvas occupying full workspace.
 * - Compact top utility controls: Corridor count, district selector, search, layer toggles.
 * - Collapsible left drawer for corridor list with severity indicators.
 * - Contextual right slide-out inspection drawer when a corridor is selected.
 * - Direct action link to jump to Decision Studio with selected corridor pre-loaded.
 */
import React, { useState } from 'react';
import {
  Map,
  Layers,
  Filter,
  X,
  Search,
  ChevronRight,
  Maximize2,
  ExternalLink,
  Thermometer,
  Trees,
  Wind,
  Calculator,
  Sliders,
  Sparkles,
} from 'lucide-react';
import InteractiveMap from '../components/InteractiveMap';
import LocationSearch from '../components/LocationSearch';
import CorridorAnalyticalDetail from '../components/CorridorAnalyticalDetail';
import InterventionPlannerPanel from '../components/InterventionPlannerPanel';

export default function MapExplorerView({
  corridors,
  districts,
  selectedDistrict,
  onSelectDistrict,
  selectedCorridor,
  onSelectCorridor,
  aqiStations,
  rasterZones,
  sensitivityData,
  activeScenario,
  onNavigate,
  onOpenPassport,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerTab, setDrawerTab] = useState('summary'); // 'summary' | 'interventions'
  const [targetLocation, setTargetLocation] = useState(null);

  const filteredCorridors = (corridors || []).filter((c) => {
    if (!c) return false;
    const matchesSearch =
      (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.code && c.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const activeSensitivityRow = sensitivityData?.corridors?.find(
    (c) => c.id === selectedCorridor?.id
  );

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-950 select-none">
      {/* Top Compact Map Utility Bar */}
      <header className="h-14 bg-[#071C16]/90 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between gap-3 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition ${
              isFilterOpen
                ? 'bg-emerald-600 border-emerald-400 text-white shadow'
                : 'bg-[#12392B]/60 border-white/10 text-slate-200 hover:bg-[#12392B]'
            }`}
            title="Toggle Corridor Filter Drawer"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Corridors ({filteredCorridors.length})</span>
          </button>
        </div>

        {/* Center / Right Quick Actions */}
        <div className="flex items-center gap-2">
          {/* Location Search Bar across Delhi */}
          <LocationSearch onLocationFound={(loc) => setTargetLocation(loc)} />

          {/* Quick Search */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search 44 corridors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-[#12392B]/50 border border-white/10 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400 w-40"
            />
          </div>

          {/* Quick link to Scenario Lab */}
          <button
            onClick={() => onNavigate('scenarios')}
            className="px-3 py-1.5 rounded-xl bg-[#12392B]/60 hover:bg-[#12392B] border border-white/10 text-xs text-slate-200 flex items-center gap-1.5 transition hidden lg:flex"
            title="Adjust scenario weights"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-300" />
            <span>Scenario Lab</span>
          </button>

          {/* Quick link to Decision Studio */}
          <button
            onClick={() => onNavigate('studio')}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Optimize Budget</span>
          </button>
        </div>
      </header>

      {/* Main Map Canvas Area */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        <InteractiveMap
          corridors={filteredCorridors}
          selectedCorridor={selectedCorridor}
          onSelectCorridor={onSelectCorridor}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={onSelectDistrict}
          aqiStations={aqiStations}
          rasterZones={rasterZones}
          targetLocation={targetLocation}
        />

        {/* Collapsible Left Filter Drawer */}
        {isFilterOpen && (
          <div className="absolute top-3 left-3 bottom-3 w-80 max-w-[calc(100vw-1.5rem)] bg-[#071C16]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-4 flex flex-col z-20 shadow-2xl transition-all">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trees className="w-4 h-4 text-emerald-400" />
                  Corridors ({filteredCorridors.length})
                </h3>
                <p className="text-[10px] text-[#9CB9A3]">Click any row to focus on map</p>
              </div>
              <button
                onClick={() => setIsFilterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mobile / In-drawer search */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Filter by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-[#12392B]/60 border border-white/10 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredCorridors.map((c) => {
                const isSelected = selectedCorridor?.id === c.id;
                return (
                  <div
                    key={c.id}
                    data-testid={`corridor-list-item-${c.id}`}
                    onClick={() => onSelectCorridor(c)}
                    className={`p-2.5 rounded-2xl border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'bg-[#00f5d4]/10 border-[#00f5d4] text-white shadow-[0_0_12px_rgba(0,245,212,0.15)] ring-1 ring-[#00f5d4]/50'
                        : 'bg-[#12392B]/40 border-white/5 hover:border-white/20 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-mono text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          isSelected
                            ? 'bg-[#00f5d4]/20 text-[#00f5d4] border-[#00f5d4]/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {c.code || `#${c.rank}`}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                        style={{
                          backgroundColor: `${c.severity_color || '#f97316'}25`,
                          color: c.severity_color || '#f97316',
                        }}
                      >
                        {c.severity}
                      </span>
                    </div>
                    <div className="font-bold text-white truncate">{c.name}</div>
                    <div className="text-[10px] text-[#9CB9A3] mt-0.5">
                      {c.district} • {c.length_km} km
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Contextual Right / Bottom Corridor Inspection Drawer */}
        {selectedCorridor && (
          <div className="absolute top-3 right-3 bottom-3 w-96 max-w-[calc(100vw-1.5rem)] bg-[#071C16]/95 backdrop-blur-xl border border-white/15 rounded-3xl p-4 flex flex-col z-20 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-white/10 mb-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {selectedCorridor.code || `#${selectedCorridor.rank}`}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: `${selectedCorridor.severity_color || '#f97316'}25`,
                      color: selectedCorridor.severity_color || '#f97316',
                    }}
                  >
                    {selectedCorridor.severity}
                  </span>
                </div>
                <h3 className="font-editorial text-base font-bold text-white mt-1 leading-tight">
                  {selectedCorridor.name}
                </h3>
                <div className="text-[11px] text-[#9CB9A3] mt-0.5">
                  {selectedCorridor.district} • {selectedCorridor.length_km} km
                </div>
              </div>

              <button
                onClick={() => onSelectCorridor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                title="Close inspection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs inside drawer */}
            <div className="grid grid-cols-2 gap-1 bg-[#12392B]/50 p-1 rounded-xl mb-3 border border-white/10 text-xs">
              <button
                onClick={() => setDrawerTab('summary')}
                className={`py-1 rounded-lg font-medium transition ${
                  drawerTab === 'summary' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300'
                }`}
              >
                Analytics &amp; Score
              </button>
              <button
                onClick={() => setDrawerTab('interventions')}
                className={`py-1 rounded-lg font-medium transition ${
                  drawerTab === 'interventions' ? 'bg-emerald-600 text-white shadow' : 'text-slate-300'
                }`}
              >
                Interventions (5)
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto pr-1">
              {drawerTab === 'summary' && (
                <CorridorAnalyticalDetail
                  corridor={selectedCorridor}
                  sensitivityRow={activeSensitivityRow}
                  activeScenario={activeScenario}
                  onOpenPassport={onOpenPassport}
                />
              )}
              {drawerTab === 'interventions' && (
                <InterventionPlannerPanel corridor={selectedCorridor} />
              )}
            </div>

            {/* Bottom Action: Optimize Budget in Decision Studio */}
            <div className="pt-3 border-t border-white/10 mt-2">
              <button
                onClick={() => onNavigate('studio')}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition"
              >
                <Calculator className="w-4 h-4" />
                <span>Optimize Interventions in Decision Studio</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
