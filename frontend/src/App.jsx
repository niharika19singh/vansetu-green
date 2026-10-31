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
  Cpu,
  Building2,
  Briefcase,
  Globe2,
  FileText,
  HeartPulse,
  Award,
  Layers,
  Lock,
  Home,
} from 'lucide-react';
import { api } from './api/client';
import { forestAudio } from './forest/forestAudio';

// Core and Navigation Components
import AppSidebar from './components/AppSidebar';
import InteractiveMap from './components/InteractiveMap';
import PriorityRankingPanel from './components/PriorityRankingPanel';
import CorridorAnalyticalDetail from './components/CorridorAnalyticalDetail';
import InterventionPlannerPanel from './components/InterventionPlannerPanel';

// Lazy-loaded Views and Modals for Optimal Code Splitting
const RoleHeader = React.lazy(() => import('./components/RoleHeader'));
const AccessDeniedView = React.lazy(() => import('./components/AccessDeniedView'));
const LandingPageView = React.lazy(() => import('./views/LandingPageView'));

// Kunal Map-First Unified Views
const MapExplorerView = React.lazy(() => import('./views/MapExplorerView'));
const CorridorsView = React.lazy(() => import('./views/CorridorsView'));
const CanopyHydrologyView = React.lazy(() => import('./views/CanopyHydrologyView'));
const ScenarioLabView = React.lazy(() => import('./views/ScenarioLabView'));
const DecisionStudioView = React.lazy(() => import('./views/DecisionStudioView'));
const RecordsView = React.lazy(() => import('./views/RecordsView'));

// Niharika Government Institutional Workspaces
const GovernmentOverviewView = React.lazy(() => import('./components/GovernmentOverviewView'));
const CorridorInventoryView = React.lazy(() => import('./components/CorridorInventoryView'));
const TenderManagementView = React.lazy(() => import('./components/TenderManagementView'));
const ProfessionalAssignmentsView = React.lazy(() => import('./components/ProfessionalAssignmentsView'));
const CorridorCostOptimizerView = React.lazy(() => import('./components/CorridorCostOptimizerView'));
const RegionalHealthIntelligenceView = React.lazy(() => import('./components/RegionalHealthIntelligenceView'));
const HospitalDataSourcesView = React.lazy(() => import('./components/HospitalDataSourcesView'));
const GovernmentAuditView = React.lazy(() => import('./components/GovernmentAuditView'));

// Niharika Pro Professional Workspaces
const ProDashboardView = React.lazy(() => import('./components/ProDashboardView'));
const TenderMarketplaceView = React.lazy(() => import('./components/TenderMarketplaceView'));
const MyProposalsView = React.lazy(() => import('./components/MyProposalsView'));
const MyAssignedProjectsView = React.lazy(() => import('./components/MyAssignedProjectsView'));

// Niharika Public Citizen Workspaces
const PublicDashboardView = React.lazy(() => import('./components/PublicDashboardView'));
const PublicProjectsView = React.lazy(() => import('./components/PublicProjectsView'));

// Specialized Analytical Modules & Modals
const DataProvenanceModal = React.lazy(() => import('./components/DataProvenanceModal'));
const InterventionOptimizerView = React.lazy(() => import('./components/InterventionOptimizerView'));
const ProcurementStudioView = React.lazy(() => import('./components/ProcurementStudioView'));
const AiPlanningAssistantView = React.lazy(() => import('./components/AiPlanningAssistantView'));
const MekoMemoryStudioView = React.lazy(() => import('./components/MekoMemoryStudioView'));
const TemporalInsightsView = React.lazy(() => import('./components/TemporalInsightsView'));
const EquityAndProvenanceView = React.lazy(() => import('./components/EquityAndProvenanceView'));
const CorridorEvidencePassportModal = React.lazy(() => import('./components/CorridorEvidencePassportModal'));
const SegmentSuitabilityView = React.lazy(() => import('./components/SegmentSuitabilityView'));
const ParetoPortfolioLabView = React.lazy(() => import('./components/ParetoPortfolioLabView'));
const ShadeContinuityView = React.lazy(() => import('./components/ShadeContinuityView'));
const SeasonalHeatIntelligenceView = React.lazy(() => import('./components/SeasonalHeatIntelligenceView'));
const ImpactMonitoringView = React.lazy(() => import('./components/ImpactMonitoringView'));
const SpatialMemoryMapView = React.lazy(() => import('./components/SpatialMemoryMapView'));
const ProjectReadinessView = React.lazy(() => import('./components/ProjectReadinessView'));
const InterventionIntelligenceView = React.lazy(() => import('./components/InterventionIntelligenceView'));

function ViewLoadingFallback() {
  return (
    <div className="h-full flex items-center justify-center p-8 bg-slate-950 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono">Loading module...</span>
      </div>
    </div>
  );
}

// Role-Tailored Primary Views (Retained for Test Compliance and Navigation Context)
export const GOVT_NAV_VIEWS = [
  { id: 'govt_overview', label: 'Govt Overview', icon: Building2 },
  { id: 'corridor_inventory', label: 'Corridor Inventory', icon: Layers },
  { id: 'tender_management', label: 'Tender Administration', icon: FileText },
  { id: 'professional_assignments', label: 'Professional Directory', icon: Briefcase },
  { id: 'corridor_cost_approval', label: 'Cost & Budget Sanction', icon: Calculator },
  { id: 'hospital_health', label: 'Hospital Health Intelligence', icon: HeartPulse },
  { id: 'hospital_sources', label: 'Hospital Data & ABDM', icon: Database },
  { id: 'govt_audit', label: 'Audit Trail', icon: ShieldCheck },
];

export const PRO_NAV_VIEWS = [
  { id: 'pro_dashboard', label: 'Pro Console', icon: Briefcase },
  { id: 'tender_marketplace', label: 'Tender Marketplace', icon: ShoppingBag },
  { id: 'my_proposals', label: 'My Submitted Bids', icon: FileText },
  { id: 'my_assigned_projects', label: 'My Assigned Projects', icon: Award },
  { id: 'corridor_cost_approval', label: 'CapEx & Lifecycle Cost', icon: Calculator },
];

export const PUBLIC_NAV_VIEWS = [
  { id: 'public_overview', label: 'Public Overview', icon: Globe2 },
  { id: 'overview', label: '1. Climate Overview', icon: LayoutDashboard },
  { id: 'map', label: '2. Interactive Map', icon: Map },
  { id: 'public_projects', label: 'Public Greening Works', icon: Trees },
  { id: 'provenance', label: '10. Evidence & Data Provenance', icon: Users },
];

export const ROLE_PERMISSIONS_VIEW = {
  // Public Entry
  landing: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  home: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],

  // Institutional Government
  govt_overview: ['government_admin', 'government_engineer'],
  corridor_inventory: ['government_admin', 'government_engineer'],
  tender_management: ['government_admin'],
  professional_assignments: ['government_admin'],
  hospital_sources: ['government_admin'],
  govt_audit: ['government_admin'],

  // Pro Professional & Govt
  pro_dashboard: ['pro_professional', 'government_admin', 'government_engineer'],
  tender_marketplace: ['pro_professional', 'government_admin', 'government_engineer'],
  my_proposals: ['pro_professional', 'government_admin', 'government_engineer'],
  my_assigned_projects: ['pro_professional', 'government_admin', 'government_engineer'],
  corridor_cost_approval: ['pro_professional', 'government_admin', 'government_engineer'],
  hospital_health: ['pro_professional', 'government_admin', 'government_engineer'],
  scenarios: ['pro_professional', 'government_admin', 'government_engineer'],
  studio: ['pro_professional', 'government_admin', 'government_engineer'],
  records: ['government_admin', 'government_engineer', 'pro_professional'],
  optimizer: ['pro_professional', 'government_admin', 'government_engineer'],
  procurement: ['government_admin', 'government_engineer', 'pro_professional'],
  agent: ['government_admin', 'government_engineer'],
  meko: ['government_admin', 'government_engineer', 'pro_professional'],
  temporal: ['government_admin', 'government_engineer', 'pro_professional'],
  suitability: ['pro_professional', 'government_admin', 'government_engineer'],
  pareto: ['pro_professional', 'government_admin', 'government_engineer'],
  readiness: ['pro_professional', 'government_admin', 'government_engineer'],
  intervention_intelligence: ['pro_professional', 'government_admin', 'government_engineer'],
  spatial_memory: ['government_admin', 'government_engineer', 'pro_professional'],
  impact: ['government_admin', 'government_engineer', 'pro_professional'],

  // Public Discovery
  public_overview: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  overview: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  map: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  corridors: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  canopy: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  public_projects: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  provenance: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  shade: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
  seasonal: ['normal_user', 'pro_professional', 'government_admin', 'government_engineer'],
};

export function isViewAuthorized(viewId, role) {
  const allowed = ROLE_PERMISSIONS_VIEW[viewId];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function getRequiredRole(viewId) {
  const allowed = ROLE_PERMISSIONS_VIEW[viewId];
  if (!allowed || allowed.includes('normal_user')) return 'normal_user';
  if (allowed.includes('pro_professional') && !allowed.includes('normal_user')) return 'pro_professional';
  return 'government_admin';
}

export const NAV_VIEWS = [
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
  { id: 'intervention_intelligence', label: '18. Intervention Intelligence (ML)', icon: Cpu },
];

function getInitialView() {
  try {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const qv = params.get('view');
      if (qv) {
        if (qv === 'landing' || qv === 'home') return 'landing';
        if (ROLE_PERMISSIONS_VIEW[qv]) return qv;
      }
      const hash = (window.location.hash || '').replace('#', '');
      if (hash) {
        if (hash === 'landing' || hash === 'home') return 'landing';
        if (ROLE_PERMISSIONS_VIEW[hash]) return hash;
      }
    }
  } catch {}
  return 'landing';
}

export default function App() {
  const [activeView, _setActiveViewState] = useState(getInitialView);
  const [mekoEnabled, setMekoEnabled] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const setActiveView = useCallback((newView) => {
    _setActiveViewState(newView);
    try {
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        if (newView === 'landing' || newView === 'home') {
          url.searchParams.delete('view');
        } else {
          url.searchParams.set('view', newView);
        }
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, []);

  const handleToggleSound = useCallback(() => {
    const unmuted = forestAudio.toggleMute();
    setIsMuted(!unmuted);
  }, []);

  // Secure RBAC State: Default to Public Citizen (normal_user) — Never Insecure Admin Default
  const [currentRole, setCurrentRole] = useState('normal_user');
  const [currentUser, setCurrentUser] = useState({
    user_id: 'public_citizen',
    role: 'normal_user',
    organization: 'Public Citizen',
  });
  const [token, setToken] = useState(null);
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleSwitchRole = useCallback(async (role, targetView = null) => {
    setSwitchingRole(true);
    try {
      const res = await api.demoSwitchRole(role);
      setToken(res.access_token);
      setCurrentRole(res.role);
      setCurrentUser({
        user_id: res.user_id,
        role: res.role,
        organization: res.organization,
      });

      let nextView = targetView;
      if (!nextView || nextView === 'landing' || !isViewAuthorized(nextView, res.role)) {
        if (role === 'government_admin' || role === 'government_engineer') {
          nextView = 'govt_overview';
        } else if (role === 'pro_professional') {
          nextView = 'pro_dashboard';
        } else {
          nextView = 'public_overview';
        }
      }
      setActiveView(nextView);
    } catch (err) {
      console.warn('Demo persona switching unavailable (restricted in non-dev environment); defaulting to Public Citizen', err);
      setToken(null);
      setCurrentRole('normal_user');
      setCurrentUser({
        user_id: 'public_citizen',
        role: 'normal_user',
        organization: 'Public Citizen',
      });
      let nextView = targetView;
      if (!nextView || nextView === 'landing' || !isViewAuthorized(nextView, 'normal_user')) {
        nextView = nextView === 'landing' ? 'landing' : 'public_overview';
      }
      setActiveView(nextView);
    } finally {
      setSwitchingRole(false);
    }
  }, [setActiveView]);

  // Geospatial and Analytical Data State
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

  const [provenanceModalOpen, setProvenanceModalOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [passportCorridorId, setPassportCorridorId] = useState('C-14');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial metadata fetch
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

  // Load corridors & sensitivity data
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

  const activeSensitivityRow = sensitivityData?.corridors?.find(
    (c) => c.id === selectedCorridor?.id
  );

  const lstStats = statsSummary?.raster?.lst || {};
  const ndviStats = statsSummary?.raster?.ndvi || {};
  const aqiStats = statsSummary?.aqi || {};

  // =========================================================================
  // EXPERIENCE 1: PUBLIC LANDING PAGE (Clean, Editorial, Living Forest WebGL)
  // =========================================================================
  if (activeView === 'landing' || activeView === 'home') {
    return (
      <div className="w-screen min-h-screen bg-[#071C16]">
        <React.Suspense fallback={<ViewLoadingFallback />}>
          <LandingPageView
            onNavigate={(v) => {
              if (v === 'home' || v === 'landing') {
                setActiveView('landing');
              } else {
                setActiveView(v);
              }
            }}
            statsSummary={statsSummary}
          />
        </React.Suspense>

        {/* Global Modals Accessible via Landing Page */}
        <React.Suspense fallback={null}>
          <DataProvenanceModal
            open={provenanceModalOpen}
            onClose={() => setProvenanceModalOpen(false)}
            provenance={provenance}
            statsSummary={statsSummary}
          />
          <CorridorEvidencePassportModal
            open={passportOpen}
            onClose={() => setPassportOpen(false)}
            corridorId={passportCorridorId || 'C-14'}
          />
        </React.Suspense>
      </div>
    );
  }

  // =========================================================================
  // EXPERIENCE 2: UNIFIED APPLICATION WORKSPACE (Kunal Sidebar + Niharika RBAC)
  // =========================================================================
  return (
    <div className="flex h-screen w-screen bg-[#071C16] text-slate-100 overflow-hidden font-body">
      {/* Left Collapsible Role-Aware Sidebar */}
      <AppSidebar
        activePage={activeView}
        onNavigate={(v) => setActiveView(v)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentRole={currentRole}
        currentUser={currentUser}
        mekoEnabled={mekoEnabled}
        onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
        isMuted={isMuted}
        onToggleSound={handleToggleSound}
      />

      {/* Main Workspace Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Institutional Header */}
        <header className="h-14 shrink-0 bg-[#071C16]/95 border-b border-white/10 px-4 flex items-center justify-between gap-4 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center shadow-inner">
              <Trees className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold tracking-tight text-white font-editorial">
                  VanSetu <span className="text-emerald-400 font-sans font-normal">— Urban Climate Action Intelligence</span>
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  NCT Delhi v2.0
                </span>
              </div>
            </div>
          </div>

          {/* City-Wide Telemetry Strip with Scientific Disclosures */}
          <div className="hidden 2xl:flex items-center gap-2.5 text-xs">
            <div className="bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-2">
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

            <div className="bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-2">
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

            <div className="bg-slate-950/80 border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-2">
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

          {/* Top Controls: Evidence Passport, Provenance, Home, Meko */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveView('landing')}
              className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
              title="Return to Public Landing Page"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Landing</span>
            </button>

            <button
              onClick={() => {
                setPassportCorridorId(selectedCorridor?.code || selectedCorridor?.id || 'C-14');
                setPassportOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-xs font-bold text-emerald-300 flex items-center gap-1.5 transition shadow"
              title="Open Corridor Evidence Passport"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Evidence Passport</span>
            </button>

            <button
              onClick={() => setProvenanceModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition"
              title="View Scientific Data Provenance"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Provenance</span>
            </button>

            <button
              onClick={() => setMekoEnabled(!mekoEnabled)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition ${
                mekoEnabled
                  ? 'bg-emerald-600/25 border-emerald-500 text-emerald-300'
                  : 'bg-rose-900/40 border-rose-500/50 text-rose-300'
              }`}
              title="Toggle YugabyteDB / Meko Persistent Institutional Memory"
            >
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{mekoEnabled ? 'MEKO: ON' : 'MEKO: OFF'}</span>
            </button>
          </div>
        </header>

        {/* Role-Based Government / Professional / Citizen Identity Header */}
        <React.Suspense fallback={null}>
          <RoleHeader
            currentUser={currentUser}
            currentRole={currentRole}
            onSwitchRole={handleSwitchRole}
            switchingRole={switchingRole}
          />
        </React.Suspense>

        {/* Error Banner */}
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

        {/* Workspace Canvas Switched by Active View */}
        <div className="flex-1 min-h-0 overflow-hidden relative">
          {/* RBAC Route Guarding: check role permissions */}
          {!isViewAuthorized(activeView, currentRole) ? (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              <AccessDeniedView
                userRole={currentRole}
                requiredRole={getRequiredRole(activeView)}
                onSwitchRole={handleSwitchRole}
              />
            </React.Suspense>
          ) : (
            <React.Suspense fallback={<ViewLoadingFallback />}>
              {/* Kunal Map-First Views */}
              {activeView === 'map' && (
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
                  onNavigate={(v) => setActiveView(v)}
                  onOpenPassport={(cid) => {
                    setPassportCorridorId(cid);
                    setPassportOpen(true);
                  }}
                />
              )}

              {activeView === 'corridors' && (
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
                  onNavigate={(v) => setActiveView(v)}
                  onOpenPassport={(cid) => {
                    setPassportCorridorId(cid);
                    setPassportOpen(true);
                  }}
                />
              )}

              {activeView === 'canopy' && (
                <CanopyHydrologyView
                  statsSummary={statsSummary}
                  districtsSummary={districtsSummary}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={setSelectedDistrict}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'scenarios' && (
                <ScenarioLabView
                  activeScenario={activeScenario}
                  onSelectScenario={setActiveScenario}
                  whatIfHeatWeight={whatIfHeatWeight}
                  onChangeWhatIfHeatWeight={setWhatIfHeatWeight}
                  sensitivityData={sensitivityData}
                  selectedCorridor={selectedCorridor}
                  onSelectCorridor={setSelectedCorridor}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'studio' && (
                <DecisionStudioView
                  selectedCorridor={selectedCorridor}
                  corridors={corridors}
                  onSelectCorridor={setSelectedCorridor}
                  mekoEnabled={mekoEnabled}
                  onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                />
              )}

              {activeView === 'records' && (
                <RecordsView
                  selectedCorridor={selectedCorridor}
                  mekoEnabled={mekoEnabled}
                  onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                  provenance={provenance}
                  statsSummary={statsSummary}
                  onOpenProvenanceModal={() => setProvenanceModalOpen(true)}
                />
              )}

              {/* Niharika Government Institutional Workspaces */}
              {activeView === 'govt_overview' && (
                <GovernmentOverviewView
                  token={token}
                  corridors={corridors}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'corridor_inventory' && (
                <CorridorInventoryView
                  token={token}
                  corridors={corridors}
                  onNavigate={(v) => setActiveView(v)}
                  onOpenTenderModal={() => setActiveView('tender_management')}
                />
              )}

              {activeView === 'tender_management' && (
                <TenderManagementView
                  token={token}
                  corridors={corridors}
                />
              )}

              {activeView === 'professional_assignments' && (
                <ProfessionalAssignmentsView
                  token={token}
                  corridors={corridors}
                />
              )}

              {activeView === 'corridor_cost_approval' && (
                <CorridorCostOptimizerView
                  token={token}
                  corridors={corridors}
                  selectedCorridor={selectedCorridor}
                  isGovernmentUser={
                    currentRole === 'government_admin' || currentRole === 'government_engineer'
                  }
                />
              )}

              {activeView === 'hospital_health' && (
                <RegionalHealthIntelligenceView token={token} />
              )}

              {activeView === 'hospital_sources' && (
                <HospitalDataSourcesView token={token} />
              )}

              {activeView === 'govt_audit' && (
                <GovernmentAuditView token={token} />
              )}

              {/* Niharika Pro Professional Workspaces */}
              {activeView === 'pro_dashboard' && (
                <ProDashboardView
                  token={token}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'tender_marketplace' && (
                <TenderMarketplaceView
                  token={token}
                  corridors={corridors}
                />
              )}

              {activeView === 'my_proposals' && (
                <MyProposalsView token={token} />
              )}

              {activeView === 'my_assigned_projects' && (
                <MyAssignedProjectsView
                  token={token}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {/* Niharika Public Citizen Workspaces */}
              {activeView === 'public_overview' && (
                <PublicDashboardView
                  statsSummary={statsSummary}
                  corridors={corridors}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'public_projects' && (
                <PublicProjectsView
                  corridors={corridors}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {/* Specialized Analytics & Research Workspaces */}
              {activeView === 'overview' && (
                <CanopyHydrologyView
                  statsSummary={statsSummary}
                  districtsSummary={districtsSummary}
                  selectedDistrict={selectedDistrict}
                  onSelectDistrict={setSelectedDistrict}
                  onNavigate={(v) => setActiveView(v)}
                />
              )}

              {activeView === 'optimizer' && (
                <InterventionOptimizerView
                  selectedCorridor={selectedCorridor}
                  mekoEnabled={mekoEnabled}
                  onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                />
              )}

              {activeView === 'procurement' && (
                <ProcurementStudioView
                  selectedCorridor={selectedCorridor}
                  mekoEnabled={mekoEnabled}
                  onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                />
              )}

              {activeView === 'agent' && (
                <AiPlanningAssistantView
                  selectedCorridor={selectedCorridor}
                  mekoEnabled={mekoEnabled}
                  onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                />
              )}

              {activeView === 'meko' && (
                <MekoMemoryStudioView
                  mekoEnabled={mekoEnabled}
                  onToggleMeko={() => setMekoEnabled(!mekoEnabled)}
                />
              )}

              {activeView === 'temporal' && (
                <TemporalInsightsView selectedCorridor={selectedCorridor} />
              )}

              {activeView === 'provenance' && (
                <EquityAndProvenanceView
                  provenance={provenance}
                  statsSummary={statsSummary}
                />
              )}

              {activeView === 'suitability' && (
                <SegmentSuitabilityView selectedCorridor={selectedCorridor} />
              )}

              {activeView === 'pareto' && (
                <ParetoPortfolioLabView
                  onSelectPortfolioForImplementation={() => {
                    setActiveView('readiness');
                  }}
                />
              )}

              {activeView === 'shade' && (
                <ShadeContinuityView selectedCorridor={selectedCorridor} />
              )}

              {activeView === 'seasonal' && (
                <SeasonalHeatIntelligenceView selectedCorridor={selectedCorridor} />
              )}

              {activeView === 'impact' && <ImpactMonitoringView />}

              {activeView === 'spatial_memory' && (
                <SpatialMemoryMapView selectedCorridor={selectedCorridor} />
              )}

              {activeView === 'readiness' && (
                <ProjectReadinessView
                  onNavigateToProcurement={() => setActiveView('procurement')}
                />
              )}

              {activeView === 'intervention_intelligence' && (
                <InterventionIntelligenceView
                  selectedCorridor={selectedCorridor}
                  onSelectCorridor={setSelectedCorridor}
                />
              )}
            </React.Suspense>
          )}
        </div>
      </div>

      {/* Global Scientific Modals */}
      <React.Suspense fallback={null}>
        <DataProvenanceModal
          open={provenanceModalOpen}
          onClose={() => setProvenanceModalOpen(false)}
          provenance={provenance}
          statsSummary={statsSummary}
        />
        <CorridorEvidencePassportModal
          open={passportOpen}
          onClose={() => setPassportOpen(false)}
          corridorId={passportCorridorId || selectedCorridor?.code || selectedCorridor?.id || 'C-14'}
        />
      </React.Suspense>
    </div>
  );
}
