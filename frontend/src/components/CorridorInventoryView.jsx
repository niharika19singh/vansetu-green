import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ExternalLink,
  Shield,
  Briefcase,
  IndianRupee,
} from 'lucide-react';
import { api } from '../api/client';

export default function CorridorInventoryView({
  token,
  corridors = [],
  onNavigate,
  onOpenTenderModal,
}) {
  const [assignments, setAssignments] = useState([]);
  const [tenders, setTenders] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadAllocations() {
      setLoading(true);
      try {
        const [assignRes, tenderRes] = await Promise.allSettled([
          api.listCorridorAssignments({}, token),
          api.listTenders({}, token),
        ]);
        if (!mounted) return;
        if (assignRes.status === 'fulfilled') {
          setAssignments(assignRes.value.assignments || []);
        }
        if (tenderRes.status === 'fulfilled') {
          setTenders(tenderRes.value.tenders || []);
        }
      } catch (err) {
        console.error('Failed to load corridor allocations', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadAllocations();
    return () => {
      mounted = false;
    };
  }, [token]);

  // Map each corridor to its allocation / tender status
  const inventory = useMemo(() => {
    return corridors.map((c) => {
      const code = c.code || c.id;
      const assign = assignments.find((a) => a.corridor_id === code);
      const openTender = tenders.find(
        (t) => t.corridor_id === code && t.status === 'PUBLISHED'
      );

      let status = 'AVAILABLE';
      let assignedFirm = null;
      let activeTenderId = null;
      let approvedBudget = null;

      if (assign && ['ALLOCATED', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(assign.status)) {
        status = 'ALLOCATED';
        assignedFirm = assign.firm_name || assign.assigned_firm_id;
        approvedBudget = assign.approved_budget_lakh;
      } else if (openTender) {
        status = 'TENDER_OPEN';
        activeTenderId = openTender.id;
      }

      return {
        ...c,
        code,
        status,
        assignedFirm,
        activeTenderId,
        approvedBudget,
      };
    });
  }, [corridors, assignments, tenders]);

  // Filtered corridors
  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      if (selectedDistrict !== 'All Districts' && item.district !== selectedDistrict) {
        return false;
      }
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          (item.district && item.district.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [inventory, selectedDistrict, statusFilter, searchQuery]);

  const districts = useMemo(() => {
    const set = new Set(corridors.map((c) => c.district).filter(Boolean));
    return ['All Districts', ...Array.from(set).sort()];
  }, [corridors]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                GOVERNMENT WORKSPACE
              </span>
              <h1 className="text-lg font-bold text-white">
                NCT Delhi Corridor Inventory &amp; Exclusivity Allocation
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strict single-party allocation rules: Each urban corridor can only be assigned to one
              accredited firm or active tender at any given time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate('tender_management')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Issue New Tender</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search corridor code, name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* District Dropdown */}
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            {['ALL', 'AVAILABLE', 'TENDER_OPEN', 'ALLOCATED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`flex-1 py-1 rounded text-[11px] font-medium transition ${
                  statusFilter === st
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Grid View */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">Corridor</th>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Priority Score</th>
                <th className="py-3 px-4">Exclusivity Status</th>
                <th className="py-3 px-4">Assigned Party / Tender</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((corr) => {
                const isAvail = corr.status === 'AVAILABLE';
                const isTender = corr.status === 'TENDER_OPEN';
                const isAlloc = corr.status === 'ALLOCATED';

                return (
                  <tr key={corr.code} className="hover:bg-slate-850/50 transition">
                    {/* Corridor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
                          {corr.code}
                        </span>
                        <div>
                          <div className="font-bold text-slate-200 truncate max-w-[200px]">
                            {corr.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Highway: {corr.highway || 'Primary'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* District */}
                    <td className="py-3 px-4 text-slate-300">{corr.district}</td>

                    {/* Length */}
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {corr.length_km ? `${corr.length_km.toFixed(2)} km` : '1.50 km'}
                    </td>

                    {/* Priority Score */}
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-emerald-400">
                        {corr.priority_score ? corr.priority_score.toFixed(3) : '0.742'}
                      </span>
                    </td>

                    {/* Exclusivity Status Badge */}
                    <td className="py-3 px-4">
                      {isAvail && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          AVAILABLE
                        </span>
                      )}
                      {isTender && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1 w-fit">
                          <Clock className="w-3 h-3" />
                          TENDER OPEN
                        </span>
                      )}
                      {isAlloc && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 w-fit">
                          <Shield className="w-3 h-3" />
                          ALLOCATED
                        </span>
                      )}
                    </td>

                    {/* Assigned Party / Tender */}
                    <td className="py-3 px-4">
                      {isAlloc && (
                        <div className="space-y-0.5">
                          <div className="font-semibold text-amber-300 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            <span>{corr.assignedFirm || 'Studio Vriksh'}</span>
                          </div>
                          {corr.approvedBudget && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Budget: ₹{corr.approvedBudget}L
                            </div>
                          )}
                        </div>
                      )}
                      {isTender && (
                        <span className="font-mono text-blue-300 text-[11px]">
                          {corr.activeTenderId}
                        </span>
                      )}
                      {isAvail && (
                        <span className="text-slate-500 text-[11px] italic">
                          No active claims
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      {isAvail && (
                        <button
                          onClick={() => {
                            if (onOpenTenderModal) {
                              onOpenTenderModal(corr.code);
                            } else if (onNavigate) {
                              onNavigate('tender_management');
                            }
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white transition font-medium text-[11px]"
                        >
                          Issue Tender
                        </button>
                      )}
                      {isTender && (
                        <button
                          onClick={() => onNavigate && onNavigate('tender_management')}
                          className="px-2.5 py-1 rounded bg-blue-900/40 hover:bg-blue-800 text-blue-200 transition font-medium text-[11px]"
                        >
                          View Bids
                        </button>
                      )}
                      {isAlloc && (
                        <button
                          onClick={() => onNavigate && onNavigate('professional_assignments')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium text-[11px]"
                        >
                          Work Package
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
