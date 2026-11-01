/**
 * AppSidebar.jsx — Sleek, Collapsible Role-Specific Application Navigation Sidebar.
 * Implements four genuinely different role-based workspaces:
 * 1. Public Citizen (8 accessible items)
 * 2. Pro Professional (17 advanced analytics items)
 * 3. Government Admin (14 municipal governance & approval items)
 * 4. Government Engineer (14 infrastructure & field engineering items)
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
  HardHat,
  Ruler,
  Wrench,
  AlertTriangle,
  MapPin,
  ClipboardList,
} from 'lucide-react';

export const ROLE_DISPLAY_NAMES = {
  normal_user: 'Public Citizen',
  public_citizen: 'Public Citizen',
  pro_professional: 'Pro Professional',
  government_admin: 'Government Admin',
  government_engineer: 'Government Engineer',
};

// Dedicated climate suite entry points
export const DEDICATED_ENTRY_POINTS = [
  { id: 'prediction', label: 'Corridor Prediction', shortLabel: 'Prediction', icon: Sparkles },
  { id: 'ranking', label: 'Corridor Ranking', shortLabel: 'Ranking', icon: Sliders },
  { id: 'heatwave_mapping', label: 'Heatwave Risk Mapping', shortLabel: 'Heatwave', icon: Flame },
  { id: 'community_input', label: 'Community Observations', shortLabel: 'Community', icon: Users },
  { id: 'health_data', label: 'Public Health Data', shortLabel: 'Health Data', icon: HeartPulse },
];

// 1. PUBLIC CITIZEN WORKSPACE NAVIGATION (8 Items)
export const PUBLIC_CITIZEN_NAV = [
  { id: 'public_dashboard', label: '1. Home', shortLabel: 'Home', icon: Home },
  { id: 'public_map', label: '2. Explore Climate Map', shortLabel: 'Explore Climate Map', icon: Map },
  { id: 'public_heat', label: '3. Local Heat Information', shortLabel: 'Local Heat Info', icon: Thermometer },
  { id: 'public_projects', label: '4. Green Projects', shortLabel: 'Green Projects', icon: Trees },
  { id: 'community_input', label: '5. Community Observations', shortLabel: 'Community Reports', icon: Users },
  { id: 'public_health', label: '6. Health & Heat Safety', shortLabel: 'Heat Safety & First Aid', icon: HeartPulse },
  { id: 'public_report', label: '7. Report an Issue', shortLabel: 'Report an Issue', icon: AlertTriangle, badge: 'Direct PWD' },
  { id: 'evidence_passport', label: '8. Public Evidence', shortLabel: 'Public Evidence', icon: ShieldCheck },
];

// 2. PRO PROFESSIONAL WORKSPACE NAVIGATION (17 Items)
export const PRO_PROFESSIONAL_NAV = [
  { id: 'pro_dashboard', label: '1. Professional Overview', shortLabel: 'Pro Overview', icon: Briefcase },
  { id: 'map', label: '2. Map Explorer', shortLabel: 'Map Explorer', icon: Map },
  { id: 'corridors', label: '3. Corridor Intelligence', shortLabel: 'Corridors (44)', icon: Trees },
  { id: 'prediction', label: '4. Corridor Prediction', shortLabel: 'Corridor Prediction', icon: Sparkles, badge: 'ML' },
  { id: 'ranking', label: '5. Corridor Ranking', shortLabel: 'Corridor Ranking', icon: Sliders },
  { id: 'heatwave_mapping', label: '6. Heatwave Risk Mapping', shortLabel: 'Heatwave Mapping', icon: Flame },
  { id: 'scenarios', label: '7. Scenario Lab', shortLabel: 'Scenario Lab', icon: Sliders },
  { id: 'studio', label: '8. Decision Studio', shortLabel: 'Decision Studio', icon: Calculator },
  { id: 'intervention_intelligence', label: '9. ML Intelligence', shortLabel: 'ML Intelligence', icon: Cpu },
  { id: 'shade', label: '10. Pedestrian Shade Analysis', shortLabel: 'Pedestrian Shade', icon: Sun },
  { id: 'seasonal', label: '11. Seasonal Heat Intelligence', shortLabel: 'Seasonal Heat', icon: Thermometer },
  { id: 'suitability', label: '12. Right Tree, Right Place', shortLabel: 'Tree Suitability', icon: Compass },
  { id: 'pareto', label: '13. Pareto Portfolio', shortLabel: 'Pareto Portfolio', icon: Calculator },
  { id: 'spatial_memory', label: '14. Spatial Memory', shortLabel: 'Spatial Memory', icon: Brain },
  { id: 'evidence_passport', label: '15. Evidence Passport', shortLabel: 'Evidence Passport', icon: FileCheck },
  { id: 'provenance', label: '16. Data Provenance', shortLabel: 'Data Provenance', icon: Database },
  { id: 'agent', label: '17. VanSetu AI', shortLabel: 'VanSetu AI', icon: Bot },
];

// 3. GOVERNMENT ADMIN WORKSPACE NAVIGATION (14 Items)
export const GOVT_ADMIN_NAV = [
  { id: 'govt_overview', label: '1. Government Overview', shortLabel: 'Govt Overview', icon: Building2 },
  { id: 'govt_districts', label: '2. District Administration', shortLabel: '11 Districts Admin', icon: MapPin },
  { id: 'govt_departments', label: '3. Department Management', shortLabel: 'Departments (PWD/MCD)', icon: Layers },
  { id: 'corridor_inventory', label: '4. Corridor Prioritization', shortLabel: 'Corridor Prioritization', icon: Layers },
  { id: 'tender_management', label: '5. Budget & Resource Allocation', shortLabel: 'Budget & Tenders', icon: FileText, badge: 'B2G' },
  { id: 'govt_approvals', label: '6. Project Approvals', shortLabel: 'Approval Queue', icon: CheckCircle2, badge: 'Signoff' },
  { id: 'tender_marketplace', label: '7. Intervention Portfolio', shortLabel: 'Intervention Portfolio', icon: Briefcase },
  { id: 'govt_community_moderation', label: '8. Community Governance', shortLabel: 'Citizen Complaints', icon: Users },
  { id: 'evidence_passport', label: '9. Evidence Review', shortLabel: 'Evidence Review', icon: ShieldCheck },
  { id: 'corridor_cost_approval', label: '10. Field Verification Mgmt', shortLabel: 'Verification Mgmt', icon: Calculator },
  { id: 'hospital_health', label: '11. Public Health Monitoring', shortLabel: 'Hospital Health (ABDM)', icon: HeartPulse },
  { id: 'govt_audit', label: '12. Audit & Compliance', shortLabel: 'Audit & Compliance', icon: ShieldCheck },
  { id: 'govt_users', label: '13. User & Role Management', shortLabel: 'Role Management', icon: Users },
  { id: 'records', label: '14. Administrative Reports', shortLabel: 'Admin Reports & Meko', icon: Brain },
];

// 4. GOVERNMENT ENGINEER WORKSPACE NAVIGATION (14 Items)
export const GOVT_ENGINEER_NAV = [
  { id: 'engineer_overview', label: '1. Engineering Overview', shortLabel: 'Engineering Overview', icon: HardHat },
  { id: 'engineer_map', label: '2. Infrastructure Map', shortLabel: 'Infrastructure Map', icon: Map },
  { id: 'corridor_engineering', label: '3. Corridor Engineering', shortLabel: 'Corridor Engineering', icon: Wrench, badge: 'IRC' },
  { id: 'road_network', label: '4. Road Network Analysis', shortLabel: 'Road Network', icon: Layers },
  { id: 'row_assessment', label: '5. Right-of-Way Assessment', shortLabel: 'Right-of-Way (IRC:73)', icon: Ruler },
  { id: 'shade', label: '6. Pedestrian Shade Continuity', shortLabel: 'Shade Continuity', icon: Sun },
  { id: 'canopy', label: '7. Canopy & Green Infrastructure', shortLabel: 'Canopy & Hydrology', icon: Droplets },
  { id: 'engineering_feasibility', label: '8. Engineering Feasibility', shortLabel: 'Utility Clash Check', icon: ShieldCheck },
  { id: 'engineer_field_surveys', label: '9. Field Surveys', shortLabel: 'Field Survey Log', icon: ClipboardList },
  { id: 'studio', label: '10. Intervention Design', shortLabel: 'Intervention Design', icon: Calculator },
  { id: 'corridor_cost_approval', label: '11. Material & Cost Estimation', shortLabel: 'CapEx Estimation (DSR)', icon: Calculator },
  { id: 'engineer_verification', label: '12. Technical Verification', shortLabel: 'Engineer Verification', icon: CheckCircle2 },
  { id: 'evidence_passport', label: '13. Evidence Documentation', shortLabel: 'Evidence Passport', icon: FileCheck },
  { id: 'records', label: '14. Engineering Reports', shortLabel: 'Engineering Records', icon: Brain },
];

export default function AppSidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  currentRole = 'public_citizen',
  currentUser,
  onSwitchRole,
  mekoEnabled,
  onToggleMeko,
  isMuted,
  onToggleSound,
}) {
  const normRole = (currentRole || '').toLowerCase();
  const isGovtAdmin = normRole === 'government_admin' || normRole === 'admin';
  const isGovtEngineer = normRole === 'government_engineer' || normRole === 'engineer';
  const isPro = normRole === 'pro_professional' || normRole === 'pro';
  const isPublic = normRole === 'public_citizen' || normRole === 'normal_user' || (!isGovtAdmin && !isGovtEngineer && !isPro);

  // Select the strictly segregated role navigation list
  let activeNavItems = PUBLIC_CITIZEN_NAV;
  let workspaceName = 'Public Citizen';
  let workspaceTheme = 'teal';

  if (isGovtAdmin) {
    activeNavItems = GOVT_ADMIN_NAV;
    workspaceName = 'Govt Admin';
    workspaceTheme = 'emerald';
  } else if (isGovtEngineer) {
    activeNavItems = GOVT_ENGINEER_NAV;
    workspaceName = 'Govt Engineer';
    workspaceTheme = 'amber';
  } else if (isPro) {
    activeNavItems = PRO_PROFESSIONAL_NAV;
    workspaceName = 'Pro Professional';
    workspaceTheme = 'blue';
  }

  return (
    <aside
      className={`h-screen flex flex-col justify-between border-r border-white/10 bg-[#071C16] text-slate-200 transition-all duration-300 z-30 shrink-0 font-body select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Header / Branding & Workspace Identity */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="p-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <Trees className="w-4 h-4 text-emerald-400" />
              </span>
              <div className="min-w-0">
                <div className="font-black text-sm text-white tracking-tight leading-none truncate">
                  VanSetu Green
                </div>
                <div className="text-[10px] font-mono text-emerald-400 mt-0.5 truncate uppercase font-bold">
                  {ROLE_DISPLAY_NAMES[currentRole] || workspaceName} Console
                </div>
              </div>
            </div>
          )}

          {collapsed && (
            <span className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto shrink-0">
              <Trees className="w-4 h-4 text-emerald-400" />
            </span>
          )}

          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition hidden md:block shrink-0"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Workspace Badge & Item Counter */}
        {!collapsed && (
          <div className="px-3 py-1.5 bg-[#0b261d] border-b border-emerald-500/10 flex items-center justify-between text-[10px] font-mono shrink-0">
            <span className="text-slate-400">Workspace Nav:</span>
            <span className="font-bold text-teal-300">{activeNavItems.length} Sections</span>
          </div>
        )}

        {/* Scrollable Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {activeNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition text-left group ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                title={item.shortLabel}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive
                        ? 'text-white'
                        : isGovtEngineer
                        ? 'text-amber-400 group-hover:text-amber-300'
                        : isPro
                        ? 'text-blue-400 group-hover:text-blue-300'
                        : 'text-teal-400 group-hover:text-teal-300'
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.shortLabel}</span>}
                </div>

                {!collapsed && item.badge && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utilities & Controls */}
      <div className="p-2.5 border-t border-white/10 space-y-2 shrink-0 bg-[#071C16]">
        {/* Workspace Quick Switcher inside Sidebar */}
        {!collapsed && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>Switch Workspace:</span>
              <span className="text-teal-300 font-bold">{workspaceName}</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
              <button
                onClick={() => onSwitchRole && onSwitchRole('public_citizen')}
                className={`p-1 rounded text-center transition ${
                  isPublic
                    ? 'bg-teal-600 text-white font-bold'
                    : 'bg-[#0D2821] text-slate-300 hover:bg-white/5 border border-emerald-500/20'
                }`}
                title="Public Citizen"
              >
                Citizen
              </button>
              <button
                onClick={() => onSwitchRole && onSwitchRole('pro_professional')}
                className={`p-1 rounded text-center transition ${
                  isPro
                    ? 'bg-blue-600 text-white font-bold'
                    : 'bg-[#0D2821] text-slate-300 hover:bg-white/5 border border-emerald-500/20'
                }`}
                title="Pro Professional"
              >
                Pro
              </button>
              <button
                onClick={() => onSwitchRole && onSwitchRole('government_admin')}
                className={`p-1 rounded text-center transition ${
                  isGovtAdmin
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-[#0D2821] text-slate-300 hover:bg-white/5 border border-emerald-500/20'
                }`}
                title="Govt Admin"
              >
                Admin
              </button>
              <button
                onClick={() => onSwitchRole && onSwitchRole('government_engineer')}
                className={`p-1 rounded text-center transition ${
                  isGovtEngineer
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-[#0D2821] text-slate-300 hover:bg-white/5 border border-emerald-500/20'
                }`}
                title="Govt Engineer"
              >
                Engineer
              </button>
            </div>
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
              collapsed
                ? 'w-full flex justify-center'
                : 'w-full px-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-300'
            } ${
              isMuted
                ? 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
                : 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
            }`}
            title="Toggle Ambient Audio [M]"
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            {!collapsed && <span>{isMuted ? 'Muted' : 'Audio On'}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
