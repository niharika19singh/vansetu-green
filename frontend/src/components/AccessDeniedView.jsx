import React from 'react';
import { ShieldAlert, ArrowRight, Lock, UserCheck } from 'lucide-react';

export const ROLE_DISPLAY_NAMES = {
  normal_user: 'Public Citizen',
  pro_professional: 'Pro Professional',
  government_admin: 'Government Admin',
  government_engineer: 'Government Engineer',
};

export default function AccessDeniedView({ requiredRole, userRole, onSwitchRole, message }) {
  const reqName = ROLE_DISPLAY_NAMES[requiredRole] || (requiredRole ? requiredRole.replace('_', ' ').toUpperCase() : 'Authorized');
  const userRoleName = ROLE_DISPLAY_NAMES[userRole] || (userRole ? userRole.replace('_', ' ').toUpperCase() : 'Public Citizen');

  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-950 text-slate-100">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">
            Access Restricted
          </span>
          <h2 className="text-lg font-bold text-white mt-2">
            Role Permission Required
          </h2>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            {message || `This workspace area is restricted to ${reqName} personnel.`}
          </p>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-slate-400">
            <span>Your Active Persona:</span>
            <span className="text-rose-400 font-bold">{userRoleName}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Required Persona:</span>
            <span className="text-emerald-400 font-bold">{reqName}</span>
          </div>
        </div>

        {onSwitchRole && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <p className="text-[11px] text-slate-400">
              Demonstration Mode: Switch persona to explore this workspace
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onSwitchRole('government_admin')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Switch to Govt Admin</span>
              </button>
              <button
                onClick={() => onSwitchRole('pro_professional')}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Switch to Pro Firm</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
