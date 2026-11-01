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
  Edit3,
  X,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';

export default function MyAssignedProjectsView({ token, onNavigate }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [newProgressPct, setNewProgressPct] = useState(35);
  const [newStatus, setNewStatus] = useState('In Progress');
  const [progressNotes, setProgressNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState(null);

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

  const handleOpenProgressModal = (project) => {
    setActiveProject(project);
    setNewProgressPct(project.progress_pct || project.delivery_progress_pct || 35);
    setNewStatus(project.status === 'Completed' ? 'Completed' : 'In Progress');
    setProgressNotes(project.deliverables_notes || 'Civil site works progressing according to municipal greening schedule.');
    setProgressModalOpen(true);
  };

  const handleSaveProgress = async (e) => {
    if (e) e.preventDefault();
    if (!activeProject) return;
    setUpdating(true);
    try {
      const tenderId = activeProject.tender_id || activeProject.id?.replace('alloc-', '') || 'TND-2026-C14-01';
      await api.updateProjectProgress(
        tenderId,
        {
          progress_pct: Number(newProgressPct),
          status: newStatus,
          notes: progressNotes,
        },
        token
      );
      setActionSuccess(`Progress for ${activeProject.corridor_id} updated to ${newProgressPct}% (${newStatus}).`);
      setProgressModalOpen(false);
      setActiveProject(null);
      await loadAssignments();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error('Failed to update progress', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#071C16] text-slate-100 overflow-hidden font-body">
      {/* Top Header */}
      <div className="p-6 border-b border-emerald-500/20 bg-[#0D2821] shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold border border-teal-500/40">
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
            title="Total Contract Value"
            value={`₹${totalSanctioned.toFixed(2)}L`}
            subtitle="Sanctioned Capital"
            icon={IndianRupee}
            color="amber"
          />
          <StatCard
            title="Active Delivery Phase"
            value={assignments.length > 0 ? 'PHASE 2' : 'STANDBY'}
            subtitle="Detailed Urban Design & Civil Work"
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

      {actionSuccess && (
        <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">Loading awarded projects...</div>
        )}

        {!loading && assignments.length === 0 && (
          <div className="p-12 text-center bg-[#0D2821]/50 border border-emerald-500/20 rounded-2xl space-y-3">
            <Award className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Awarded Corridor Projects Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your accredited firm does not have any active corridor allocations yet. Browse open tenders in the Tender Marketplace and submit a proposal to win an exclusive corridor allocation.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('tender_marketplace')}
                className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow"
              >
                <span>Browse Open Tenders</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="space-y-5">
          {assignments.map((a) => {
            const currentPct = Number(a.progress_pct || a.delivery_progress_pct || 35);
            const status = a.status || 'Awarded';
            return (
              <div
                key={a.id || a.allocation_id}
                className="bg-[#0D2821] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-6 space-y-5 shadow-sm transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-emerald-500/20 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-teal-300 bg-teal-500/20 px-2.5 py-1 rounded border border-teal-500/30">
                        {a.corridor_id}
                      </span>
                      <h2 className="text-base font-bold text-white">
                        {a.corridor_id === 'C-14'
                          ? 'Chandni Chowk Pedestrian Heritage Spine'
                          : a.corridor_id === 'C-01'
                          ? 'Ring Road (AIIMS-Safdarjung) Climate Refuge Corridor'
                          : `Corridor ${a.corridor_id} Urban Greening`}
                      </h2>
                    </div>
                    <div className="text-xs text-slate-400 mt-1.5 font-mono">
                      Allocation ID: <span className="text-slate-300">{a.id}</span> • Assigned Contractor:{' '}
                      <span className="text-emerald-400 font-semibold">
                        {a.assigned_professional_org || a.firm_name || 'Studio Vriksh & Urban Resiliency Partners'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge variant={status === 'Completed' ? 'success' : 'info'} showDot>
                      {status.toUpperCase()}
                    </StatusBadge>
                    <button
                      onClick={() => handleOpenProgressModal(a)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Update Delivery Progress</span>
                    </button>
                  </div>
                </div>

                {/* Budget, Timeline, and Scope Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#071C16] p-4 rounded-xl border border-emerald-500/15 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Contract Value</span>
                    <span className="text-amber-300 font-bold text-base">
                      ₹{a.approved_budget_lakh ? Number(a.approved_budget_lakh).toFixed(2) : '18.50'} Lakh
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Awarded Date</span>
                    <span className="text-slate-300 font-bold text-base">
                      {a.allocated_at ? a.allocated_at.substring(0, 10) : '2026-09-01'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Target Timeline</span>
                    <span className="text-emerald-400 font-bold text-base">16 Weeks</span>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div className="space-y-1.5 bg-[#071C16]/80 p-4 rounded-xl border border-emerald-500/15">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Delivery Completion Progress</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{currentPct}% Completed</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-emerald-500/20">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(5, currentPct))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono pt-1">
                    <span>Phase 1: GPR Survey (100%)</span>
                    <span>Phase 2: Tree Pit Excavation ({currentPct >= 70 ? 'Done' : 'Active'})</span>
                    <span>Phase 3: Handover &amp; Audit ({currentPct >= 100 ? 'Complete' : 'Pending'})</span>
                  </div>
                </div>

                {/* Deliverables Notes */}
                {a.scope_summary && (
                  <div className="text-xs text-slate-300 bg-[#071C16]/60 p-4 rounded-xl border border-emerald-500/15 space-y-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">
                      Contract Deliverables &amp; Scope of Works
                    </span>
                    <p className="leading-relaxed">{a.scope_summary}</p>
                  </div>
                )}

                {/* Quick Navigation to Design Features */}
                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                  <button
                    onClick={() => onNavigate && onNavigate('suitability')}
                    className="px-3.5 py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-slate-200 flex items-center gap-2 transition font-medium"
                  >
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Right Tree, Right Place (Species)</span>
                  </button>

                  <button
                    onClick={() => onNavigate && onNavigate('shade')}
                    className="px-3.5 py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-slate-200 flex items-center gap-2 transition font-medium"
                  >
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Pedestrian Shade Continuity</span>
                  </button>

                  <button
                    onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
                    className="px-3.5 py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-slate-200 flex items-center gap-2 transition font-medium"
                  >
                    <IndianRupee className="w-4 h-4 text-blue-400" />
                    <span>Corridor Cost &amp; Lifecycle OpEx</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Update Modal */}
      {progressModalOpen && activeProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D2821] border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Update Delivery Progress: {activeProject.corridor_id}
                </h3>
                <p className="text-xs text-slate-400">Record milestone completion in municipal record</p>
              </div>
              <button
                onClick={() => setProgressModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProgress} className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium">Completion Percentage</label>
                  <span className="font-mono font-bold text-emerald-400 text-sm">{newProgressPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={newProgressPct}
                  onChange={(e) => setNewProgressPct(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Delivery Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none"
                >
                  <option value="Awarded">Awarded (Mobilization)</option>
                  <option value="In Progress">In Progress (Active Civil Execution)</option>
                  <option value="Completed">Completed (Ready for Municipal Audit)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Progress Notes / Milestone Summary</label>
                <textarea
                  rows={3}
                  required
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setProgressModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Check className="w-4 h-4" />
                  <span>{updating ? 'Saving...' : 'Save & Sync Progress'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
