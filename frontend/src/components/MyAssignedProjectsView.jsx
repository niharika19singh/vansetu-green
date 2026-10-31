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
} from 'lucide-react';
import { api } from '../api/client';

export default function MyAssignedProjectsView({ token, onNavigate }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listCorridorAssignments({}, token);
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

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
            CONTRACTED WORK PACKAGES
          </span>
          <h1 className="text-lg font-bold text-white">My Awarded Corridor Projects</h1>
        </div>
        <p className="text-xs text-slate-400">
          Exclusive municipal contracts assigned to Studio Vriksh for climate intervention delivery.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500">Loading awarded projects...</div>
        )}

        <div className="space-y-4">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-6 space-y-4 shadow-lg"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {a.corridor_id}
                    </span>
                    <h2 className="text-base font-bold text-white">
                      {a.corridor_id === 'C-14'
                        ? 'Chandni Chowk Pedestrian Heritage Spine'
                        : `Corridor ${a.corridor_id} Urban Greening`}
                    </h2>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Allocation ID: <span className="font-mono text-slate-300">{a.id}</span> •
                    Firm: <span className="text-blue-400 font-semibold">{a.firm_name || 'Studio Vriksh'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{a.status} (EXCLUSIVE)</span>
                  </span>
                </div>
              </div>

              {/* Budget and Scope Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Sanctioned Budget
                  </span>
                  <span className="text-amber-300 font-bold text-sm">
                    ₹{a.approved_budget_lakh || '8.50'} Lakh
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Contract Execution Date
                  </span>
                  <span className="text-slate-300 font-bold">
                    {a.allocated_at ? a.allocated_at.substring(0, 10) : '2026-10-31'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">
                    Implementation Phase
                  </span>
                  <span className="text-emerald-400 font-bold">DETAILED DESIGN (PHASE 2)</span>
                </div>
              </div>

              {/* Deliverables Notes */}
              {a.deliverables_notes && (
                <div className="text-xs text-slate-300 bg-slate-950/60 p-3.5 rounded-xl border border-slate-850 space-y-1">
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
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition font-medium"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Right Tree, Right Place (Species)</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('shade')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition font-medium"
                >
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pedestrian Shade Continuity</span>
                </button>

                <button
                  onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition font-medium"
                >
                  <IndianRupee className="w-3.5 h-3.5 text-blue-400" />
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
