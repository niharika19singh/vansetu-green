/**
 * CorridorsView.jsx — 44 Prioritized Corridors Intelligence & Comparison Workspace.
 * Features:
 * - Comprehensive listing of 44 verified corridors with search, district filter, and severity tags.
 * - Side-by-side priority ranking and detailed analytical telemetry inspection.
 * - One-click "View on Map" navigation and "Optimize Budget" transfer.
 */
import React, { useState } from 'react';
import {
  Trees,
  Search,
  Filter,
  MapPin,
  Map,
  ArrowRight,
  Calculator,
  BarChart3,
  Wrench,
} from 'lucide-react';
import PriorityRankingPanel from '../components/PriorityRankingPanel';
import CorridorAnalyticalDetail from '../components/CorridorAnalyticalDetail';
import InterventionPlannerPanel from '../components/InterventionPlannerPanel';

export default function CorridorsView({
  corridors,
  districts,
  selectedDistrict,
  onSelectDistrict,
  selectedCorridor,
  onSelectCorridor,
  activeScenario,
  onSelectScenario,
  whatIfHeatWeight,
  onChangeWhatIfHeatWeight,
  sensitivityData,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'interventions'

  const activeSensitivityRow = sensitivityData?.corridors?.find(
    (c) => c.id === selectedCorridor?.id
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#071C16]/95 backdrop-blur-md">
        <div>
          <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <Trees className="w-5 h-5 text-emerald-400" />
            44 Corridors Intelligence &amp; Prioritization
          </h2>
          <p className="text-xs text-[#9CB9A3]">
            Verified NCT Delhi transit corridors evaluated across thermal, vegetation, and transit criteria
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('map')}
            className="px-4 py-2 rounded-xl bg-[#12392B] hover:bg-[#12392B]/80 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 transition"
          >
            <Map className="w-4 h-4 text-emerald-300" />
            <span>Open in Map Explorer</span>
          </button>

          <button
            onClick={() => onNavigate('studio')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow transition"
          >
            <Calculator className="w-4 h-4" />
            <span>Optimize Budget</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column Analytical Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
        {/* Left Column: Corridor Priority Ranking List */}
        <div className="lg:col-span-5 h-full overflow-hidden border-r border-white/10">
          <PriorityRankingPanel
            corridors={corridors}
            districts={districts}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={onSelectDistrict}
            activeScenario={activeScenario}
            onSelectScenario={onSelectScenario}
            whatIfHeatWeight={whatIfHeatWeight}
            onChangeWhatIfHeatWeight={onChangeWhatIfHeatWeight}
            selectedCorridor={selectedCorridor}
            onSelectCorridor={onSelectCorridor}
          />
        </div>

        {/* Right Column: Detailed Corridor Analytics & Interventions */}
        <div className="lg:col-span-7 h-full flex flex-col overflow-hidden bg-[#071C16]/60">
          {selectedCorridor ? (
            <>
              {/* Corridor Summary Card */}
              <div className="p-5 border-b border-white/10 bg-[#12392B]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                      {selectedCorridor.code || `#${selectedCorridor.rank}`}
                    </span>
                    <h3 className="font-editorial text-lg font-bold text-white">
                      {selectedCorridor.name}
                    </h3>
                  </div>
                  <div className="text-xs text-[#9CB9A3] mt-1">
                    {selectedCorridor.district} • Highway: {selectedCorridor.highway} • Length: {selectedCorridor.length_km} km
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded text-xs font-bold"
                    style={{
                      backgroundColor: `${selectedCorridor.severity_color || '#f97316'}25`,
                      color: selectedCorridor.severity_color || '#f97316',
                      border: `1px solid ${selectedCorridor.severity_color || '#f97316'}50`,
                    }}
                  >
                    {selectedCorridor.severity} Severity
                  </span>

                  <button
                    onClick={() => onNavigate('map')}
                    className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 hover:text-white hover:bg-emerald-800 transition"
                    title="View on Map"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-tabs: Analytics vs Interventions */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10 bg-[#071C16]/80 text-xs">
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                    activeTab === 'analytics'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Score Breakdown &amp; Sensitivity</span>
                </button>

                <button
                  onClick={() => setActiveTab('interventions')}
                  className={`px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                    activeTab === 'interventions'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>5 Intervention Typologies</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {activeTab === 'analytics' && (
                  <CorridorAnalyticalDetail
                    corridor={selectedCorridor}
                    sensitivityRow={activeSensitivityRow}
                    activeScenario={activeScenario}
                  />
                )}
                {activeTab === 'interventions' && (
                  <InterventionPlannerPanel corridor={selectedCorridor} />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Trees className="w-12 h-12 text-slate-600 mb-3" />
              <div className="text-sm font-semibold text-white">Select a corridor from the list</div>
              <p className="text-xs text-[#9CB9A3] mt-1 max-w-sm">
                Click any corridor on the left to inspect its thermal anomaly scores, canopy deficit, and
                recommended interventions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
