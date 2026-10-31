import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  Award,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  Calculator,
  Cpu,
  FolderKanban,
  FileText,
} from 'lucide-react';
import { api } from '../api/client';

export default function ProDashboardView({ token, onNavigate }) {
  const [tenders, setTenders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const [tenRes, assignRes] = await Promise.allSettled([
          api.listTenders({}, token),
          api.listCorridorAssignments({}, token),
        ]);
        if (!mounted) return;
        if (tenRes.status === 'fulfilled') {
          setTenders(tenRes.value.tenders || []);
        }
        if (assignRes.status === 'fulfilled') {
          setAssignments(assignRes.value.assignments || []);
        }
      } catch (err) {
        console.error('Failed to load pro dashboard data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [token]);

  const openTenders = tenders.filter((t) => t.status === 'PUBLISHED');
  const myAssigned = assignments.filter((a) =>
    ['ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(a.status)
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Pro Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Briefcase className="w-48 h-48 text-blue-400" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/40">
              ACCREDITED FIRM WORKSPACE
            </span>
            <span className="text-slate-400 text-xs">
              Studio Vriksh Landscape Architects • COA Reg: CA/2021/DEL-9842
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Professional Climate Planning &amp; Tender Execution Console
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Prepare data-backed tender proposals, optimize corridor CapEx and 5-year maintenance
            lifecycles, evaluate segment-level tree suitability, and deliver municipal work
            packages.
          </p>
        </div>
      </div>

      {/* Pro Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: My Exclusive Corridor Assignments */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">My Assigned Corridors</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {myAssigned.length || 1}
            </span>
            <span className="text-xs text-slate-400">exclusive work package</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Corridors officially awarded to your firm under municipal contract.
          </p>
        </div>

        {/* Card 2: Open Tender Opportunities */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Open Tender Opportunities</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-400 font-mono">
              {openTenders.length}
            </span>
            <span className="text-xs text-slate-400">RFPs accepting bids</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Municipal climate corridor tenders open for competitive proposal submission.
          </p>
        </div>

        {/* Card 3: Credential & Compliance Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Accreditation Tier</span>
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-300 font-mono">TIER-1 VERIFIED</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Verified by Municipal Urban Planning Cell • Eligible for direct bidding up to ₹50L.
          </p>
        </div>
      </div>

      {/* Quick Pro Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">Professional Planning Tools</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate && onNavigate('tender_marketplace')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-blue-300">
                Tender Marketplace
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition" />
            </div>
            <p className="text-[11px] text-slate-400">
              Browse RFPs, verify corridor availability, and submit proposals.
            </p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-blue-300">
                Cost Optimizer (MILP)
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition" />
            </div>
            <p className="text-[11px] text-slate-400">
              Calculate optimal CapEx and 5-year maintenance budgets for bids.
            </p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('intervention_intelligence')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-blue-300">
                ML Interventions
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition" />
            </div>
            <p className="text-[11px] text-slate-400">
              Evidence-based AI recommendations for individual road segments.
            </p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('my_assigned_projects')}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-blue-300">
                My Assigned Projects
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-400 transition" />
            </div>
            <p className="text-[11px] text-slate-400">
              Track milestones and delivery schedules for awarded corridors.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
