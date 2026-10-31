import React, { useEffect, useState, useCallback } from 'react';
import {
  Trees,
  Thermometer,
  Wind,
  Database,
  Calculator,
  Wrench,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from './api/client';
import InteractiveMap from './components/InteractiveMap';
import PriorityRankingPanel from './components/PriorityRankingPanel';
import CorridorAnalyticalDetail from './components/CorridorAnalyticalDetail';
import InterventionPlannerPanel from './components/InterventionPlannerPanel';
import DataProvenanceModal from './components/DataProvenanceModal';

export default function App() {
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

  const [rightTab, setRightTab] = useState('analytics'); // 'analytics' | 'interventions' | 'districts'
  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false);
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
        if (mounted) setError(err.message || 'Failed to connect to VanSetu GreenTech API');
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

      const corrList = corrRes.features?.map((f) => ({
        ...f.properties,
        geometry: f.geometry,
      })) || [];

      setCorridors(corrList);
      if (corrRes.metadata?.districts_available?.length) {
        setDistricts(corrRes.metadata.districts_available);
      }
      setSensitivityData(sensRes);
      setDistrictsSummary(distSumRes.districts || []);

      // Keep selected corridor synchronized with updated scenario scores
      setSelectedCorridor((prev) => {
        if (!corrList.length) return null;
        if (prev) {
          const updated = corrList.find((c) => c.id === prev.id);
          if (updated) return updated;
        }
        return corrList[0];
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
                VanSetu <span className="text-emerald-400">GreenTech</span>
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                NCT Delhi Decision System v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Geospatial Climate Assessment • Explainable Corridor Prioritization • CPWD Intervention Planner
            </p>
          </div>
        </div>

        {/* City-Wide Telemetry Strip */}
        <div className="hidden xl:flex items-center gap-3 text-xs">
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1 flex items-center gap-2">
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

          <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1 flex items-center gap-2">
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

          <div className="bg-slate-950/90 border border-slate-800 rounded-lg px-3 py-1 flex items-center gap-2">
            <Wind className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none">
                CPCB Mean AQI (8 Stations)
              </span>
              <span className="font-mono font-bold text-amber-300">
                {aqiStats.mean_aqi || '237.6'}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  [{aqiStats.is_live ? 'Live API' : 'Historical Baseline'}]
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setProvenanceModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-emerald-300 flex items-center gap-1.5 transition shadow"
          >
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>Data Provenance &amp; Integrity</span>
          </button>
        </div>
      </header>

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

      {/* Main 3-Column Environmental Decision Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left Column: Corridor Priority Ranking & Scenario Controls (3 cols) */}
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

        {/* Center Column: Map-First Geospatial Canvas (5 cols) */}
        <div className="lg:col-span-5 h-full min-h-[360px] relative">
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

        {/* Right Column: Explainable Analytics, Scenarios & Intervention Planner (4 cols) */}
        <div className="lg:col-span-4 h-full min-h-0 bg-slate-900/95 border-l border-slate-800 flex flex-col overflow-hidden">
          {/* Selected Corridor Summary Header */}
          <div className="p-3.5 border-b border-slate-800 bg-slate-950/50 space-y-2.5">
            {selectedCorridor ? (
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/40">
                      Rank #{selectedCorridor.rank}
                    </span>
                    <h2 className="text-sm font-bold text-white truncate">
                      {selectedCorridor.name}
                    </h2>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedCorridor.district} • Highway:{' '}
                    <span className="uppercase font-mono text-slate-300">
                      {selectedCorridor.highway}
                    </span>{' '}
                    • Length: {selectedCorridor.length_km} km ({selectedCorridor.length_m} m)
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

            {/* Right Panel View Switcher Tabs */}
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

          {/* Right Panel Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-3.5">
            {rightTab === 'analytics' && (
              <CorridorAnalyticalDetail
                corridor={selectedCorridor}
                sensitivityRow={activeSensitivityRow}
                activeScenario={activeScenario}
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

                        <div className="grid grid-cols-4 gap-2 mt-2 text-[10px] bg-slate-900/90 p-1.5 rounded">
                          <div>
                            <span className="text-slate-400 block">Mean LST</span>
                            <span className="font-mono font-semibold text-orange-400">
                              {d.mean_lst_celsius}°C
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Mean NDVI</span>
                            <span className="font-mono font-semibold text-emerald-400">
                              {d.mean_ndvi}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Mean AQI</span>
                            <span className="font-mono font-semibold text-amber-300">
                              {d.mean_aqi}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Vulnerability</span>
                            <span className="font-mono font-semibold text-purple-300">
                              {d.vulnerability_index}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scientific Data Provenance & Integrity Modal */}
      <DataProvenanceModal
        open={provenanceModalOpen}
        onClose={() => setProvenanceModalOpen(false)}
        provenance={provenance}
        statsSummary={statsSummary}
      />
    </div>
  );
}
