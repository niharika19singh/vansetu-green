/**
 * AppSidebar.jsx — Sleek, Collapsible Role-Aware Application Navigation Sidebar.
 * Unifies Kunal's visual styling with Niharika's Government-First RBAC workspace architecture.
 * Adapts navigation groups dynamically for Public Citizen, Pro Professional, and Government Admin/Engineer.
 */
import React, { useState } from 'react';
import {
  Map,
  Trees,
  Droplets,
  Sliders,
  Calculator,
  Brain,
  Home,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Volume2,
  VolumeX,
  Building2,
  Layers,
  FileText,
  Briefcase,
  HeartPulse,
  Database,
  ShieldCheck,
  ShoppingBag,
  Award,
  Globe2,
  Users,
  Compass,
  Sun,
  Thermometer,
  Activity,
  FolderKanban,
  Cpu,
  Sparkles,
  Lock,
  Flame,
  Bot,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';

export const ROLE_DISPLAY_NAMES = {
  normal_user: 'Public Citizen',
  pro_professional: 'Pro Professional',
  government_admin: 'Government Admin',
  government_engineer: 'Government Engineer',
};

export const DEDICATED_ENTRY_POINTS = [
  { id: 'prediction', shortLabel: 'Corridor Prediction', icon: Sparkles, badge: 'High Priority' },
  { id: 'ranking', shortLabel: 'Corridor Ranking', icon: Sliders },
  { id: 'heatwave_mapping', shortLabel: 'Heat-wave Mapping', icon: Flame },
  { id: 'community_input', shortLabel: 'Community Input', icon: Users },
  { id: 'health_data', shortLabel: 'Health Data Registry', icon: HeartPulse },
  { id: 'agent', shortLabel: 'VanSetu AI Planning', icon: Bot },
];

export const CLIMATE_SUITE_ITEMS = [
  { id: 'map', label: '2. Interactive Map', shortLabel: 'Map Explorer', icon: Map },
  { id: 'corridors', label: '3. Corridor Intelligence', shortLabel: 'Corridors (44)', icon: Trees },
  { id: 'canopy', label: '1. Climate Overview', shortLabel: 'Canopy & Hydrology', icon: Droplets },
  { id: 'scenarios', label: '4. Scenario Lab', shortLabel: 'Scenario Lab', icon: Sliders },
  { id: 'studio', label: '5. Intervention Optimizer', shortLabel: 'Decision Studio', icon: Calculator },
  { id: 'records', label: '8. Institutional Memory (Meko)', shortLabel: 'Intelligence & Records', icon: Brain },
];

export const ADVANCED_ANALYTICS_ITEMS = [
  { id: 'intervention_intelligence', shortLabel: 'ML Intelligence', icon: Cpu },
  { id: 'suitability', shortLabel: 'Right Tree, Right Place', icon: Compass },
  { id: 'pareto', shortLabel: 'Pareto Portfolio', icon: Calculator },
  { id: 'shade', shortLabel: 'Pedestrian Shade', icon: Sun },
  { id: 'seasonal', shortLabel: 'Seasonal Heat', icon: Thermometer },
  { id: 'impact', shortLabel: 'Impact Monitoring', icon: Activity },
  { id: 'readiness', shortLabel: 'Project Readiness', icon: FolderKanban },
  { id: 'spatial_memory', shortLabel: 'Spatial Memory', icon: Brain },
];

export default function AppSidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  currentRole = 'normal_user',
  currentUser,
  onSwitchRole,
  mekoEnabled,
  onToggleMeko,
  isMuted,
  onToggleSound,
}) {
  const [showAdvanced, setShowAdvanced] = useState(true);

  const isGovtAdmin = currentRole === 'government_admin';
  const isGovtEngineer = currentRole === 'government_engineer';
  const isGovt = isGovtAdmin || isGovtEngineer;
  const isPro = currentRole === 'pro_professional';
  const isPublic = currentRole === 'normal_user';

  // Role-Specific Tailored Navigation Items (Strictly Enforces Role Workspaces)
  const govtItems = [
    { id: 'govt_overview', shortLabel: 'Govt Overview', icon: Building2 },
    { id: 'corridor_inventory', shortLabel: 'Corridor Board', icon: Layers },
    { id: 'map', shortLabel: 'Map Explorer', icon: Map },
    { id: 'scenarios', shortLabel: 'Scenario Lab', icon: Sliders },
    { id: 'studio', shortLabel: 'Decision Studio', icon: Calculator },
    ...(isGovtAdmin
      ? [
          { id: 'tender_management', shortLabel: 'Tenders & Bids', icon: FileText },
          { id: 'professional_assignments', shortLabel: 'Pro Directory', icon: Briefcase },
        ]
      : []),
    { id: 'corridor_cost_approval', shortLabel: 'Budget Sanction', icon: Calculator },
    { id: 'readiness', shortLabel: 'Project Readiness', icon: FolderKanban },
    { id: 'impact', shortLabel: 'Impact Monitoring', icon: Activity },
    { id: 'hospital_health', shortLabel: 'Hospital Health', icon: HeartPulse },
    ...(isGovtAdmin
      ? [
          { id: 'hospital_sources', shortLabel: 'ABDM Health Data', icon: Database },
          { id: 'govt_audit', shortLabel: 'Audit Trail', icon: ShieldCheck },
        ]
      : []),
    { id: 'provenance', shortLabel: 'Community Review', icon: Users },
    { id: 'records', shortLabel: 'Institutional Memory', icon: Brain },
    { id: 'agent', shortLabel: 'VanSetu AI Planning', icon: Sparkles },
  ];

  const proItems = [
    { id: 'pro_dashboard', shortLabel: 'Pro Console', icon: Briefcase },
    { id: 'map', shortLabel: 'Map Explorer', icon: Map },
    { id: 'corridors', shortLabel: 'Corridors (44)', icon: Trees },
    { id: 'canopy', shortLabel: 'Canopy & Hydrology', icon: Droplets },
    { id: 'seasonal', shortLabel: 'Seasonal Heat', icon: Thermometer },
    { id: 'shade', shortLabel: 'Pedestrian Shade', icon: Sun },
    { id: 'impact', shortLabel: 'Impact Monitoring', icon: Activity },
    { id: 'intervention_intelligence', shortLabel: 'ML Intelligence', icon: Cpu },
    { id: 'suitability', shortLabel: 'Right Tree, Right Place', icon: Compass },
    { id: 'scenarios', shortLabel: 'Scenario Lab', icon: Sliders },
    { id: 'studio', shortLabel: 'Decision Studio', icon: Calculator },
    { id: 'pareto', shortLabel: 'Pareto Portfolio', icon: Calculator },
    { id: 'tender_marketplace', shortLabel: 'Tender Marketplace', icon: ShoppingBag },
    { id: 'my_proposals', shortLabel: 'My Submitted Bids', icon: FileText },
    { id: 'my_assigned_projects', shortLabel: 'Awarded Projects', icon: Award },
    { id: 'corridor_cost_approval', shortLabel: 'CapEx & LifeCycle', icon: Calculator },
    { id: 'agent', shortLabel: 'VanSetu AI Planning', icon: Sparkles },
  ];

  const publicItems = [
    { id: 'public_overview', shortLabel: 'Public Overview', icon: Globe2 },
    { id: 'map', shortLabel: 'Map Explorer', icon: Map },
    { id: 'corridors', shortLabel: 'Corridors (44)', icon: Trees },
    { id: 'canopy', shortLabel: 'Climate Information', icon: Droplets },
    { id: 'public_projects', shortLabel: 'Greening Works', icon: Trees },
    { id: 'shade', shortLabel: 'Pedestrian Shade', icon: Sun },
    { id: 'seasonal', shortLabel: 'Seasonal Heat', icon: Thermometer },
    { id: 'provenance', shortLabel: 'Evidence Provenance', icon: FileCheck },
    { id: 'community_input', shortLabel: 'Community Input', icon: Users },
    { id: 'health_data', shortLabel: 'Health Data Registry', icon: HeartPulse },
  ];

  return (
    <aside
      className={`relative z-30 h-full flex flex-col justify-between bg-[#071C16]/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Brand */}
      <div className="flex-1 overflow-y-auto">
        <div className="h-14 flex items-center justify-between px-3 border-b border-white/10 shrink-0">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2.5 overflow-hidden text-left group"
            title="Return to VanSetu Landing Page"
          >
            <div className="w-8 h-8 rounded-lg bg-[#12392B] border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-md group-hover:border-emerald-400 transition">
              <Trees className="w-4 h-4 text-emerald-300" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="font-editorial text-sm font-bold text-[#F3F1E7] tracking-wide group-hover:text-emerald-200 transition">
                  VanSetu
                </div>
                <div className="text-[10px] text-[#9CB9A3] font-mono">NCT Delhi v2.0</div>
              </div>
            )}
          </button>

          {!collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Active Persona Quick Switcher */}
        {!collapsed && onSwitchRole && (
          <div className="px-3 py-2 border-b border-white/5 bg-[#0b241c]/50">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CB9A3] mb-1 flex items-center justify-between">
              <span>Switch Workspace</span>
              <span className="text-[9px] text-emerald-400 font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                RBAC
              </span>
            </div>
            <select
              value={currentRole}
              onChange={(e) => onSwitchRole(e.target.value)}
              className="w-full bg-[#12392B] border border-white/10 rounded-lg px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-emerald-400 cursor-pointer"
            >
              <option value="normal_user" className="bg-[#0b241c] text-white">Public Citizen</option>
              <option value="pro_professional" className="bg-[#0b241c] text-white">Pro Professional</option>
              <option value="government_admin" className="bg-[#0b241c] text-white">Government Admin</option>
              <option value="government_engineer" className="bg-[#0b241c] text-white">Government Engineer</option>
            </select>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="p-2 space-y-1">
          {/* Landing Page Entry */}
          <button
            onClick={() => onNavigate('landing')}
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-semibold transition ${
              activePage === 'landing'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            title="Landing Page / Home"
          >
            <Home className="w-4 h-4 shrink-0 text-emerald-400" />
            {!collapsed && <span className="truncate">Home / Introduction</span>}
          </button>

          <div className="my-1.5 border-t border-white/5" />

          {/* Dedicated Entry Points (Always Accessible) */}
          {!collapsed && (
            <div className="px-2 pt-1 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-400/90 font-bold flex items-center justify-between">
              <span>Dedicated Climate Tools</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">Core</span>
            </div>
          )}

          {DEDICATED_ENTRY_POINTS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title={item.shortLabel}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-amber-400'}`} />
                  {!collapsed && <span className="truncate">{item.shortLabel}</span>}
                </div>
                {!collapsed && item.badge && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 font-mono font-bold shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="my-1.5 border-t border-white/5" />

          {/* Section 1: Role Primary Workflow */}
          {!collapsed && (
            <div className="px-2 pt-1 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-emerald-400/80 font-bold">
              {isGovt ? 'Institutional Workspace' : isPro ? 'Professional Console' : 'Public Discovery'}
            </div>
          )}

          {isGovt &&
            govtItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.shortLabel}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  {!collapsed && <span className="truncate">{item.shortLabel}</span>}
                </button>
              );
            })}

          {isPro &&
            proItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.shortLabel}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                  {!collapsed && <span className="truncate">{item.shortLabel}</span>}
                </button>
              );
            })}

          {isPublic &&
            publicItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-slate-700 text-white shadow-md font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.shortLabel}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                  {!collapsed && <span className="truncate">{item.shortLabel}</span>}
                </button>
              );
            })}

          {/* Section 2: Climate Intelligence Suite */}
          <div className="my-1.5 border-t border-white/5" />
          {!collapsed && (
            <div className="px-2 pt-1 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
              Climate Intelligence Suite
            </div>
          )}

          {CLIMATE_SUITE_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title={item.shortLabel}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                {!collapsed && <span className="truncate">{item.shortLabel}</span>}
              </button>
            );
          })}

          <div className="my-1.5 border-t border-white/5" />

          {/* Section 3: Specialized Advanced Analytics (Collapsible Submenu) */}
          {!collapsed && (
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-slate-200 transition"
            >
              <span>Advanced Analytics ({ADVANCED_ANALYTICS_ITEMS.length})</span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 transition-transform ${
                  showAdvanced ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {(showAdvanced || collapsed) &&
            ADVANCED_ANALYTICS_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition text-left ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  title={item.shortLabel}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                  {!collapsed && <span className="truncate">{item.shortLabel}</span>}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Bottom Utilities & Controls */}
      <div className="p-2.5 border-t border-white/10 space-y-1.5 shrink-0">
        {/* Active Role Indicator */}
        {!collapsed && (
          <div className="px-2 py-1 rounded bg-[#0b261d] border border-emerald-500/20 text-[10px] font-mono flex items-center justify-between">
            <span className="text-slate-400">Persona:</span>
            <span className="font-bold text-emerald-300 truncate max-w-[140px]">
              {ROLE_DISPLAY_NAMES[currentRole] || currentRole.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        )}

        {/* MEKO ON/OFF toggle */}
        <button
          onClick={onToggleMeko}
          className={`w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold border transition ${
            mekoEnabled
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-300'
          }`}
          title="Toggle YugabyteDB / Meko Institutional Memory"
        >
          <Brain className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>{mekoEnabled ? 'MEKO: ON' : 'MEKO: OFF'}</span>}
        </button>

        {/* Sound Toggle */}
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={onToggleSound}
            className={`py-1.5 rounded-lg border transition ${
              collapsed ? 'w-full flex justify-center' : 'w-full px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300'
            } ${
              isMuted
                ? 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
            }`}
            title="Toggle Ambient Audio [M]"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            {!collapsed && <span>{isMuted ? 'Muted' : 'Audio On'}</span>}
          </button>

          {collapsed && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
              title="Expand sidebar"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
