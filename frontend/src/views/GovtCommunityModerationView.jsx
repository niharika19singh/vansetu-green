import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Send,
  Building2,
  Filter,
  MapPin,
  Calendar,
} from 'lucide-react';
import { api } from '../api/client';

export default function GovtCommunityModerationView({ token, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [moderationNotes, setModerationNotes] = useState('');
  const [assignedDivision, setAssignedDivision] = useState('PWD Horticulture Division 1');
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadReports() {
      setLoading(true);
      try {
        const res = await api.getCommunityObservationsLegacy();
        if (mounted) setReports(res || []);
      } catch (err) {
        console.warn('Failed loading community reports for moderation', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadReports();
    return () => { mounted = false; };
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    setSubmitting(true);
    try {
      await api.moderateCommunityObservation(
        id,
        {
          status: newStatus,
          adminNotes: moderationNotes || `Status updated to ${newStatus} by Municipal Admin.`,
          assignedDivision,
        },
        token
      );
      setReports((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, verification_status: newStatus, admin_notes: moderationNotes, assigned_division: assignedDivision }
            : r
        )
      );
      setFeedbackMsg(`Report ${id} successfully updated to '${newStatus}'.`);
      setActiveItem(null);
      setModerationNotes('');
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Failed moderating observation', err);
      // Fallback optimistic update
      setReports((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, verification_status: newStatus } : r
        )
      );
      setActiveItem(null);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.verification_status === filterStatus;
  });

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#0D2821] to-[#071C16] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                CITIZEN GRIEVANCE &amp; OBSERVATION MODERATION
              </span>
              <span className="text-slate-400 text-xs">Direct Civic Engagement Channel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Community Governance &amp; Complaint Moderation
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Review citizen submissions regarding missing trees, barren sidewalks, broken water booths, and thermal stress.
              Dispatch municipal field inspections and commit verified remedial planting actions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 text-right shrink-0">
            <span className="text-[11px] text-slate-400 block font-mono">Total Reports</span>
            <div className="text-2xl font-black text-teal-300 font-mono">
              {reports.length} Submissions
            </div>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-white">Filter by Status:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {['all', 'unverified', 'under_investigation', 'field_inspection_dispatched', 'verified_remedied'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterStatus === st
                  ? 'bg-emerald-600 text-white font-bold shadow'
                  : 'bg-[#071C16] text-slate-300 hover:text-white border border-emerald-500/20'
              }`}
            >
              {st === 'all' ? 'All Reports' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map((r) => (
          <div
            key={r.id}
            className="p-5 rounded-2xl bg-[#0D2821] border border-emerald-500/20 space-y-3 flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-teal-300 bg-[#071C16] px-2 py-0.5 rounded border border-emerald-500/20">
                  #{r.id}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  r.verification_status === 'verified_remedied'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : r.verification_status === 'field_inspection_dispatched'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-amber-500/20 text-amber-300'
                }`}>
                  {(r.verification_status || 'unverified').replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>{r.street || 'Street Location'}, {r.ward || r.city || 'Delhi'}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {r.description || `Heat: ${r.heatLevel} • Shade: ${r.shadeLevel} • Activity: ${r.pedestrianActivity}`}
              </p>

              {r.admin_notes && (
                <div className="p-2.5 rounded-lg bg-[#071C16] border border-emerald-500/10 text-[11px] text-teal-200">
                  <strong>Admin Action:</strong> {r.admin_notes} ({r.assigned_division})
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-mono">
                {r.submitted_at ? r.submitted_at.substring(0, 10) : 'Recent'}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleUpdateStatus(r.id, 'field_inspection_dispatched')}
                  className="px-2.5 py-1 rounded bg-[#071C16] hover:bg-blue-600 hover:text-white border border-blue-500/30 text-[10px] font-bold text-blue-300 transition"
                >
                  Dispatch Inspection
                </button>
                <button
                  onClick={() => handleUpdateStatus(r.id, 'verified_remedied')}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition shadow"
                >
                  Mark Remedied
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
