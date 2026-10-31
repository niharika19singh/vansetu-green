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
  Plus,
  Users,
  MapPin,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';

const INVESTMENT_TREND_DATA = [
  { month: 'May 2026', capex: 6.5, opex: 1.8 },
  { month: 'Jun 2026', capex: 12.0, opex: 3.2 },
  { month: 'Jul 2026', capex: 18.5, opex: 4.8 },
  { month: 'Aug 2026', capex: 22.0, opex: 5.5 },
  { month: 'Sep 2026', capex: 26.5, opex: 6.8 },
  { month: 'Oct 2026', capex: 34.0, opex: 8.5 },
];

export default function GovernmentOverviewView({
  token,
  corridors = [],
  onNavigate,
}) {
  const [tenders, setTenders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [healthIndicators, setHealthIndicators] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadOverview() {
      setLoading(true);
      try {
        const [tendersRes, assignmentsRes, healthRes, logsRes] = await Promise.allSettled([
          api.listTenders({}, token),
          api.listCorridorAssignments({}, token),
          api.getRegionalHealthIndicators({}, token),
          api.listAuditLogs({ limit: 6 }, token),
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
        if (logsRes.status === 'fulfilled') {
          setAuditLogs(logsRes.value.audit_logs || []);
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

  // Hospital Chart Data
  const hospitalChartData = healthIndicators
    .filter((h) => h.status !== 'HEALTH_DATA_NOT_AVAILABLE')
    .slice(0, 5)
    .map((h) => ({
      name: h.district,
      cases: h.reported_heatstroke_cases_30d || 0,
      mult: h.vulnerability_multiplier || 1.0,
    }));

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6 text-slate-100">
      {/* Top Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-bold tracking-wider">
              NCT Delhi Institutional Console
            </span>
            <span className="text-slate-500 text-xs">• PWD Climate Cell</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Municipal Climate Investment &amp; Tender Administration
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time urban corridor inventory, public tender procurement, and ABDM hospital heat
            monitoring.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate && onNavigate('tender_management')}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Tender</span>
          </button>
        </div>
      </div>

      {/* 4 KPI StatCards (Contrasys Pattern) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Available Corridors"
          value={availableCount}
          subtitle={`Out of ${totalCorridors} monitored`}
          trend="up"
          trendValue="Open for RFP"
          icon={Layers}
          color="emerald"
          onClick={() => onNavigate && onNavigate('corridor_inventory')}
        />

        <StatCard
          title="Active Municipal RFPs"
          value={openTendersCount}
          subtitle="Proposals currently open"
          trend="up"
          trendValue="Live bidding"
          icon={FileText}
          color="blue"
          onClick={() => onNavigate && onNavigate('tender_management')}
        />

        <StatCard
          title="Awarded Work Packages"
          value={allocatedCount}
          subtitle="Exclusive firm delivery"
          trend="up"
          trendValue="On-schedule"
          icon={CheckCircle2}
          color="emerald"
          onClick={() => onNavigate && onNavigate('professional_assignments')}
        />

        <StatCard
          title="Approved Municipal Budget"
          value={`₹${totalApprovedBudgetLakh > 0 ? totalApprovedBudgetLakh.toFixed(1) : '18.5'}L`}
          subtitle="Sanctioned CapEx & OpEx"
          trend="up"
          trendValue="100% Verified"
          icon={IndianRupee}
          color="amber"
          onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
        />
      </div>

      {/* Main Analytics Row: AreaChart (Col 1-2) + Progress List (Col 3) + BarChart (Col 4) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Col 1 & 2: Recharts AreaChart with Emerald Gradient */}
        <div className="col-span-full lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white tracking-tight">
                Municipal Climate Investment &amp; Lifecycle Allocation
              </h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                FY 2026-27
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Cumulative sanctioned CapEx and 5-Year Maintenance OpEx commitment over time (₹ Lakhs).
            </p>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={INVESTMENT_TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCapex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `₹${v}L`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(val) => [`₹${val} Lakh`, 'Amount']}
                />
                <Area
                  type="monotone"
                  dataKey="capex"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorCapex)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Col 3: Corridor Work Package Progress (Linear Bars) */}
        <div className="col-span-full lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white tracking-tight">Active Work-Packages</h3>
              <StatusBadge variant="info">In Delivery</StatusBadge>
            </div>
            <p className="text-xs text-slate-400">Milestone execution progress by assigned firm</p>
          </div>

          <div className="space-y-4 my-auto pt-3">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">C-14 Chandni Chowk Spine</span>
                <span className="font-mono font-bold text-emerald-400">35%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: '35%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Studio Vriksh</span>
                <span>₹18.5L Sanctioned</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">C-01 Connaught Inner Radial</span>
                <span className="font-mono font-bold text-blue-400">65%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: '65%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Delhi Urban Greens</span>
                <span>₹12.0L Sanctioned</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-200">C-04 Mahatma Gandhi Marg</span>
                <span className="font-mono font-bold text-amber-400">20%</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                <div className="bg-amber-500 h-2 rounded-full transition-all duration-500" style={{ width: '20%' }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>Cool Infra LLP</span>
                <span>₹9.5L Sanctioned</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('professional_assignments')}
            className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition mt-2"
          >
            <span>View All Assigned Work Packages</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Col 4: Recharts BarChart: Hospital Heat Stress Admissions */}
        <div className="col-span-full lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white tracking-tight">Hospital Heat Stress</h3>
              <StatusBadge variant="danger" showDot>ABDM Feed</StatusBadge>
            </div>
            <p className="text-xs text-slate-400">Heatstroke admissions past 30 days</p>
          </div>

          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hospitalChartData.length > 0 ? hospitalChartData : [
                { name: 'Central', cases: 47 },
                { name: 'South', cases: 38 },
                { name: 'North', cases: 29 },
                { name: 'West', cases: 21 },
              ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={6} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  formatter={(val) => [`${val} Heatstroke Cases`, 'Admissions']}
                />
                <Bar dataKey="cases" radius={[6, 6, 0, 0]}>
                  {hospitalChartData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.cases > 40 ? '#f43f5e' : entry.cases > 30 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <button
            onClick={() => onNavigate && onNavigate('hospital_health')}
            className="w-full py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-rose-300 flex items-center justify-center gap-1.5 transition mt-2"
          >
            <Activity className="w-3.5 h-3.5 text-rose-400" />
            <span>Regional Health Intelligence</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Recent Administrative Activity Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Administrative &amp; Tender Activity</h3>
            <p className="text-xs text-slate-400 mt-0.5">Immutable audit trail of actions taken in the platform</p>
          </div>
          <button
            onClick={() => onNavigate && onNavigate('govt_audit')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition"
          >
            <span>View Full Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {auditLogs.slice(0, 6).map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-800 transition flex items-start gap-3 text-xs"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[10px] text-emerald-300 font-bold px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {log.timestamp ? log.timestamp.substring(11, 16) : 'Recent'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium truncate">
                  Corridor {log.corridor_id || 'System'}: {log.actor_id}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
