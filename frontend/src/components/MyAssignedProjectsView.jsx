import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Layers,
  Calendar,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Compass,
  Sun,
  Activity,
  ArrowRight,
  Briefcase,
  Trees,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';

export default function MyAssignedProjectsView({ token, onNavigate }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMyCorridorAssignments(token);
      setAssignments(res.assignments || []);
    } catch (err) {
      console.error('Failed to load assignments', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const totalSanctioned = assignments.reduce(
    (sum, a) => sum + (Number(a.approved_budget_lakh) || 0),
    0
  );

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
                CONTRACTED WORK PACKAGES
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                My Awarded Corridor Projects
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Exclusive municipal contracts assigned to your accredited firm for climate intervention delivery
              with guaranteed single-firm corridor exclusivity.
            </p>
          </div>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Awarded Work Packages"
            value={assignments.length}
            subtitle="Exclusive Project Sites"
            icon={Award}
            color="emerald"
          />
          <StatCard
            title="Total Sanctioned Capital"
            value={`₹${totalSanctioned.toFixed(2)}L`}
            subtitle="Municipal Greening Fund"
            icon={IndianRupee}
            color="amber"
          />
          <StatCard
            title="Active Delivery Phase"
            value={assignments.length > 0 ? "PHASE 2" : "STANDBY"}
            subtitle="Detailed Urban Design"
            icon={Layers}
            color="blue"
          />
          <StatCard
            title="Exclusivity Status"
            value="100% PROTECTED"
            subtitle="Strict Single-Party Allotment"
            icon={ShieldCheck}
            color="rose"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading awarded projects...</div>
        )}

        {!loading && assignments.length === 0 && (
          <div className="p-12 text-center bg-slate-900/50 border border-slate-800 rounded-2xl space-y-3">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Awarded Corridor Projects Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your accredited firm does not have any active corridor allocations yet. Browse open tenders in the Tender Marketplace and submit a proposal to win an exclusive corridor allocation.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('tenders')}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5"
              >
                <span>Browse Open Tenders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="space-y-5">
          {assignments.map((a) => (
            <div
              key={a.id || a.allocation_id}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 space-y-5 shadow-sm transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                      {a.corridor_id}
                    </span>
                    <h2 className="text-base font-bold text-white">
                      {a.corridor_id === 'C-14'
                        ? 'Chandni Chowk Pedestrian Heritage Spine'
                        : `Corridor ${a.corridor_id} Urban Greening`}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-400 mt-1.5 font-mono">
                    Allocation ID: <span className="text-slate-300">{a.id}</span> • Firm:{' '}
                    <span className="text-blue-400 font-semibold">
                      {a.firm_name || 'Studio Vriksh'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge variant="success" showDot>
                    {a.status} (EXCLUSIVE)
                  </StatusBadge>
                </div>
              </div>

              {/* Budget and Scope Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-850 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Sanctioned Budget
                  </span>
                  <span className="text-amber-300 font-bold text-base">
                    ₹{a.approved_budget_lakh || '8.50'} Lakh
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Execution Date
                  </span>
                  <span className="text-slate-300 font-bold text-base">
                    {a.allocated_at ? a.allocated_at.substring(0, 10) : '2026-10-31'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Milestone Horizon
                  </span>
                  <span className="text-emerald-400 font-bold text-base">PHASE 2 (DESIGN)</span>
                </div>
              </div>

              {/* Milestone Progress Bar */}
              <div className="space-y-1.5 bg-slate-950/60 p-4 rounded-xl border border-slate-850">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Implementation Milestones</span>
                  <span className="font-mono text-emerald-400 font-bold">45% Completed</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '45%' }} />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                  <span>Phase 1: GPR Survey (Done)</span>
                  <span>Phase 2: Tree Pit Excavation (In Progress)</span>
                  <span>Phase 3: Handover (Pending)</span>
                </div>
              </div>

              {/* Deliverables Notes */}
              {a.deliverables_notes && (
                <div className="text-xs text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-850 space-y-1">
                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                    Contract Deliverables &amp; Scope
                  </span>
                  <p className="leading-relaxed">{a.deliverables_notes}</p>
                </div>
              )}

              {/* Quick Jump Buttons to Engineering Features */}
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => onNavigate && onNavigate('suitability')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition font-medium"
                >
                  <Compass className="w-4 h-4 text-emerald-400" />
                  <span>Right Tree, Right Place (Species)</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('shade')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition font-medium"
                >
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Pedestrian Shade Continuity</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2 transition font-medium"
                >
                  <IndianRupee className="w-4 h-4 text-blue-400" />
                  <span>Corridor Cost &amp; Lifecycle OpEx</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}