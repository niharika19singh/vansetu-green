import React from 'react';
import {
  Building2,
  Briefcase,
  Globe2,
  Shield,
  HardHat,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export default function RoleHeader({
  currentUser,
  currentRole,
  onSwitchRole,
  switchingRole,
}) {
  const normRole = (currentRole || '').toLowerCase();
  const isGovtAdmin = normRole === 'government_admin' || normRole === 'admin';
  const isGovtEngineer = normRole === 'government_engineer' || normRole === 'engineer';
  const isPro = normRole === 'pro_professional' || normRole === 'pro';
  const isPublic = normRole === 'public_citizen' || normRole === 'normal_user' || (!isGovtAdmin && !isGovtEngineer && !isPro);

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0 select-none">
      {/* Left: Role Banner & Organization Identity */}
      <div className="flex items-center gap-3">
        {isGovtAdmin && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              GOVERNMENT INSTITUTIONAL WORKSPACE • ADMIN
            </span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              Municipal Corporation of Delhi • PWD Climate Action Cell
            </span>
          </div>
        )}

        {isGovtEngineer && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 flex items-center gap-1.5 tracking-wide">
              <HardHat className="w-3.5 h-3.5 text-amber-400" />
              GOVERNMENT ENGINEER WORKSPACE
            </span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              Delhi PWD Civil Maintenance &amp; Field Verification Division
            </span>
          </div>
        )}

        {isPro && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40 flex items-center gap-1.5 tracking-wide">
              <Briefcase className="w-3.5 h-3.5 text-blue-400" />
              PAID PROFESSIONAL WORKSPACE
            </span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              Studio Vriksh Landscape Architects • COA Accredited Firm
            </span>
          </div>
        )}

        {isPublic && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40 flex items-center gap-1.5 tracking-wide">
              <Globe2 className="w-3.5 h-3.5 text-teal-400" />
              PUBLIC CLIMATE DISCOVERY • CITIZEN
            </span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              NCT Delhi Urban Heat &amp; Green Walking Observatory
            </span>
          </div>
        )}
      </div>

      {/* Right: Quick Persona Switcher for Evaluation & Demonstrations */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[11px] text-slate-400 hidden sm:inline">Active Workspace:</span>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {/* 1. Public Citizen */}
          <button
            onClick={() => onSwitchRole('public_citizen')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isPublic
                ? 'bg-teal-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Free public citizen discovery, heat guide, and reporting"
          >
            <Globe2 className="w-3 h-3" />
            <span>Public Citizen</span>
          </button>

          {/* 2. Pro Professional */}
          <button
            onClick={() => onSwitchRole('pro_professional')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isPro
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Technical planning console, modeling, prediction, and tender proposals"
          >
            <Briefcase className="w-3 h-3" />
            <span>Pro Professional</span>
          </button>

          {/* 3. Govt Admin */}
          <button
            onClick={() => onSwitchRole('government_admin')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isGovtAdmin
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Municipal administration, budget sanctions, tender awards, and audit"
          >
            <Building2 className="w-3 h-3" />
            <span>Govt Admin</span>
          </button>

          {/* 4. Govt Engineer */}
          <button
            onClick={() => onSwitchRole('government_engineer')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isGovtEngineer
                ? 'bg-amber-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Field engineering feasibility, trial pits, IRC:103 widths, and survey signoff"
          >
            <HardHat className="w-3 h-3" />
            <span>Govt Engineer</span>
          </button>
        </div>

        {currentUser?.user_id && (
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/80 border border-slate-800 font-mono text-[10px] text-slate-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>{currentUser.user_id}</span>
          </div>
        )}
      </div>
    </div>
  );
}
