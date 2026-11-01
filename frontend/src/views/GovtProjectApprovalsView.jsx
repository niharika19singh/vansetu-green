import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Plus,
  X,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Send,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';
import { CANONICAL_DELHI_DISTRICTS } from './PublicClimateMapView';

export const REPORT_TYPES = [
  { id: 'BUDGET_SANCTION_REQUEST', label: 'Budget Sanction Request' },
  { id: 'TENDER_SANCTION', label: 'Tender Award Recommendation' },
  { id: 'ENGINEERING_FEASIBILITY', label: 'Engineering Feasibility Report' },
  { id: 'COMPLETION_AUDIT', label: 'Post-Execution Completion Audit' },
  { id: 'HEAT_MITIGATION_ASSESSMENT', label: 'Heat Mitigation Assessment' },
];

export default function GovtProjectApprovalsView({ token, onNavigate }) {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    approved_budget_lakh: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [districtFilter, setDistrictFilter] = useState('All Districts');
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Expanded review history state (map of reportId -> bool)
  const [expandedHistory, setExpandedHistory] = useState({});

  // Create Report Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('BUDGET_SANCTION_REQUEST');
  const [newDistrict, setNewDistrict] = useState('South Delhi');
  const [newCorridors, setNewCorridors] = useState('C-14');
  const [newAuthorName, setNewAuthorName] = useState('Er. Rajesh Sharma');
  const [newAuthorRole, setNewAuthorRole] = useState('PWD Executive Engineer');
  const [newBudgetImpact, setNewBudgetImpact] = useState(18.5);
  const [newSummary, setNewSummary] = useState('');
  const [newStatus, setNewStatus] = useState('Submitted');

  // Review Decision Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const [reviewAction, setReviewAction] = useState('Approved'); // 'Under Review', 'Approved', 'Rejected'
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [repRes, statsRes] = await Promise.allSettled([
        api.getGovernmentReports({}, token),
        api.getGovernmentReportStats(token),
      ]);
      if (repRes.status === 'fulfilled') {
        setReports(repRes.value.reports || []);
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }
    } catch (err) {
      setActionError(err.message || 'Failed to load government reports');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleHistory = (id) => {
    setExpandedHistory((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenReviewModal = (report, action) => {
    setActiveReport(report);
    setReviewAction(action);
    setReviewNotes(
      action === 'Approved'
        ? 'Sanction verified against Ground Penetrating Radar and municipal tree canopy guidelines. Approved for implementation.'
        : action === 'Rejected'
        ? 'Proposal lacks required IRC:103 pedestrian clearance documentation. Please revise with trial pit cross-sections.'
        : 'Assigned to PWD Climate Action Cell technical panel for detailed feasibility evaluation.'
    );
    setReviewModalOpen(true);
  };

  const handleExecuteReview = async (e) => {
    if (e) e.preventDefault();
    if (!activeReport) return;
    setReviewing(true);
    setActionError(null);
    try {
      await api.reviewGovernmentReport(
        activeReport.id || activeReport.report_id,
        {
          action: reviewAction,
          reviewer_name: 'Dr. Kunal Sharma',
          reviewer_role: 'Government Admin',
          notes: reviewNotes,
        },
        token
      );
      setActionSuccess(`Report ${activeReport.report_id || activeReport.id} successfully marked as ${reviewAction}.`);
      setReviewModalOpen(false);
      setActiveReport(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setActionError(err.message || 'Failed to record report review');
    } finally {
      setReviewing(false);
    }
  };

  const handleCreateReport = async (e) => {
    if (e) e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      setActionError('Please provide a title and detailed summary for the report.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      const corridorsList = newCorridors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await api.createGovernmentReport(
        {
          title: newTitle,
          report_type: newType,
          district: newDistrict,
          corridor_ids: corridorsList.length > 0 ? corridorsList : ['C-14'],
          author_name: newAuthorName,
          author_role: newAuthorRole,
          author_id: 'GOV_PWD_ENG',
          budget_impact_lakh: Number(newBudgetImpact),
          summary: newSummary,
          status: newStatus,
        },
        token
      );

      setActionSuccess(`Report '${newTitle}' successfully created and logged.`);
      setCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewSummary('');
      await loadData();
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err) {
      setActionError(err.message || 'Failed to create government report');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const status = (r.status || '').toLowerCase();
      if (statusFilter === 'SUBMITTED' && status !== 'submitted') return false;
      if (statusFilter === 'UNDER_REVIEW' && status !== 'under review') return false;
      if (statusFilter === 'APPROVED' && status !== 'approved') return false;
      if (statusFilter === 'REJECTED' && status !== 'rejected') return false;
      if (statusFilter === 'DRAFT' && status !== 'draft') return false;

      if (districtFilter !== 'All Districts') {
        if ((r.district || '').toLowerCase() !== districtFilter.toLowerCase()) {
          return false;
        }
      }
      return true;
    });
  }, [reports, statusFilter, districtFilter]);

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-[#0D2821] to-[#071C16] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                MUNICIPAL PROJECT REPORTS &amp; SANCTION WORKFLOW
              </span>
              <span className="text-slate-400 text-xs">PWD &amp; MCD Climate Infrastructure Cell</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Government Reports &amp; Sanctions
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Formally draft, submit, and review municipal climate reports, feasibility assessments, and budget releases
              with immutable audit trails and status tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition border border-emerald-400/40"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Report</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="p-3.5 rounded-xl bg-[#071C16]/80 border border-emerald-500/20">
            <span className="text-[10px] text-slate-400 block font-mono">Total Reports</span>
            <span className="text-xl font-bold text-white font-mono">{stats.total || reports.length}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#071C16]/80 border border-amber-500/20">
            <span className="text-[10px] text-slate-400 block font-mono">Pending / Under Review</span>
            <span className="text-xl font-bold text-amber-300 font-mono">
              {(stats.submitted || 0) + (stats.under_review || 0)}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#071C16]/80 border border-emerald-500/20">
            <span className="text-[10px] text-slate-400 block font-mono">Sanctioned &amp; Approved</span>
            <span className="text-xl font-bold text-emerald-300 font-mono">{stats.approved || 0}</span>
          </div>
          <div className="p-3.5 rounded-xl bg-[#071C16]/80 border border-teal-500/20">
            <span className="text-[10px] text-slate-400 block font-mono">Approved Budget</span>
            <span className="text-xl font-bold text-teal-300 font-mono">₹{stats.approved_budget_lakh || 0}L</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Tabs & District Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0D2821] p-3 rounded-2xl border border-emerald-500/20">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'ALL', label: `All Reports (${reports.length})` },
            { id: 'SUBMITTED', label: 'Submitted' },
            { id: 'UNDER_REVIEW', label: 'Under Review' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'DRAFT', label: 'Drafts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-[#071C16] border border-emerald-500/30 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
          >
            <option value="All Districts">All 11 Districts</option>
            {CANONICAL_DELHI_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports Queue */}
      <div className="space-y-4">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">
            Loading government reports and review pipeline...
          </div>
        )}

        {!loading && filteredReports.length === 0 && (
          <div className="p-12 text-center bg-[#0D2821]/50 border border-emerald-500/20 rounded-2xl space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">No Reports Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              No government reports match the selected status or district filter. Create a new report or adjust filters.
            </p>
          </div>
        )}

        {filteredReports.map((r) => {
          const reportId = r.id || r.report_id;
          const status = r.status || 'Submitted';
          const isHistoryOpen = Boolean(expandedHistory[reportId]);

          let statusBadgeVariant = 'info';
          if (status.toLowerCase() === 'approved') statusBadgeVariant = 'success';
          else if (status.toLowerCase() === 'under review') statusBadgeVariant = 'warning';
          else if (status.toLowerCase() === 'rejected') statusBadgeVariant = 'danger';
          else if (status.toLowerCase() === 'draft') statusBadgeVariant = 'neutral';

          return (
            <div
              key={reportId}
              className="bg-[#0D2821] border border-emerald-500/20 hover:border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-sm transition"
            >
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                      {reportId}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-teal-500/15 text-teal-300 font-mono text-[10px] font-bold border border-teal-500/30">
                      {r.report_type}
                    </span>
                    <span className="text-xs text-slate-400">• District: <strong>{r.district}</strong></span>
                    {Array.isArray(r.corridor_ids) && r.corridor_ids.length > 0 && (
                      <span className="text-xs text-slate-400">
                        • Corridors: <strong>{r.corridor_ids.join(', ')}</strong>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{r.title}</h3>
                  <p className="text-xs text-slate-400">
                    Author: <strong>{r.author_name}</strong> ({r.author_role}) • Submitted:{' '}
                    {r.created_at ? r.created_at.substring(0, 10) : 'Recent'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Budget Impact</span>
                    <span className="text-sm font-bold text-amber-300 font-mono">
                      ₹{r.budget_impact_lakh || '0.0'}L
                    </span>
                  </div>
                  <StatusBadge variant={statusBadgeVariant} showDot>
                    {status}
                  </StatusBadge>
                </div>
              </div>

              {/* Summary Description */}
              <div className="p-3.5 rounded-xl bg-[#071C16] border border-emerald-500/15 text-xs text-slate-300 leading-relaxed">
                {r.summary}
              </div>

              {/* Review Actions for Govt Admin */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-emerald-500/15">
                <button
                  onClick={() => toggleHistory(reportId)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Review History ({r.review_history?.length || 1})</span>
                  {isHistoryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-2">
                  {status.toLowerCase() !== 'under review' && status.toLowerCase() !== 'approved' && (
                    <button
                      onClick={() => handleOpenReviewModal(r, 'Under Review')}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <span>Mark Under Review</span>
                    </button>
                  )}

                  {status.toLowerCase() !== 'approved' && (
                    <button
                      onClick={() => handleOpenReviewModal(r, 'Approved')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Approve Sanction</span>
                    </button>
                  )}

                  {status.toLowerCase() !== 'rejected' && (
                    <button
                      onClick={() => handleOpenReviewModal(r, 'Rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reject / Revisions</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Review History Timeline */}
              {isHistoryOpen && (
                <div className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 space-y-3 mt-2">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                    Audit Trail &amp; Signoff History
                  </span>
                  <div className="space-y-2">
                    {(r.review_history || []).map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300 border-l-2 border-emerald-500/40 pl-3 py-1">
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-white">
                              {h.reviewer} ({h.role || 'Reviewer'})
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {h.timestamp ? h.timestamp.substring(0, 16).replace('T', ' ') : 'Recent'}
                            </span>
                          </div>
                          <p className="text-slate-400">{h.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal: Create Government Report */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D2821] border border-emerald-500/40 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Draft Government Climate Report</h3>
                <p className="text-xs text-slate-400">Municipal submission for engineering review and sanction</p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Report Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ward 12 Pedestrian Shade Infrastructure Feasibility"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Report Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {REPORT_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">District</label>
                  <select
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white focus:outline-none"
                  >
                    {CANONICAL_DELHI_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Affected Corridors (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. C-14, C-01"
                    value={newCorridors}
                    onChange={(e) => setNewCorridors(e.target.value)}
                    className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Budget Impact (₹ Lakhs)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={newBudgetImpact}
                    onChange={(e) => setNewBudgetImpact(e.target.value)}
                    className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Author Name</label>
                  <input
                    type="text"
                    value={newAuthorName}
                    onChange={(e) => setNewAuthorName(e.target.value)}
                    className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Author Role</label>
                  <input
                    type="text"
                    value={newAuthorRole}
                    onChange={(e) => setNewAuthorRole(e.target.value)}
                    className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Executive Summary &amp; Findings</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail thermal assessment findings, IRC:103 compliance, utility trial pit outcomes, and budget allocation justification..."
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setNewStatus('Draft')}
                  className="px-4 py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-slate-300 font-semibold"
                >
                  Save Draft
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  onClick={() => setNewStatus('Submitted')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting...' : 'Submit for Review'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Decision */}
      {reviewModalOpen && activeReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D2821] border border-emerald-500/40 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Executive Review: {activeReport.report_id || activeReport.id}
                </h3>
                <p className="text-xs text-slate-400">{activeReport.title}</p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteReview} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Review Action Decision</label>
                <select
                  value={reviewAction}
                  onChange={(e) => setReviewAction(e.target.value)}
                  className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none"
                >
                  <option value="Approved">Approved (Sanction Cleared)</option>
                  <option value="Under Review">Under Review (Technical Scrutiny)</option>
                  <option value="Rejected">Rejected (Revisions Requested)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Reviewer Justification &amp; Notes</label>
                <textarea
                  rows={4}
                  required
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full bg-[#071C16] border border-emerald-500/30 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className={`px-4 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow ${
                    reviewAction === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : reviewAction === 'Rejected'
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{reviewing ? 'Recording...' : `Confirm ${reviewAction}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
