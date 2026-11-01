import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock,
  IndianRupee,
  Briefcase,
  Send,
  AlertCircle,
  CheckCircle2,
  Lock,
  Shield,
  Layers,
  X,
  Plus,
  FileCheck,
  Check,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import {
  safeToFixed,
  formatCurrencyLakh,
  isValidNumber,
} from '../utils/numericFormat';

export default function TenderMarketplaceView({ token, corridors = [] }) {
  const [tenders, setTenders] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Proposal Submission Form
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposedCapex, setProposedCapex] = useState(7.5);
  const [proposedOpex, setProposedOpex] = useState(2.2);
  const [timelineWeeks, setTimelineWeeks] = useState(14);
  const [methodology, setMethodology] = useState(
    'Native shade canopy planting (Neem, Pilkhan), permeable bioswales, and high-albedo pedestrian pavers to achieve -1.8°C cooling.'
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [tenRes, assignRes] = await Promise.allSettled([
        api.listTenders({}, token),
        api.listCorridorAssignments({}, token),
      ]);
      if (tenRes.status === 'fulfilled') {
        setTenders(tenRes.value.tenders || []);
      }
      if (assignRes.status === 'fulfilled') {
        setAssignments(assignRes.value.assignments || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load tenders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenProposalDrawer = (t) => {
    setSelectedTender(t);
    setProposalTitle(`Climate Action Masterplan — ${t.corridor_id} (${t.title})`);
    const ceil = isValidNumber(t.budget_ceiling_lakh) ? Number(t.budget_ceiling_lakh) : 10;
    setProposedCapex(safeToFixed(ceil * 0.7, 2, '7.00'));
    setProposedOpex(safeToFixed(ceil * 0.2, 2, '2.00'));
    setDrawerOpen(true);
  };

  const handleSubmitProposal = async (e) => {
    e.preventDefault();
    if (!selectedTender) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = {
        proposal_title: proposalTitle,
        proposed_capex_lakh: Number(proposedCapex),
        proposed_opex_5yr_lakh: Number(proposedOpex),
        implementation_timeline_weeks: Number(timelineWeeks),
        technical_methodology: methodology,
      };

      const res = await api.submitTenderProposal(selectedTender.id, payload, token);
      setSuccessMessage(
        `Proposal submitted successfully for ${selectedTender.id}! (Proposal ID: ${res.proposal_id})`
      );
      setDrawerOpen(false);
      await loadData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const publishedTenders = tenders.filter((t) => t.status === 'PUBLISHED');
  const avgBudget =
    publishedTenders.length > 0
      ? publishedTenders.reduce((s, t) => s + Number(t.budget_ceiling_lakh || 0), 0) /
        publishedTenders.length
      : 12.0;

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/30">
                PRO PROCUREMENT MARKETPLACE
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Municipal Climate Corridor Tender Marketplace
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Browse active municipal RFPs and submit competitive, data-backed climate intervention
              proposals under sealed bidding protocol.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Bid Privacy:</span>
            <span className="text-blue-300 font-bold">SEALED COMPETITIVE BIDS</span>
          </div>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Available Tender RFPs"
            value={publishedTenders.length}
            subtitle="Open for Sealed Proposals"
            icon={Clock}
            color="blue"
          />
          <StatCard
            title="Avg. Budget Ceiling"
            value={formatCurrencyLakh(avgBudget, 1)}
            subtitle="Per Corridor Work Package"
            icon={IndianRupee}
            color="amber"
          />
          <StatCard
            title="Bidding Protocol"
            value="SEALED BIDS"
            subtitle="Complete Pricing Privacy"
            icon={Shield}
            color="emerald"
          />
          <StatCard
            title="Compliance Norm"
            value="CPWD / DSR"
            subtitle="Central Works Benchmark"
            icon={FileCheck}
            color="rose"
          />
        </div>

        {/* Confidentiality Notice Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 flex items-start gap-3 text-xs text-slate-300">
          <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white">Bid Confidentiality Disclosure:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              All financial bids are strictly confidential. You will only see your firm&apos;s own
              submitted proposals and evaluation feedback. Competing firms&apos; pricing remains sealed
              until formal contract award by the Government Engineering Board.
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
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

      {/* Tender Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tenders.map((t) => {
            const rawStatus = t.status || 'Open';
            let normStatus = 'Open';
            if (rawStatus === 'AWARDED' || rawStatus === 'Awarded') normStatus = 'Awarded';
            else if (rawStatus === 'UNDER_REVIEW' || rawStatus === 'Under Review' || rawStatus === 'Applied') normStatus = 'Under Review';
            else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'In Progress') normStatus = 'In Progress';
            else if (rawStatus === 'COMPLETED' || rawStatus === 'Completed') normStatus = 'Completed';
            else if (rawStatus === 'REJECTED' || rawStatus === 'Rejected') normStatus = 'Rejected';
            else if (rawStatus === 'CANCELLED' || rawStatus === 'Cancelled') normStatus = 'Cancelled';

            const isAwarded = normStatus === 'Awarded' || normStatus === 'In Progress' || normStatus === 'Completed';
            const canBid = normStatus === 'Open';
            const progress = Number(t.delivery_progress_pct || t.progress_pct || 0);

            return (
              <div
                key={t.id || t.tender_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-emerald-500/40 transition shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded bg-slate-800 text-emerald-400 font-mono text-xs font-bold border border-slate-700">
                      {t.corridor_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge
                        variant={
                          normStatus === 'Awarded' || normStatus === 'Completed'
                            ? 'success'
                            : normStatus === 'In Progress' || normStatus === 'Under Review'
                            ? 'warning'
                            : 'info'
                        }
                        showDot
                      >
                        {normStatus.toUpperCase()}
                      </StatusBadge>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-1">{t.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {t.description || t.scope_of_work}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-850 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Contract Value / Ceiling
                      </span>
                      <span className="text-amber-300 font-bold text-sm">
                        ₹{t.budget_ceiling_lakh || t.approved_budget_lakh || 18.5} Lakh
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Timeline</span>
                      <span className="text-slate-300 font-bold text-sm">
                        {t.timeline_weeks || t.estimated_duration_weeks || 16} Weeks
                      </span>
                    </div>
                  </div>

                  {t.assigned_contractor && (
                    <div className="text-[11px] text-slate-300 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                      <div className="text-[10px] text-slate-500 uppercase font-mono">Assigned Contractor</div>
                      <div className="font-semibold text-emerald-300 truncate">{t.assigned_contractor}</div>
                    </div>
                  )}

                  {isAwarded && (
                    <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Delivery Progress</span>
                        <span className="font-bold text-emerald-400">{progress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Deadline: {t.closing_date ? t.closing_date.substring(0, 10) : t.submission_deadline ? t.submission_deadline.substring(0, 10) : 'Open'}
                  </div>

                  {canBid ? (
                    <button
                      onClick={() => handleOpenProposalDrawer(t)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-emerald-950/40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Bid</span>
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-slate-500">
                      {isAwarded ? 'Contract Assigned' : 'Under Review'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Proposal Slide-over Drawer */}
      {drawerOpen && selectedTender && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {selectedTender.corridor_id}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {selectedTender.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">Submit Tender Proposal</h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitProposal} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Proposal Title</label>
                  <input
                    type="text"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">
                      CapEx (₹L)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="1"
                      max={selectedTender.budget_ceiling_lakh}
                      value={proposedCapex}
                      onChange={(e) => setProposedCapex(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">5-Yr OpEx (₹L)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      value={proposedOpex}
                      onChange={(e) => setProposedOpex(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Timeline (Wks)</label>
                    <input
                      type="number"
                      min="4"
                      max="52"
                      value={timelineWeeks}
                      onChange={(e) => setTimelineWeeks(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Total Financial Bid Calculation */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex justify-between items-center">
                  <span className="text-slate-400">Total Financial Bid (CapEx + OpEx):</span>
                  <span className="text-amber-300 font-bold text-sm">
                    {formatCurrencyLakh(Number(proposedCapex || 0) + Number(proposedOpex || 0), 2)}
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Technical Methodology &amp; Streetscape Strategy
                  </label>
                  <textarea
                    rows={4}
                    value={methodology}
                    onChange={(e) => setMethodology(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Submitting Bid...' : 'Submit Sealed Bid'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}