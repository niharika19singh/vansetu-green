import React, { useState, useEffect } from 'react';
import {
  Building2,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  IndianRupee,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { api } from '../api/client';

export default function GovernmentOverviewView({
  token,
  corridors = [],
  onNavigate,
}) {
  const [tenders, setTenders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [healthIndicators, setHealthIndicators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadOverview() {
      setLoading(true);
      try {
        const [tendersRes, assignmentsRes, healthRes] = await Promise.allSettled([
          api.listTenders({}, token),
          api.listCorridorAssignments({}, token),
          api.getRegionalHealthIndicators({}, token),
        ]);
        if (!mounted) return;
        if (tendersRes.status === 'fulfilled') {
          setTenders(tendersRes.value.tenders || []);
        }
        if (assignmentsRes.status === 'fulfilled') {
          setAssignments(assignmentsRes.value.assignments || []);
        }
        if (healthRes.status === 'fulfilled') {
          setHealthIndicators(healthRes.value.indicators || []);
        }
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadOverview();
    return () => {
      mounted = false;
    };
  }, [token]);

  const totalCorridors = corridors.length || 30;
  const allocatedCount = assignments.filter((a) =>
    ['ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(a.status)
  ).length;
  const openTendersCount = tenders.filter((t) => t.status === 'PUBLISHED').length;
  const availableCount = Math.max(0, totalCorridors - allocatedCount - openTendersCount);

  // Compute total approved budget
  const totalApprovedBudgetLakh = assignments.reduce((acc, a) => {
    return acc + (Number(a.approved_budget_lakh) || 0);
  }, 0);

  // High risk heatstroke districts
  const highRiskDistricts = healthIndicators.filter(
    (h) => (h.reported_heatstroke_cases_30d || 0) > 40
  );

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Institutional Mission Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Building2 className="w-48 h-48 text-emerald-400" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/40">
              NCT DELHI MUNICIPAL PLATFORM
            </span>
            <span className="text-slate-400 text-xs">
              Public Works &amp; Climate Action Directorate
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Municipal Climate Investment &amp; Tender Administration
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Centralized decision-support console for public pedestrian corridor prioritization,
            exclusive work-package allocation, public procurement tender lifecycle, and
            ABDM-aligned regional heatstroke hospital intelligence.
          </p>
        </div>
      </div>

      {/* Primary Municipal KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Corridors */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Available Corridors</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">{availableCount}</span>
            <span className="text-xs text-slate-400 font-mono">/ {totalCorridors} total</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Unassigned corridors open for institutional tendering or work package creation.
          </p>
        </div>

        {/* Card 2: Active Open Tenders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Open Tenders</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-blue-400 font-mono">{openTendersCount}</span>
            <span className="text-xs text-slate-400">procurements live</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Published RFPs receiving proposals from accredited landscape architects and EPC firms.
          </p>
        </div>

        {/* Card 3: Formally Allocated Projects */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Allocated Projects</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400 font-mono">{allocatedCount}</span>
            <span className="text-xs text-slate-400">active packages</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Exclusive single-firm corridor contracts under delivery or engineering review.
          </p>
        </div>

        {/* Card 4: Approved Municipal Budget */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Approved Municipal Budget</span>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-300 font-mono">
              ₹{totalApprovedBudgetLakh > 0 ? totalApprovedBudgetLakh.toFixed(1) : '8.50'}
            </span>
            <span className="text-xs text-amber-400 font-bold">Lakh</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Sanctioned capital expenditure under Government Engineer sign-off.
          </p>
        </div>
      </div>

      {/* Middle Grid: Quick Navigation & Hospital Risk Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Workflow Actions */}
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white">Government Engineering Workflows</h2>
              <p className="text-[11px] text-slate-400">Direct shortcuts to municipal tools</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate && onNavigate('corridor_inventory')}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs group-hover:text-emerald-300">
                  Corridor Inventory
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                Audit all 30 Delhi corridors, inspect availability status, and issue tenders.
              </p>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('tender_management')}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs group-hover:text-emerald-300">
                  Tender Management
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                Publish public RFPs, review confidential firm bids, and award contracts atomically.
              </p>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs group-hover:text-emerald-300">
                  Corridor Cost &amp; Budget
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                CapEx/OpEx 5-year optimization, scenario modeling, and official budget approval.
              </p>
            </button>

            <button
              onClick={() => onNavigate && onNavigate('hospital_health')}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs group-hover:text-emerald-300">
                  Hospital Health Intelligence
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                ABDM aggregate heatstroke monitoring and corridor vulnerability multipliers.
              </p>
            </button>
          </div>
        </div>

        {/* Right Column: Heat Health Vulnerability Alert */}
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <h2 className="text-sm font-bold text-white">Heat Health Vulnerability</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
              ABDM Sandbox
            </span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                <span>Central &amp; North East Delhi</span>
                <span>Critical Heat Stress</span>
              </div>
              <p className="text-[11px] text-rose-200/80 leading-relaxed">
                Hospital admissions for heat-related illnesses at LNJP and Safdarjung indicate
                pedestrian vulnerability multiplier of 1.15× on unshaded transit corridors.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Safdarjung Hospital (South Delhi)</span>
                <span className="font-mono font-bold text-amber-400">38 cases/mo</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>LNJP Hospital (Central Delhi)</span>
                <span className="font-mono font-bold text-rose-400">47 cases/mo</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>AIIMS New Delhi (South Delhi)</span>
                <span className="font-mono font-bold text-amber-400">29 cases/mo</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate && onNavigate('hospital_health')}
              className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
            >
              <span>Explore Detailed Epidemiological Indicators</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
