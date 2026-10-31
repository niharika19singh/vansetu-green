import React, { useEffect, useState, useCallback } from 'react';
import {
  Trees,
  Thermometer,
  Wind,
  Database,
  Calculator,
  Wrench,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Map,
  Sliders,
  ShoppingBag,
  Sparkles,
  Brain,
  Clock,
  Users,
  LayoutDashboard,
  FolderKanban,
  Sun,
  Activity,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { api } from './api/client';
import InteractiveMap from './components/InteractiveMap';
import PriorityRankingPanel from './components/PriorityRankingPanel';
import CorridorAnalyticalDetail from './components/CorridorAnalyticalDetail';
import InterventionPlannerPanel from './components/InterventionPlannerPanel';
import DataProvenanceModal from './components/DataProvenanceModal';
import InterventionOptimizerView from './components/InterventionOptimizerView';
import ProcurementStudioView from './components/ProcurementStudioView';
import AiPlanningAssistantView from './components/AiPlanningAssistantView';
import MekoMemoryStudioView from './components/MekoMemoryStudioView';
import TemporalInsightsView from './components/TemporalInsightsView';
import EquityAndProvenanceView from './components/EquityAndProvenanceView';
import CorridorEvidencePassportModal from './components/CorridorEvidencePassportModal';
import SegmentSuitabilityView from './components/SegmentSuitabilityView';
import ParetoPortfolioLabView from './components/ParetoPortfolioLabView';
import ShadeContinuityView from './components/ShadeContinuityView';
import SeasonalHeatIntelligenceView from './components/SeasonalHeatIntelligenceView';
import ImpactMonitoringView from './components/ImpactMonitoringView';
import SpatialMemoryMapView from './components/SpatialMemoryMapView';
import ProjectReadinessView from './components/ProjectReadinessView';

const NAV_VIEWS = [
  { id: 'overview', label: '1. Climate Overview', icon: LayoutDashboard },
  { id: 'map', label: '2. Interactive Map', icon: Map },
  { id: 'corridors', label: '3. Corridor Intelligence', icon: Trees },
  { id: 'scenarios', label: '4. Scenario Lab', icon: Sliders },
  { id: 'optimizer', label: '5. Intervention Optimizer', icon: Calculator },
  { id: 'procurement', label: '6. Climate Procurement Studio', icon: ShoppingBag },
  { id: 'agent', label: '7. AI Planning Assistant', icon: Sparkles },
  { id: 'meko', label: '8. Institutional Memory (Meko)', icon: Brain },
  { id: 'temporal', label: '9. Temporal Insights (Tiger Data)', icon: Clock },
  { id: 'provenance', label: '10. Evidence & Data Provenance', icon: Users },
  { id: 'suitability', label: '11. Right Tree, Right Place', icon: Compass },
  { id: 'pareto', label: '12. Pareto Portfolio Lab', icon: Calculator },
  { id: 'shade', label: '13. Pedestrian Shade Continuity', icon: Sun },
  { id: 'seasonal', label: '14. Seasonal Heat Intelligence', icon: Thermometer },
  { id: 'impact', label: '15. Impact Monitoring', icon: Activity },
  { id: 'spatial_memory', label: '16. Spatial Memory Map', icon: Brain },
  { id: 'readiness', label: '17. Project Readiness (WP 1-8)', icon: FolderKanban },
];

export default function App() {
  const [activeView, setActiveView] = useState('overview');
  const [mekoEnabled, setMekoEnabled] = useState(true);

  const [corridors, setCorridors] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [activeScenario, setActiveScenario] = useState('baseline');
  const [whatIfHeatWeight, setWhatIfHeatWeight] = useState(null);
  const [selectedCorridor, setSelectedCorridor] = useState(null);

  const [sensitivityData, setSensitivityData] = useState(null);
  const [districtsSummary, setDistrictsSummary] = useState([]);
  const [aqiStations, setAqiStations] = useState([]);
  const [rasterZones, setRasterZones] = useState(null);
  const [statsSummary, setStatsSummary] = useState(null);
  const [provenance, setProvenance] = useState(null);

  const [rightTab, setRightTab] = useState('analytics');
  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [passportCorridorId, setPassportCorridorId] = useState('C-14');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial static metadata fetch
  useEffect(() => {
    let mounted = true;
    async function loadInitialMetadata() {
      try {
        const [statsRes, provRes, aqiRes, zonesRes] = await Promise.all([
          api.getStatsSummary(),
          api.getProvenance(),
          api.getAqiStations(),
          api.getRasterZones(85.0),
        ]);
        if (!mounted) return;
        setStatsSummary(statsRes);
        setProvenance(provRes);
        setAqiStations(aqiRes.features || []);
        setRasterZones(zonesRes);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to connect to VanSetu API');
      }
    }
    loadInitialMetadata();
    return () => {
      mounted = false;
    };
  }, []);

  // Load corridors & sensitivity whenever scenario, district, or What-If slider changes
  const loadCorridorData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [corrRes, sensRes, distSumRes] = await Promise.all([
        api.getCorridors({
          district: selectedDistrict,
          scenario: activeScenario,
          heatWeight: whatIfHeatWeight,
        }),
        api.getSensitivityAnalysis(activeScenario, selectedDistrict),
        api.getDistrictsSummary(activeScenario),
      ]);

      const corrList =
        corrRes.features?.map((f) => ({
          ...f.properties,
          geometry: f.geometry,
        })) || [];

      setCorridors(corrList);
      if (corrRes.metadata?.districts_available?.length) {
        setDistricts(corrRes.metadata.districts_available);
      }
      setSensitivityData(sensRes);
      setDistrictsSummary(distSumRes.districts || []);

      setSelectedCorridor((prev) => {
        if (!corrList.length) return null;
        if (prev) {
          const updated = corrList.find((c) => c.id === prev.id);
          if (updated) return updated;
        }
        // Default to C-14 if available for instant demo readiness, else top corridor
        return corrList.find((c) => c.code === 'C-14') || corrList[0];
      });
    } catch (err) {
      setError(err.message || 'Error loading corridor prioritization data');
    } finally {
      setLoading(false);
    }
  }, [selectedDistrict, activeScenario, whatIfHeatWeight]);

  useEffect(() => {
    loadCorridorData();
  }, [loadCorridorData]);

  const activeSensitivityRow = sensitivityData?.corridors?.find(
    (c) => c.id === selectedCorridor?.id
  );

  const lstStats = statsSummary?.raster?.lst || {};
  const ndviStats = statsSummary?.raster?.ndvi || {};
  const aqiStats = statsSummary?.aqi || {};

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Decision-Support Header */}
      <header className="h-14 shrink-0 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-inner">
            <Trees className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-white">
                VanSetu <span className="text-emerald-400">— Urban Climate Action Intelligence</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                NCT Delhi v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Geospatial Climate Intelligence • Meko Persistent Memory • MILP Budget Optimizer • Gemini 3.8 Flash • Tiger Data • IOMETE Studio
            </p>
          </div>
        </div>

        {/* City-Wide Telemetry Strip */}
        <div className="hidden 2xl:flex items-center gap-2.5 text-xs">
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">
                MODIS LST (1km Native)
              </span>
              <span className="font-mono font-bold text-slate-100">
                {lstStats.mean ? `${lstStats.mean.toFixed(1)}°C` : '25.8°C'}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  (57×79 → 10m Display)
                </span>
              </span>
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Trees className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">
                Sentinel-2 NDVI (10m Native)
              </span>
              <span className="font-mono font-bold text-slate-100">
                {ndviStats.mean ? ndviStats.mean.toFixed(3) : '0.310'}{' '}
                <span className="text-[10px] text-slate-400 font-normal">(5572×7794)</span>
              </span>
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center gap-2">
            <Wind className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">
                CPCB Mean AQI
              </span>
              <span className="font-mono font-bold text-amber-300">
                {aqiStats.mean_aqi || '237.6'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls: Visible MEKO ON/OFF Switch + Provenance Modal */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMekoEnabled(!mekoEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
              mekoEnabled
                ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300'
                : 'bg-rose-900/40 border-rose-500/50 text-rose-300'
            }`}
            title="Toggle YugabyteDB / Meko Persistent Institutional Memory"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{mekoEnabled ? 'MEKO: ON' : 'MEKO: OFF'}</span>
          </button>

          <button
            onClick={() => {
              setPassportCorridorId(selectedCorridor?.code || selectedCorridor?.id || 'C-14');
              setPassportOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition shadow"
            title="Open Corridor Evidence Passport (v2.0)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Evidence Passport</span>
          </button>

          <button
            onClick={() => setProvenanceModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-300 flex items-center gap-1.5 transition shadow"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Provenance</span>
          </button>
        </div>
      </header>

      {/* 10-View Cohesive Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0 z-10">
        {NAV_VIEWS.map((view) => {
          const IconComponent = view.icon;
          const isActive = activeView === view.id;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 transition ${
                isActive
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5" />
              <span>{view.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Error Banner if API unreachable */}
      {error && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadCorridorData}
            className="px-2 py-0.5 rounded bg-rose-800/60 hover:bg-rose-700 text-rose-100 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Main Workspace Area Switched by Active View */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Views 1, 2, 3, 4: Map-First & Analytical Views */}
        {(activeView === 'overview' ||
          activeView === 'map' ||
          activeView === 'corridors' ||
          activeView === 'scenarios') && (
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
            {/* Left Column: Corridor Priority Ranking & Scenario Controls */}
            {activeView !== 'map' && (
              <div className="lg:col-span-3 h-full min-h-0 overflow-hidden">
                <PriorityRankingPanel
                  corridors={corridors}
                  districts={districts}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={setSelectedDistrict}
                  activeScenario={activeScenario}
                  onSelectScenario={setActiveScenario}
                  whatIfHeatWeight={whatIfHeatWeight}
                  onChangeWhatIfHeatWeight={setWhatIfHeatWeight}
                  selectedCorridor={selectedCorridor}
                  onSelectCorridor={setSelectedCorridor}
                />
              </div>
            )}

            {/* Center Column: Map-First Geospatial Canvas */}
            <div
              className={`${
                activeView === 'map' ? 'lg:col-span-12' : 'lg:col-span-5'
              } h-full min-h-[360px] relative`}
            >
              <InteractiveMap
                corridors={corridors}
                selectedCorridor={selectedCorridor}
                onSelectCorridor={setSelectedCorridor}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                aqiStations={aqiStations}
                rasterZones={rasterZones}
              />
            </div>

            {/* Right Column: Explainable Analytics, Scenarios & Intervention Planner */}
            {activeView !== 'map' && (
              <div className="lg:col-span-4 h-full min-h-0 bg-slate-900/95 border-l border-slate-800 flex flex-col overflow-hidden">
                <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 space-y-2.5">
                  {selectedCorridor ? (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                            {selectedCorridor.code || `#${selectedCorridor.rank}`}
                          </span>
                          <h2 className="text-sm font-bold text-white truncate">
                            {selectedCorridor.name}
                          </h2>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {selectedCorridor.district} ({selectedCorridor.ward_id}) • Highway:{' '}
                          <span className="uppercase font-mono text-slate-300">
                            {selectedCorridor.highway}
                          </span>{' '}
                          • Length: {selectedCorridor.length_km} km
                        </div>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded text-[10px] font-bold shrink-0"
                        style={{
                          backgroundColor: `${selectedCorridor.severity_color || '#f97316'}22`,
                          color: selectedCorridor.severity_color || '#f97316',
                          border: `1px solid ${selectedCorridor.severity_color || '#f97316'}55`,
                        }}
                      >
                        {selectedCorridor.severity}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      {loading ? 'Loading corridor intelligence...' : 'Select a corridor to inspect'}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setRightTab('analytics')}
                      className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                        rightTab === 'analytics'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Score &amp; Scenarios</span>
                    </button>

                    <button
                      onClick={() => setRightTab('interventions')}
                      className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                        rightTab === 'interventions'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>Interventions (5)</span>
                    </button>

                    <button
                      onClick={() => setRightTab('districts')}
                      className={`py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                        rightTab === 'districts'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span>Districts (11)</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3.5">
                  {rightTab === 'analytics' && (
                    <CorridorAnalyticalDetail
                      corridor={selectedCorridor}
                      sensitivityRow={activeSensitivityRow}
                      activeScenario={activeScenario}
                      onOpenPassport={(cid) => {
                        setPassportCorridorId(cid);
                        setPassportOpen(true);
                      }}
                    />
                  )}

                  {rightTab === 'interventions' && (
                    <InterventionPlannerPanel corridor={selectedCorridor} />
                  )}

                  {rightTab === 'districts' && (
                    <div className="space-y-3 text-xs">
                      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3">
                        <div className="font-bold text-slate-100">
                          NCT Delhi District Climate &amp; Vulnerability Matrix
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Click any district row to filter corridors on the map and ranking panel.
                        </p>
                      </div>

                      <div className="space-y-2">
                        {districtsSummary.map((d) => {
                          const isSelected =
                            selectedDistrict !== 'All Districts' &&
                            selectedDistrict.toLowerCase() === d.district.toLowerCase();
                          return (
                            <div
                              key={d.district}
                              onClick={() =>
                                setSelectedDistrict(isSelected ? 'All Districts' : d.district)
                              }
                              className={`p-3 rounded-lg border cursor-pointer transition ${
                                isSelected
                                  ? 'bg-emerald-950/40 border-emerald-500'
                                  : 'bg-slate-950/80 border-slate-800 hover:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-slate-100">{d.district}</span>
                                  <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {d.corridor_count} Corridors ({d.total_corridor_length_km} km)
                                  </span>
                                </div>
                                <span className="font-mono font-bold text-emerald-400">
                                  Mean Score: {d.mean_priority_score?.toFixed(3)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feature 2: Right Tree, Right Place (Segment Suitability & Species) */}
        {activeView === 'suitability' && (
          <SegmentSuitabilityView selectedCorridor={selectedCorridor} />
        )}

        {/* Feature 4: Pedestrian Shade Continuity Analyser */}
        {activeView === 'shade' && (
          <ShadeContinuityView selectedCorridor={selectedCorridor} />
        )}

        {/* Feature 5: Seasonal Urban Heat Intelligence */}
        {activeView === 'seasonal' && (
          <SeasonalHeatIntelligenceView selectedCorridor={selectedCorridor} />
        )}

        {/* Feature 3: Pareto Portfolio Lab */}
        {activeView === 'pareto' && (
          <ParetoPortfolioLabView
            onSelectPortfolioForImplementation={(portfolio) => {
              setActiveView('readiness');
            }}
          />
        )}

        {/* Feature 8: Climate Project Implementation & Readiness Planner */}
        {activeView === 'readiness' && (
          <ProjectReadinessView
            onNavigateToProcurement={() => setActiveView('procurement')}
          />
        )}

        {/* Feature 6: Climate Intervention Impact Monitoring */}
        {activeView === 'impact' && <ImpactMonitoringView />}

        {/* Feature 7: Spatial Institutional Memory Map (Meko) */}
        {activeView === 'spatial_memory' && (
          <SpatialMemoryMapView selectedCorridor={selectedCorridor} />
        )}

        {/* Single-Objective MILP Optimizer */}
        {activeView === 'optimizer' && (
          <InterventionOptimizerView
            selectedCorridor={selectedCorridor}
            mekoEnabled={mekoEnabled}
            onToggleMeko={setMekoEnabled}
          />
        )}

        {/* View 6: Climate Procurement Studio (IOMETE) */}
        {activeView === 'procurement' && (
          <ProcurementStudioView
            selectedCorridor={selectedCorridor}
            mekoEnabled={mekoEnabled}
            onToggleMeko={setMekoEnabled}
          />
        )}

        {/* View 7: AI Planning Assistant (Google Gemini 3.8 Flash) */}
        {activeView === 'agent' && (
          <AiPlanningAssistantView
            selectedCorridor={selectedCorridor}
            mekoEnabled={mekoEnabled}
            onToggleMeko={setMekoEnabled}
          />
        )}

        {/* View 8: Institutional Memory (Meko) */}
        {activeView === 'meko' && (
          <MekoMemoryStudioView
            mekoEnabled={mekoEnabled}
            onToggleMeko={setMekoEnabled}
          />
        )}

        {/* View 9: Temporal Insights (Tiger Data / TimescaleDB) */}
        {activeView === 'temporal' && (
          <TemporalInsightsView selectedCorridor={selectedCorridor} />
        )}

        {/* View 10: Evidence, Social Equity & Data Provenance */}
        {activeView === 'provenance' && (
          <EquityAndProvenanceView
            provenance={provenance}
            statsSummary={statsSummary}
          />
        )}
      </div>

      {/* Scientific Data Provenance & Integrity Modal */}
      <DataProvenanceModal
        open={provenanceModalOpen}
        onClose={() => setProvenanceModalOpen(false)}
        provenance={provenance}
        statsSummary={statsSummary}
      />

      {/* Corridor Evidence Passport Modal (Feature 1) */}
      <CorridorEvidencePassportModal
        open={passportOpen}
        onClose={() => setPassportOpen(false)}
        corridorId={passportCorridorId || selectedCorridor?.code || selectedCorridor?.id || 'C-14'}
      />
    </div>
  );
}
