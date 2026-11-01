import React, { useState } from 'react';
import {
  Users,
  ShieldCheck,
  Building2,
  KeyRound,
  CheckCircle2,
  Lock,
  ArrowRight,
  HardHat,
  Briefcase,
  Globe2,
} from 'lucide-react';

export const SYSTEM_ROLE_MATRIX = [
  {
    role: 'Government Admin',
    identifier: 'government_admin',
    icon: Building2,
    badgeColor: 'emerald',
    description: 'Executive municipal authority for budget release, tender sanctioning, project approval, and user governance.',
    permissions: [
      'APPROVE_PROJECT_COSTS',
      'MANAGE_TENDERS',
      'ASSIGN_TENDER',
      'ALLOCATE_CORRIDOR',
      'MANAGE_USERS',
      'MANAGE_REGISTRY',
      'GOVERN_COMMUNITY',
      'VERIFY_EVIDENCE',
      'VIEW_GOVERNMENT_AUDIT',
      'MANAGE_HOSPITAL_SOURCES',
    ],
  },
  {
    role: 'Government Engineer',
    identifier: 'government_engineer',
    icon: HardHat,
    badgeColor: 'amber',
    description: 'Technical municipal field staff responsible for physical feasibility, trial pits, IRC:103 widths, and survey signoffs.',
    permissions: [
      'SUBMIT_FIELD_SURVEY',
      'VALIDATE_FEASIBILITY',
      'INSPECT_INFRASTRUCTURE',
      'VERIFY_ROW',
      'ESTIMATE_COSTS',
      'VIEW_CORRIDOR_INTELLIGENCE',
      'VIEW_SEGMENT_ANALYSIS',
      'VIEW_EVIDENCE',
      'SUBMIT_ASSESSMENT',
    ],
  },
  {
    role: 'Pro Professional',
    identifier: 'pro_professional',
    icon: Briefcase,
    badgeColor: 'blue',
    description: 'Empaneled architectural and planning firms competing for B2G contracts, preparing bids, and delivering projects.',
    permissions: [
      'BROWSE_TENDERS',
      'SUBMIT_PROPOSAL',
      'CUSTOMIZE_SCENARIOS',
      'OPTIMIZE_PORTFOLIO',
      'OPTIMIZE_CORRIDOR_COST',
      'VIEW_CORRIDOR_INTELLIGENCE',
      'VIEW_SEGMENT_ANALYSIS',
      'SUBMIT_ASSESSMENT',
      'VIEW_EVIDENCE',
    ],
  },
  {
    role: 'Public Citizen',
    identifier: 'public_citizen',
    icon: Globe2,
    badgeColor: 'teal',
    description: 'Delhi residents exploring neighborhood heat advisories, tracking green projects, and submitting civic reports.',
    permissions: [
      'VIEW_PUBLIC_MAP',
      'VIEW_PUBLIC_HEALTH',
      'SUBMIT_COMMUNITY_INPUT',
      'VIEW_COMMUNITY_INPUT',
      'VIEW_EVIDENCE',
    ],
  },
];

export default function GovtUserRoleManagementView({ token, onNavigate }) {
  const [selectedRole, setSelectedRole] = useState(SYSTEM_ROLE_MATRIX[0]);

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#0D2821] to-[#071C16] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="max-w-2xl space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              MUNICIPAL IDENTITY &amp; ROLE GOVERNANCE
            </span>
            <span className="text-slate-400 text-xs">Role-Based Access Control (RBAC) Specification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            User Roles &amp; Permission Hierarchy
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            VanSetu enforces zero-trust, cryptographically indexed bearer tokens with server-side validation.
            Review the authoritative permission matrix across all four municipal platform roles.
          </p>
        </div>
      </div>

      {/* 4 Role Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SYSTEM_ROLE_MATRIX.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedRole.identifier === r.identifier;
          return (
            <button
              key={r.identifier}
              onClick={() => setSelectedRole(r)}
              className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'bg-emerald-950/60 border-teal-400 shadow-xl'
                  : 'bg-[#0D2821] border-emerald-500/20 hover:border-emerald-500/40'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${isSelected ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-bold">
                    {r.permissions.length} PERMS
                  </span>
                </div>
                <h3 className="font-bold text-sm text-white">{r.role}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">{r.description}</p>
              </div>

              <div className="text-[10px] font-mono text-teal-400 font-bold flex items-center gap-1 pt-1">
                <span>View Full Privileges</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Role Detailed Permission Breakdown */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="border-b border-emerald-500/20 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <selectedRole.icon className="w-5 h-5 text-teal-400" />
              <h2 className="text-base font-bold text-white">{selectedRole.role} Authority Matrix</h2>
            </div>
            <p className="text-xs text-slate-400">Canonical Identifier: <code className="text-teal-300">{selectedRole.identifier}</code></p>
          </div>

          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/20">
            Server-Enforced via FastAPI Security Bearer
          </span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Authorized Platform Privileges:</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {selectedRole.permissions.map((p) => (
              <div
                key={p}
                className="p-3 rounded-xl bg-[#071C16] border border-emerald-500/10 flex items-center gap-2.5 text-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono text-[11px] text-slate-200">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
