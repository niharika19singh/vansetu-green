import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  IndianRupee,
  Layers,
  Trees,
  Thermometer,
  Search,
} from 'lucide-react';
import { api } from '../api/client';
import {
  safeToFixed,
  formatCurrencyCrore,
  formatCurrencyLakh,
  formatPercentage,
} from '../utils/numericFormat';
import { DELHI_DISTRICTS_LIST, DISTRICT_CLIMATE_DATA } from './PublicCitizenDashboardView';

export const DISTRICT_GOVERNANCE_DATA = [
  { district: 'Central', authority: 'PWD Central Zone / MCD City SP Zone', corridorsCount: 6, priorityCorridors: 'C-05, C-14, C-27', budgetAllocatedLakh: 48.5, budgetSpentLakh: 32.0, heatRisk: 'Severe', status: 'ACTIVE_SANCTIONS' },
  { district: 'New Delhi', authority: 'NDMC / PWD Civil Lines', corridorsCount: 4, priorityCorridors: 'C-05, C-09', budgetAllocatedLakh: 28.0, budgetSpentLakh: 24.5, heatRisk: 'Moderate', status: 'COMPLIANT' },
  { district: 'South', authority: 'PWD South Zone / MCD South Zone', corridorsCount: 7, priorityCorridors: 'C-01, C-08, C-14', budgetAllocatedLakh: 65.0, budgetSpentLakh: 41.2, heatRisk: 'High', status: 'ACTIVE_SANCTIONS' },
  { district: 'North', authority: 'PWD North Zone / MCD Civil Lines', corridorsCount: 5, priorityCorridors: 'C-19, C-25', budgetAllocatedLakh: 52.0, budgetSpentLakh: 28.0, heatRisk: 'Critical', status: 'NEEDS_ACCELERATION' },
  { district: 'North East', authority: 'PWD North East / MCD Shahdara North', corridorsCount: 4, priorityCorridors: 'C-33, C-38', budgetAllocatedLakh: 44.0, budgetSpentLakh: 18.5, heatRisk: 'Critical', status: 'NEEDS_ACCELERATION' },
  { district: 'North West', authority: 'PWD North West / MCD Rohini Zone', corridorsCount: 5, priorityCorridors: 'C-02, C-15', budgetAllocatedLakh: 58.0, budgetSpentLakh: 34.0, heatRisk: 'Critical', status: 'ACTIVE_SANCTIONS' },
  { district: 'East', authority: 'PWD East Zone / MCD Shahdara South', corridorsCount: 4, priorityCorridors: 'C-22, C-29', budgetAllocatedLakh: 38.0, budgetSpentLakh: 22.0, heatRisk: 'High', status: 'ACTIVE_SANCTIONS' },
  { district: 'West', authority: 'PWD West Zone / MCD West Zone', corridorsCount: 4, priorityCorridors: 'C-31, C-36', budgetAllocatedLakh: 42.0, budgetSpentLakh: 29.5, heatRisk: 'High', status: 'ACTIVE_SANCTIONS' },
  { district: 'South West', authority: 'PWD South West / MCD Najafgarh Zone', corridorsCount: 3, priorityCorridors: 'C-04, C-18', budgetAllocatedLakh: 35.0, budgetSpentLakh: 26.0, heatRisk: 'Moderate', status: 'COMPLIANT' },
  { district: 'South East', authority: 'PWD South East / MCD Central Zone', corridorsCount: 5, priorityCorridors: 'C-12, C-17', budgetAllocatedLakh: 49.0, budgetSpentLakh: 33.5, heatRisk: 'Severe', status: 'ACTIVE_SANCTIONS' },
  { district: 'Shahdara', authority: 'PWD Shahdara / MCD Shahdara North', corridorsCount: 4, priorityCorridors: 'C-20, C-42', budgetAllocatedLakh: 39.0, budgetSpentLakh: 16.0, heatRisk: 'Critical', status: 'NEEDS_ACCELERATION' },
];

export default function GovtDistrictAdminView({ token, onNavigate }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredDistricts = DISTRICT_GOVERNANCE_DATA.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        d.district.toLowerCase().includes(q) ||
        d.authority.toLowerCase().includes(q) ||
        d.priorityCorridors.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalBudget = DISTRICT_GOVERNANCE_DATA.reduce((acc, d) => acc + d.budgetAllocatedLakh, 0);
  const totalSpent = DISTRICT_GOVERNANCE_DATA.reduce((acc, d) => acc + d.budgetSpentLakh, 0);

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#0D2821] to-[#071C16] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                NCT DELHI DISTRICT GOVERNANCE CONSOLE
              </span>
              <span className="text-slate-400 text-xs">All 11 Administrative Revenue Districts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              District Administration &amp; Inter-Zonal Coordination
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Monitor greening targets, review budget allocations vs actual disbursements across all 11 districts,
              and coordinate works between PWD Zonal Divisions and Municipal Corporation of Delhi (MCD).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 text-right shrink-0">
            <span className="text-[11px] text-slate-400 block font-mono">Total Municipal Sanction</span>
            <div className="text-2xl font-black text-emerald-300 font-mono">
              {formatCurrencyCrore(totalBudget / 100, 2)}
            </div>
            <span className="text-[11px] text-slate-400">
              Spent: {formatCurrencyCrore(totalSpent / 100, 2)} ({totalBudget > 0 ? formatPercentage(totalSpent / totalBudget, 1) : '0.0%'})
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search district, authority, or priority corridor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#071C16] border border-emerald-500/30 rounded-lg px-3 py-1.5 text-xs text-white font-medium focus:outline-none"
          >
            <option value="ALL">All Statuses (11 Districts)</option>
            <option value="ACTIVE_SANCTIONS">Active Sanctions</option>
            <option value="NEEDS_ACCELERATION">Needs Acceleration</option>
            <option value="COMPLIANT">Compliant</option>
          </select>
        </div>
      </div>

      {/* District Governance Table */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071C16] text-[11px] text-slate-400 font-mono uppercase tracking-wider border-b border-emerald-500/20">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Administrative Authority</th>
                <th className="py-3 px-4 text-center">Corridors</th>
                <th className="py-3 px-4">Priority Corridors</th>
                <th className="py-3 px-4 text-right">Sanction (Lakh)</th>
                <th className="py-3 px-4 text-right">Disbursed (Lakh)</th>
                <th className="py-3 px-4 text-center">Heat Risk</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-500/10">
              {filteredDistricts.map((d) => (
                <tr key={d.district} className="hover:bg-white/5 transition">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-teal-400" />
                    <span>{d.district} Delhi</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-medium text-[11px]">
                    {d.authority}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-bold text-teal-300">
                    {d.corridorsCount}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-amber-300">
                    {d.priorityCorridors}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                    {formatCurrencyLakh(d.budgetAllocatedLakh, 1)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                    {formatCurrencyLakh(d.budgetSpentLakh, 1)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      d.heatRisk === 'Critical'
                        ? 'bg-rose-500/20 text-rose-300'
                        : d.heatRisk === 'Severe'
                        ? 'bg-orange-500/20 text-orange-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {d.heatRisk}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      d.status === 'COMPLIANT'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : d.status === 'NEEDS_ACCELERATION'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-blue-500/20 text-blue-300'
                    }`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate && onNavigate('tender_management')}
                      className="px-2.5 py-1 rounded bg-[#071C16] hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-[11px] font-semibold text-slate-300 transition"
                    >
                      Manage Tenders
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
