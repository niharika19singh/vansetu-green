import React from 'react';
import {
  Building2,
  Briefcase,
  Globe2,
  Shield,
  KeyRound,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export default function RoleHeader({
  currentUser,
  currentRole,
  onSwitchRole,
  switchingRole,
}) {
  const isGovt = currentRole === 'government_admin' || currentRole === 'government_engineer';
  const isPro = currentRole === 'pro_professional';
  const isNormal = currentRole === 'normal_user';

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left: Role Banner & Organization Identity */}
      <div className="flex items-center gap-3">
        {isGovt && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 flex items-center gap-1.5 tracking-wide">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              GOVERNMENT INSTITUTIONAL WORKSPACE
            </span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              Municipal Corporation of Delhi • PWD Climate Action Cell
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

        {isNormal && (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center gap-1.5 tracking-wide">
              <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
              PUBLIC CLIMATE DISCOVERY
            </span>
            <span className="text-slate-400 hidden md:inline text-[11px]">
              NCT Delhi Urban Heat & Green Infrastructure Observatory
            </span>
          </div>
        )}
      </div>

      {/* Right: Quick Persona Switcher for Evaluation & Demonstrations */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-[11px] text-slate-400 hidden sm:inline">Active Persona:</span>
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => onSwitchRole('government_admin')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isGovt
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Institutional municipal engineer & admin controls"
          >
            <Building2 className="w-3 h-3" />
            <span>Govt Admin</span>
          </button>

          <button
            onClick={() => onSwitchRole('pro_professional')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isPro
                ? 'bg-blue-600 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Paid professional architectural and planning workspace"
          >
            <Briefcase className="w-3 h-3" />
            <span>Pro Professional</span>
          </button>

          <button
            onClick={() => onSwitchRole('normal_user')}
            disabled={switchingRole}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 ${
              isNormal
                ? 'bg-slate-700 text-white shadow-sm font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Free public citizen discovery and climate overview"
          >
            <Globe2 className="w-3 h-3" />
            <span>Public Citizen</span>
          </button>
        </div>

        {currentUser?.user_id && (
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/80 border border-slate-800 font-mono text-[10px] text-slate-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>{currentUser.user_id}</span>
          </div>
        )}
      </div>
    </div>
  );
}
