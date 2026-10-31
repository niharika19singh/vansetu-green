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
  TrendingUp,
  Compass,
  Sun,
  IndianRupee,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';

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
          api.getMyCorridorAssignments(token),
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

  // Recharts delivery milestone schedule projection
  const milestoneData = [
    { week: 'W1', progress: 10, canopyTarget: 5 },
    { week: 'W3', progress: 25, canopyTarget: 15 },
    { week: 'W6', progress: 45, canopyTarget: 30 },
    { week: 'W9', progress: 65, canopyTarget: 50 },
    { week: 'W12', progress: 85, canopyTarget: 70 },
    { week: 'W16', progress: 100, canopyTarget: 95 },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Pro Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Briefcase className="w-48 h-48 text-blue-400" />
        </div>
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/40">
              ACCREDITED FIRM WORKSPACE
            </span>
            <span className="text-slate-400 text-xs">
              Empaneled Planning &amp; Engineering Partner • NCT Delhi Urban Climate Network
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Professional Climate Planning &amp; Tender Execution Console
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Prepare data-backed tender proposals, optimize corridor CapEx and 5-year maintenance
            lifecycles, evaluate segment-level tree suitability, and deliver municipal work
            packages under exclusive contracts.
          </p>
        </div>
      </div>

      {/* 4 Pro StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Assigned Corridors"
          value={myAssigned.length || 1}
          subtitle="Exclusive Municipal Work Packages"
          icon={Award}
          color="emerald"
        />
        <StatCard
          title="Open Tender Opportunities"
          value={openTenders.length}
          subtitle="RFPs Currently Accepting Bids"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Accreditation Tier"
          value="TIER-1"
          subtitle="COA &amp; ITPI Empanelled"
          icon={ShieldCheck}
          color="amber"
        />
        <StatCard
          title="Bid Capacity Ceiling"
          value="₹50.0L"
          subtitle="Direct Municipal Allotment Eligible"
          icon={IndianRupee}
          color="rose"
        />
      </div>

      {/* Mid Visual Row: Milestone Completion Chart & Awarded Work Packages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Milestone Delivery Schedule (7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Work-Package Delivery Schedule
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical implementation &amp; canopy maturity timeline (Weeks 1 to 16)
              </p>
            </div>
            <StatusBadge variant="success" showDot>
              ON TRACK
            </StatusBadge>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={milestoneData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="proProgressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="proCanopyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="week" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="progress"
                  name="Civil Progress %"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#proProgressGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="canopyTarget"
                  name="Canopy Growth %"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#proCanopyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* My Awarded Projects Spotlight (5 Columns) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white tracking-tight">
                Awarded Corridors
              </h3>
              <span className="text-xs text-slate-400 font-mono">Exclusive Contract</span>
            </div>

            <div className="space-y-3 mt-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      C-14
                    </span>
                    <span className="text-xs font-bold text-white">Chandni Chowk Heritage Spine</span>
                  </div>
                  <StatusBadge variant="warning" showDot>
                    IN PROGRESS
                  </StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                  <div>Sanction: <span className="text-amber-300 font-bold">₹8.50L</span></div>
                  <div>Phase: <span className="text-emerald-400 font-bold">Detailed Design</span></div>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-2">
                  <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '45%' }} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('my_assigned_projects')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
          >
            <span>View Full Work Packages</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Pro Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        <h2 className="text-sm font-bold text-white">Professional Planning Tools</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate && onNavigate('tender_marketplace')}
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
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
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
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
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
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
            className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/80 text-left transition space-y-1.5 group"
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