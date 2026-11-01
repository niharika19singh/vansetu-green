import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Shield,
  Briefcase,
  Plus,
  X,
  IndianRupee,
  ArrowRight,
  Compass,
  Trees,
  Calculator,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import DataTable from './ui/DataTable';
import {
  safeToFixed,
  formatDistanceKm,
  formatScore,
  formatCurrencyLakh,
} from '../utils/numericFormat';

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
  const [loading, setLoading] = useState(true);
  const [selectedCorridorDrawer, setSelectedCorridorDrawer] = useState(null);

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

      // Synthetic canopy baseline & target for progress visualization
      const currentGreenPct = Math.round(18 + ((c.priority_score || 0.7) * 22));
      const targetGreenPct = Math.min(65, currentGreenPct + 30);

      return {
        ...c,
        code,
        status,
        assignedFirm,
        activeTenderId,
        approvedBudget,
        currentGreenPct,
        targetGreenPct,
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
      return true;
    });
  }, [inventory, selectedDistrict, statusFilter]);

  const districts = useMemo(() => {
    const set = new Set(corridors.map((c) => c.district).filter(Boolean));
    return ['All Districts', ...Array.from(set).sort()];
  }, [corridors]);

  // KPI counts
  const availableCount = inventory.filter((i) => i.status === 'AVAILABLE').length;
  const tenderOpenCount = inventory.filter((i) => i.status === 'TENDER_OPEN').length;
  const allocatedCount = inventory.filter((i) => i.status === 'ALLOCATED').length;

  // DataTable column definitions
  const columns = [
    {
      header: 'Corridor',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
            {row.code}
          </span>
          <div>
            <div className="font-bold text-slate-100 truncate max-w-[220px]">
              {row.name}
            </div>
            <div className="text-[10px] text-slate-400">
              {row.highway || 'Primary Arterial'}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'District',
      accessor: 'district',
      render: (row) => (
        <span className="text-slate-300 font-medium">{row.district || 'NCT Delhi'}</span>
      ),
    },
    {
      header: 'Length',
      accessor: 'length_km',
      render: (row) => (
        <span className="font-mono text-slate-300">
          {formatDistanceKm(row.length_km)}
        </span>
      ),
    },
    {
      header: 'Priority',
      accessor: 'priority_score',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          {formatScore(row.priority_score, 3)}
        </span>
      ),
    },
    {
      header: 'Canopy Cover',
      accessor: 'currentGreenPct',
      render: (row) => (
        <div className="w-28 space-y-1">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-emerald-400">{row.currentGreenPct}%</span>
            <span className="text-slate-500">Target {row.targetGreenPct}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${(row.currentGreenPct / row.targetGreenPct) * 100}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      header: 'Exclusivity Status',
      accessor: 'status',
      render: (row) => {
        if (row.status === 'AVAILABLE') {
          return (
            <StatusBadge variant="success" showDot>
              AVAILABLE
            </StatusBadge>
          );
        }
        if (row.status === 'TENDER_OPEN') {
          return (
            <StatusBadge variant="info" showDot>
              TENDER OPEN
            </StatusBadge>
          );
        }
        return (
          <StatusBadge variant="warning" showDot>
            ALLOCATED
          </StatusBadge>
        );
      },
    },
    {
      header: 'Assigned Party / RFP',
      accessor: 'assignedFirm',
      render: (row) => {
        if (row.status === 'ALLOCATED') {
          return (
            <div className="space-y-0.5">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5 text-xs">
                <Briefcase className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{row.assignedFirm || 'Studio Vriksh'}</span>
              </div>
              {row.approvedBudget && (
                <div className="text-[10px] text-slate-400 font-mono">
                  Sanction: ₹{row.approvedBudget}L
                </div>
              )}
            </div>
          );
        }
        if (row.status === 'TENDER_OPEN') {
          return (
            <span className="font-mono text-blue-300 text-xs flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>{row.activeTenderId}</span>
            </span>
          );
        }
        return <span className="text-slate-500 text-xs italic">No active claims</span>;
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => setSelectedCorridorDrawer(row)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-medium text-xs flex items-center gap-1"
        >
          <span>Inspect</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      ),
    },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                GOVERNMENT WORKSPACE
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                NCT Delhi Corridor Inventory &amp; Exclusivity Allocation
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Strict single-party allocation rules: Each urban corridor can only be assigned to one
              accredited firm or active tender at any given time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate('tender_management')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Tender</span>
            </button>
          </div>
        </div>

        {/* 4 KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Monitored Corridors"
            value={corridors.length}
            subtitle="NCT Delhi Priority Arterials"
            icon={Layers}
            color="emerald"
          />
          <StatCard
            title="Available for Procurement"
            value={availableCount}
            subtitle="Ready for Tender Issuance"
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard
            title="Active RFPs / Tenders"
            value={tenderOpenCount}
            subtitle="Open for Sealed Bidding"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Exclusively Allocated"
            value={allocatedCount}
            subtitle="Contracted Work Packages"
            icon={Shield}
            color="rose"
          />
        </div>
      </div>

      {/* Main DataTable Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        <DataTable
          title="Corridor Exclusivity Registry"
          subtitle="Real-time multi-district asset inventory and contractor work-package exclusivity status"
          columns={columns}
          data={filtered}
          onRowClick={(row) => setSelectedCorridorDrawer(row)}
          searchPlaceholder="Search corridor by code, name, or arterial..."
          itemsPerPage={10}
          filterComponent={
            <div className="flex flex-wrap items-center gap-2">
              {/* District Filter Dropdown */}
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono transition"
              >
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              {/* Status Filter Pill Tabs */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {['ALL', 'AVAILABLE', 'TENDER_OPEN', 'ALLOCATED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                      statusFilter === st
                        ? 'bg-slate-800 text-emerald-300 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      </div>

      {/* Slide-over Detail Drawer */}
      {selectedCorridorDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div
            className="w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200"
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                      {selectedCorridorDrawer.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {selectedCorridorDrawer.district} District
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">
                    {selectedCorridorDrawer.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCorridorDrawer(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                    Exclusivity Status
                  </span>
                  {selectedCorridorDrawer.status === 'AVAILABLE' && (
                    <StatusBadge variant="success" showDot>
                      AVAILABLE
                    </StatusBadge>
                  )}
                  {selectedCorridorDrawer.status === 'TENDER_OPEN' && (
                    <StatusBadge variant="info" showDot>
                      TENDER OPEN
                    </StatusBadge>
                  )}
                  {selectedCorridorDrawer.status === 'ALLOCATED' && (
                    <StatusBadge variant="warning" showDot>
                      ALLOCATED
                    </StatusBadge>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedCorridorDrawer.status === 'AVAILABLE' &&
                    'This corridor has no active contractor claims or pending tenders. It is fully available for municipal RFP issuance or direct allocation.'}
                  {selectedCorridorDrawer.status === 'TENDER_OPEN' &&
                    `Active municipal tender (${selectedCorridorDrawer.activeTenderId}) is currently open for sealed bidding. No other proposals may be directly assigned.`}
                  {selectedCorridorDrawer.status === 'ALLOCATED' &&
                    `Exclusively assigned to ${selectedCorridorDrawer.assignedFirm || 'Studio Vriksh'}. Exclusive work-package guarantee active.`}
                </p>
              </div>

              {/* Corridor Profile Details */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Total Length</span>
                  <span className="text-white font-bold text-sm">
                    {formatDistanceKm(selectedCorridorDrawer.length_km)}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Priority Score</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {formatScore(selectedCorridorDrawer.priority_score, 3)}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Est. CapEx</span>
                  <span className="text-amber-300 font-bold text-sm">
                    {formatCurrencyLakh(selectedCorridorDrawer.length_km != null ? selectedCorridorDrawer.length_km * 4.2 : null, 1)}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Est. 5-Yr OpEx</span>
                  <span className="text-blue-300 font-bold text-sm">
                    {formatCurrencyLakh(selectedCorridorDrawer.length_km != null ? selectedCorridorDrawer.length_km * 1.5 : null, 1)}
                  </span>
                </div>
              </div>

              {/* Canopy Target Progress */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Urban Canopy Target</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {selectedCorridorDrawer.currentGreenPct}% / {selectedCorridorDrawer.targetGreenPct}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        (selectedCorridorDrawer.currentGreenPct /
                          selectedCorridorDrawer.targetGreenPct) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Target threshold to achieve continuous pedestrian thermal comfort (-1.8°C LST).
                </p>
              </div>
            </div>

            {/* Drawer Action Footer */}
            <div className="pt-6 border-t border-slate-800 space-y-2">
              {selectedCorridorDrawer.status === 'AVAILABLE' && (
                <button
                  onClick={() => {
                    const code = selectedCorridorDrawer.code;
                    setSelectedCorridorDrawer(null);
                    if (onOpenTenderModal) {
                      onOpenTenderModal(code);
                    } else if (onNavigate) {
                      onNavigate('tender_management');
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>Issue Competitive RFP / Tender</span>
                </button>
              )}

              {selectedCorridorDrawer.status === 'TENDER_OPEN' && (
                <button
                  onClick={() => {
                    setSelectedCorridorDrawer(null);
                    onNavigate && onNavigate('tender_management');
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-blue-950/40"
                >
                  <Clock className="w-4 h-4" />
                  <span>Inspect Sealed Proposals &amp; Award</span>
                </button>
              )}

              {selectedCorridorDrawer.status === 'ALLOCATED' && (
                <button
                  onClick={() => {
                    setSelectedCorridorDrawer(null);
                    onNavigate && onNavigate('professional_assignments');
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-amber-950/40"
                >
                  <Briefcase className="w-4 h-4" />
                  <span>Inspect Assigned Work Package</span>
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedCorridorDrawer(null);
                  onNavigate && onNavigate('corridor_cost_approval');
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span>Run MILP CapEx/OpEx Optimizer</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}