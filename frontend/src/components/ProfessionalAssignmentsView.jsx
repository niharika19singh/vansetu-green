import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Briefcase,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  IndianRupee,
  Plus,
  AlertCircle,
  X,
  Award,
  Clock,
  ArrowRight,
  Shield,
  FileCheck,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import DataTable from './ui/DataTable';

export default function ProfessionalAssignmentsView({ token, corridors = [] }) {
  const [professionals, setProfessionals] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Direct Allocation Form
  const [targetCorridorId, setTargetCorridorId] = useState(corridors[0]?.code || 'C-14');
  const [targetFirmId, setTargetFirmId] = useState('firm_studiovriksh');
  const [approvedBudgetLakh, setApprovedBudgetLakh] = useState(8.5);
  const [deliverablesNotes, setDeliverablesNotes] = useState(
    'Pedestrian streetscape greening, bioswales, and continuous canopy tree planting.'
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [prosRes, assignRes] = await Promise.allSettled([
        api.listProfessionals(token),
        api.listCorridorAssignments({}, token),
      ]);
      if (prosRes.status === 'fulfilled') {
        setProfessionals(prosRes.value.professionals || []);
      }
      if (assignRes.status === 'fulfilled') {
        setAssignments(assignRes.value.assignments || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load professional data');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleVerification = async (firmId, currentStatus) => {
    try {
      await api.verifyProfessional(
        {
          professional_id: firmId,
          is_verified: !currentStatus,
          verification_notes: !currentStatus
            ? 'Verified by Municipal Corporation Urban Design Cell'
            : 'Suspended pending credential review',
        },
        token
      );
      setSuccessMessage(`Updated credential status for ${firmId}`);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update verification status');
    }
  };

  const handleDirectAllocation = async (e) => {
    e.preventDefault();
    setAllocating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.directAllocateCorridor(
        {
          corridor_id: targetCorridorId,
          assigned_firm_id: targetFirmId,
          approved_budget_lakh: Number(approvedBudgetLakh),
          deliverables_notes: deliverablesNotes,
        },
        token
      );
      setSuccessMessage(
        `Corridor ${targetCorridorId} exclusively allocated to ${targetFirmId} (Allocation ID: ${res.allocation_id})`
      );
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to allocate corridor');
    } finally {
      setAllocating(false);
    }
  };

  // KPIs
  const verifiedCount = professionals.filter((p) => p.is_verified).length;
  const totalSanctionedBudget = assignments.reduce(
    (sum, a) => sum + (Number(a.approved_budget_lakh) || 0),
    0
  );

  // DataTable columns for Active Work Packages
  const assignmentColumns = [
    {
      header: 'Corridor & Allocation ID',
      accessor: 'corridor_id',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-xs font-bold text-white border border-slate-700">
            {row.corridor_id}
          </span>
          <div>
            <div className="font-mono text-[10px] text-slate-400">{row.id}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Assigned Professional Firm',
      accessor: 'assigned_firm_id',
      render: (row) => {
        const firm = professionals.find((p) => p.id === row.assigned_firm_id);
        return (
          <div>
            <div className="font-bold text-slate-200 text-xs">
              {row.firm_name || firm?.firm_name || row.assigned_firm_id}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {firm?.category || 'LANDSCAPE_ARCHITECT'}
            </div>
          </div>
        );
      },
    },
    {
      header: 'Approved Budget',
      accessor: 'approved_budget_lakh',
      render: (row) => (
        <span className="font-mono font-bold text-amber-300 text-xs">
          ₹{Number(row.approved_budget_lakh || 8.5).toFixed(2)}L
        </span>
      ),
    },
    {
      header: 'Milestone Progress',
      accessor: 'status',
      render: (row) => {
        const progressPct = row.status === 'COMPLETED' ? 100 : row.status === 'UNDER_REVIEW' ? 80 : 45;
        return (
          <div className="w-28 space-y-1">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-slate-300">Phase 2</span>
              <span className="text-emerald-400 font-bold">{progressPct}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => (
        <StatusBadge variant="warning" showDot>
          {row.status || 'ALLOCATED'}
        </StatusBadge>
      ),
    },
    {
      header: 'Awarded Date',
      accessor: 'allocated_at',
      render: (row) => (
        <span className="font-mono text-slate-400 text-xs">
          {row.allocated_at ? row.allocated_at.substring(0, 10) : '2026-10-31'}
        </span>
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
                PROFESSIONAL GOVERNANCE
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Professional Firm Directory &amp; Corridor Assignments
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Manage accredited landscape architecture and urban planning firms, inspect active
              corridor work packages, and execute direct contract allocations under municipal oversight.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Direct Allocate Corridor</span>
          </button>
        </div>

        {/* 4 KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Accredited Firms"
            value={professionals.length}
            subtitle="Registered in Portal"
            icon={Building2}
            color="blue"
          />
          <StatCard
            title="Verified Empanelments"
            value={verifiedCount}
            subtitle="COA &amp; ITPI Compliant"
            icon={CheckCircle2}
            color="emerald"
          />
          <StatCard
            title="Active Work Packages"
            value={assignments.length}
            subtitle="Exclusive Site Allocations"
            icon={Briefcase}
            color="amber"
          />
          <StatCard
            title="Total Sanctioned Value"
            value={`₹${totalSanctionedBudget.toFixed(1)}L`}
            subtitle="Committed Work Packages"
            icon={IndianRupee}
            color="rose"
          />
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Layout: Firm Registry (Left) + Assigned Corridor Packages (Right) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Firm Directory Cards */}
        <div className="lg:col-span-5 h-full border-r border-slate-800 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
              Accredited Firm Directory ({professionals.length})
            </h2>
            <span className="text-[11px] text-slate-500">Tier-1 Empanelled</span>
          </div>

          <div className="space-y-3">
            {professionals.map((firm) => {
              const isVer = firm.is_verified;
              return (
                <div
                  key={firm.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{firm.firm_name}</h3>
                        {isVer ? (
                          <StatusBadge variant="success" showDot>
                            VERIFIED
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="warning" showDot>
                            PENDING
                          </StatusBadge>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        {firm.category} • Reg: {firm.registration_number || 'COA/2021/DEL-9842'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleVerification(firm.id, isVer)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isVer
                          ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30 hover:bg-rose-900/60'
                          : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/60'
                      }`}
                    >
                      {isVer ? 'Revoke Status' : 'Verify Empanelment'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Contact</span>
                      <span className="text-slate-300 truncate block">{firm.contact_email}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">
                        Completed Works
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {firm.past_projects_completed || 8} Projects
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: DataTable of Work Packages */}
        <div className="lg:col-span-7 h-full overflow-y-auto p-6 space-y-4">
          <DataTable
            title="Exclusive Work Packages Allocated"
            subtitle="Active corridor allocations with strict single-firm guarantee"
            columns={assignmentColumns}
            data={assignments}
            searchPlaceholder="Search by corridor code or firm..."
            itemsPerPage={8}
          />
        </div>
      </div>

      {/* Direct Allocation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Direct Corridor Allocation</h2>
                <p className="text-[11px] text-slate-400">
                  Assign an exclusive work package to an accredited professional firm.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectAllocation} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Corridor</label>
                <select
                  value={targetCorridorId}
                  onChange={(e) => setTargetCorridorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                >
                  {corridors.map((c) => (
                    <option key={c.code || c.id} value={c.code || c.id}>
                      {c.code || c.id} — {c.name} ({c.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Assignee Professional Firm
                </label>
                <select
                  value={targetFirmId}
                  onChange={(e) => setTargetFirmId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firm_name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Approved Budget (₹ Lakh)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  value={approvedBudgetLakh}
                  onChange={(e) => setApprovedBudgetLakh(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  Deliverables Scope &amp; Notes
                </label>
                <textarea
                  rows={3}
                  value={deliverablesNotes}
                  onChange={(e) => setDeliverablesNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocating}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{allocating ? 'Allocating...' : 'Confirm Allocation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}