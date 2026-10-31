/**
 * App.jsx — VanSetu GreenTech NCT Delhi v2.0 Architecture.
 * 
 * Multipage Architecture:
 * - Landing Page (Home): Minimal, uninterrupted nature hero (ZERO top buttons),
 *   locked living forest and water background, editorial headline, and clear "Explore Delhi Map" CTA.
 * - Map Explorer (Flagship Experience): Full-screen geographic workspace, compact controls,
 *   collapsible filters, contextual corridor inspection drawer.
 * - Corridors: 44 Corridors comparative analytics and severity inspection.
 * - Canopy & Hydrology: NASA MODIS LST, ESA Sentinel NDVI, evaporative cooling analysis.
 * - Scenario Lab: 5 Municipal policy scenarios, What-If heat sensitivity slider.
 * - Decision Studio: MILP budget solver, IOMETE procurement studio, Gemini 3.8 Flash AI co-pilot.
 * - Intelligence & Records: Meko institutional memory (MEKO: ON/OFF), Tiger Data, cryptographic provenance.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Trees,
  Map,
  Sliders,
  Calculator,
  ShoppingBag,
  Sparkles,
  Brain,
  Clock,
  Users,
  LayoutDashboard,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from './api/client';
import AppSidebar, { APP_NAV_ITEMS } from './components/AppSidebar';
import LandingPageView from './views/LandingPageView';
import MapExplorerView from './views/MapExplorerView';
import CorridorsView from './views/CorridorsView';
import CanopyHydrologyView from './views/CanopyHydrologyView';
import ScenarioLabView from './views/ScenarioLabView';
import DecisionStudioView from './views/DecisionStudioView';
import RecordsView from './views/RecordsView';
import DataProvenanceModal from './components/DataProvenanceModal';
import LivingForestExperience from './forest/LivingForestExperience';
import { forestAudio } from './forest/forestAudio';

export const NAV_VIEWS = [
  { id: 'canopy', label: '1. Climate Overview', icon: LayoutDashboard },
  { id: 'map', label: '2. Interactive Map', icon: Map },
  { id: 'corridors', label: '3. Corridor Intelligence', icon: Trees },
  { id: 'scenarios', label: '4. Scenario Lab', icon: Sliders },
  { id: 'studio-optimizer', label: '5. Intervention Optimizer', icon: Calculator },
  { id: 'studio-procurement', label: '6. Climate Procurement Studio', icon: ShoppingBag },
  { id: 'studio-agent', label: '7. AI Planning Assistant', icon: Sparkles },
  { id: 'records-meko', label: '8. Institutional Memory (Meko)', icon: Brain },
  { id: 'records-temporal', label: '9. Temporal Insights (Tiger Data)', icon: Clock },
  { id: 'records-provenance', label: '10. Evidence & Data Provenance', icon: Users },
];

export default function App() {
  // Navigation: 'home' | 'map' | 'corridors' | 'canopy' | 'scenarios' | 'studio' | 'records'
  const [activePage, setActivePage] = useState('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Audio & Modals
  const [isMuted, setIsMuted] = useState(true);
  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false);

  // Institutional Memory
  const [mekoEnabled, setMekoEnabled] = useState(true);

  // Application Data States
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial static metadata
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

  // Load corridor prioritization data
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

  const toggleSound = () => {
    const unmuted = forestAudio.toggleMute();
    setIsMuted(!unmuted);
  };

  const handleNavigate = (page) => {
    setActivePage(page);
    // On Map page, default to collapsed sidebar for maximum map real estate
    if (page === 'map') {
      setSidebarCollapsed(true);
    }
  };

  return (
    <div className="isolate relative w-screen h-screen overflow-hidden bg-[#071C16] text-[#F3F1E7] font-body selection:bg-emerald-600/30 selection:text-emerald-100">
      {/* =========================================================================
          DESTINATION 1: LANDING PAGE (Clean, Uninterrupted, ZERO top buttons)
          ========================================================================= */}
      {activePage === 'home' ? (
        <div className="w-full h-full overflow-y-auto">
          <LandingPageView
            onNavigate={handleNavigate}
            statsSummary={statsSummary}
          />
        </div>
      ) : (
        /* =========================================================================
            DESTINATIONS 2-7: FUNCTIONAL APPLICATION PAGES WITH SLEEK SIDEBAR
            ========================================================================= */
        <div className="w-full h-full flex overflow-hidden">
          {/* Collapsible Application Sidebar */}
          <AppSidebar
            activePage={activePage}
            onNavigate={handleNavigate}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            mekoEnabled={mekoEnabled}
            onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
            isMuted={isMuted}
            onToggleSound={toggleSound}
          />

          {/* Main Page Workspace */}
          <main className="flex-1 h-full overflow-hidden relative">
            {/* Error Notification Bar */}
            {error && (
              <div className="absolute top-2 left-4 right-4 z-50 bg-rose-950/90 border border-rose-500/40 rounded-xl px-4 py-2 text-xs text-rose-200 flex items-center justify-between shadow-xl">
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

            {/* Page 2: Flagship Map Explorer */}
            {activePage === 'map' && (
              <MapExplorerView
                corridors={corridors}
                districts={districts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                selectedCorridor={selectedCorridor}
                onSelectCorridor={setSelectedCorridor}
                aqiStations={aqiStations}
                rasterZones={rasterZones}
                sensitivityData={sensitivityData}
                activeScenario={activeScenario}
                onNavigate={handleNavigate}
              />
            )}

            {/* Page 3: Corridor Intelligence & Comparison */}
            {activePage === 'corridors' && (
              <CorridorsView
                corridors={corridors}
                districts={districts}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                selectedCorridor={selectedCorridor}
                onSelectCorridor={setSelectedCorridor}
                activeScenario={activeScenario}
                onSelectScenario={setActiveScenario}
                whatIfHeatWeight={whatIfHeatWeight}
                onChangeWhatIfHeatWeight={setWhatIfHeatWeight}
                sensitivityData={sensitivityData}
                onNavigate={handleNavigate}
              />
            )}

            {/* Page 4: Canopy & Hydrology */}
            {activePage === 'canopy' && (
              <CanopyHydrologyView
                statsSummary={statsSummary}
                districtsSummary={districtsSummary}
                selectedDistrict={selectedDistrict}
                onSelectDistrict={setSelectedDistrict}
                onNavigate={handleNavigate}
              />
            )}

            {/* Page 5: Scenario Lab */}
            {activePage === 'scenarios' && (
              <ScenarioLabView
                activeScenario={activeScenario}
                onSelectScenario={setActiveScenario}
                whatIfHeatWeight={whatIfHeatWeight}
                onChangeWhatIfHeatWeight={setWhatIfHeatWeight}
                sensitivityData={sensitivityData}
                onNavigate={handleNavigate}
              />
            )}

            {/* Page 6: Decision Studio */}
            {activePage === 'studio' && (
              <DecisionStudioView
                selectedCorridor={selectedCorridor}
                corridors={corridors}
                onSelectCorridor={setSelectedCorridor}
                mekoEnabled={mekoEnabled}
                onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
              />
            )}

            {/* Page 7: Intelligence & Records */}
            {activePage === 'records' && (
              <RecordsView
                selectedCorridor={selectedCorridor}
                mekoEnabled={mekoEnabled}
                onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                provenance={provenance}
                statsSummary={statsSummary}
                onOpenProvenanceModal={() => setProvenanceModalOpen(true)}
              />
            )}
          </main>
        </div>
      )}

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
