import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  IndianRupee,
  Building2,
  FileText,
  AlertTriangle,
  Award,
  Layers,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';

export default function GovtProjectApprovalsView({ token, onNavigate }) {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Mock pending approvals queue
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: 'APR-2026-088',
      type: 'TENDER_SANCTION',
      corridor_id: 'C-14',
      corridor_name: 'Lal Bahadur Shastri Marg',
      district: 'South Delhi',
      amount_lakh: 18.5,
      submitted_by: 'PWD South Zone Executive Engineer',
      justification: 'Critical pedestrian corridor with 42.4°C thermal hotspot. 1,400 native tree pits proposed.',
      status: 'PENDING_ADMIN_SANCTION',
    },
    {
      id: 'APR-2026-089',
      type: 'BID_AWARD',
      corridor_id: 'C-08',
      corridor_name: 'Mehrauli-Gurgaon (MG) Road',
      district: 'South Delhi',
      amount_lakh: 24.0,
      submitted_by: 'Studio Vriksh & Urban Resiliency Partners',
      justification: 'Lowest responsive and technical bid adhering to Right-Tree-Right-Place bio-climate criteria.',
      status: 'PENDING_ADMIN_SANCTION',
    },
    {
      id: 'APR-2026-090',
      type: 'ENGINEERING_FEASIBILITY',
      corridor_id: 'C-01',
      corridor_name: 'Outer Ring Road (Nehru Place)',
      district: 'South Delhi',
      amount_lakh: 35.0,
      submitted_by: 'Er. Neha Gupta (PWD Field Engineer)',
      justification: 'Trial pit inspection cleared. Subsurface utility conflict resolved by 1.2m offset from gas mains.',
      status: 'PENDING_ADMIN_SANCTION',
    },
    {
      id: 'APR-2026-091',
      type: 'COMPLETION_CERTIFICATE',
      corridor_id: 'C-05',
      corridor_name: 'Barakhamba Road Spine',
      district: 'New Delhi',
      amount_lakh: 12.0,
      submitted_by: 'NDMC Civil Infrastructure Cell',
      justification: 'Phase 1 canopy establishment completed. 850 trees surviving; drip irrigation operational.',
      status: 'PENDING_ADMIN_SANCTION',
    },
  ]);

  const handleDecision = (id, approved) => {
    setPendingApprovals((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            status: approved ? 'SANCTIONED_APPROVED' : 'REJECTED_REVISION_REQUESTED',
          };
        }
        return item;
      })
    );
    setActionSuccess(`Request ${id} marked as ${approved ? 'APPROVED' : 'REJECTED'}. Audit trail logged.`);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const pendingCount = pendingApprovals.filter(p => p.status === 'PENDING_ADMIN_SANCTION').length;
  const approvedTotalLakh = pendingApprovals
    .filter(p => p.status === 'SANCTIONED_APPROVED')
    .reduce((acc, p) => acc + p.amount_lakh, 0);

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#0D2821] to-[#071C16] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                EXECUTIVE PROJECT SANCTIONS &amp; APPROVALS QUEUE
              </span>
              <span className="text-slate-400 text-xs">PWD &amp; MCD Climate Infrastructure Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Project Approvals &amp; Sanction Authority
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Formally review and approve B2G contractor bids, engineering feasibility certificates, and capital budget releases
              with immutable cryptographic audit logging.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 text-right shrink-0">
            <span className="text-[11px] text-slate-400 block font-mono">Pending Decisions</span>
            <div className="text-2xl font-black text-amber-300 font-mono">
              {pendingCount} Items
            </div>
            <span className="text-[11px] text-slate-400">Total Sanctioned: ₹{approvedTotalLakh.toFixed(1)}L</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Approvals Queue Table */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Administrative Sanctions Requiring Municipal Signoff
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Authorised decisions commit directly to the municipal procurement registry.</p>
          </div>
          <span className="text-xs font-mono text-teal-300 bg-teal-500/10 px-2.5 py-1 rounded border border-teal-500/20">
            Enforces Single-Party Exclusivity
          </span>
        </div>

        <div className="space-y-3">
          {pendingApprovals.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.status === 'SANCTIONED_APPROVED'
                  ? 'bg-emerald-950/30 border-emerald-500/40 opacity-80'
                  : item.status === 'REJECTED_REVISION_REQUESTED'
                  ? 'bg-rose-950/30 border-rose-500/40 opacity-80'
                  : 'bg-[#071C16] border-emerald-500/20'
              }`}
            >
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 text-emerald-300 font-bold border border-slate-800">
                    {item.id}
                  </span>
                  <span className="text-xs font-bold text-white">
                    {item.corridor_id}: {item.corridor_name} ({item.district})
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-blue-500/20 text-blue-300">
                    {item.type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-snug">
                  {item.justification}
                </p>
                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-4">
                  <span>Submitted by: <strong className="text-slate-300 font-sans">{item.submitted_by}</strong></span>
                  <span>Sanction: <strong className="text-amber-300 font-mono">₹{item.amount_lakh.toFixed(1)}L</strong></span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {item.status === 'PENDING_ADMIN_SANCTION' ? (
                  <>
                    <button
                      onClick={() => handleDecision(item.id, true)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Approve Sanction</span>
                    </button>
                    <button
                      onClick={() => handleDecision(item.id, false)}
                      className="px-3.5 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Request Revision</span>
                    </button>
                  </>
                ) : (
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
                    item.status === 'SANCTIONED_APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
