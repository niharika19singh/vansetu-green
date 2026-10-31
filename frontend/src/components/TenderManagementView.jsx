import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Briefcase,
  Calendar,
  Layers,
  Award,
  ChevronRight,
  X,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../api/client';

export default function TenderManagementView({ token, corridors = [] }) {
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // New Tender Form State
  const [newCorridorId, setNewCorridorId] = useState(corridors[0]?.code || 'C-01');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newBudgetCeiling, setNewBudgetCeiling] = useState(12.0);
  const [newDurationWeeks, setNewDurationWeeks] = useState(16);
  const [newDeadlineDays, setNewDeadlineDays] = useState(21);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.listTenders({}, token);
      const list = res.tenders || [];
      setTenders(list);
      if (list.length > 0 && !selectedTender) {
        // Fetch full detail of first tender
        const detail = await api.getTender(list[0].id, token);
        setSelectedTender(detail);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch tenders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const handleSelectTender = async (t) => {
    try {
      const detail = await api.getTender(t.id, token);
      setSelectedTender(detail);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load tender details');
    }
  };

  const handleCreateTender = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = {
        corridor_id: newCorridorId,
        title: newTitle || `Pedestrian Green Corridor RFP — ${newCorridorId}`,
        description:
          newDescription ||
          `Comprehensive climate-resilient pedestrian corridor interventions along ${newCorridorId}.`,
        budget_ceiling_lakh: Number(newBudgetCeiling),
        submission_deadline_days: Number(newDeadlineDays),
        estimated_duration_weeks: Number(newDurationWeeks),
        eligible_categories: ['LANDSCAPE_ARCHITECT', 'URBAN_PLANNER', 'EPC_CONTRACTOR'],
        priority_objectives: ['heat_mitigation', 'pedestrian_shade', 'stormwater_resilience'],
      };

      const res = await api.createTender(payload, token);
      setSuccessMessage(`Tender ${res.tender_id} published successfully!`);
      setModalOpen(false);
      await loadTenders();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create tender');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAwardTender = async (proposalId, firmName, totalBidLakh) => {
    if (!selectedTender) return;
    if (
      !window.confirm(
        `Are you sure you want to award tender ${selectedTender.id} to ${firmName} for ₹${totalBidLakh} Lakh? This will grant an exclusive corridor work-package contract.`
      )
    ) {
      return;
    }

    setAwarding(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.awardTender(
        selectedTender.id,
        {
          awarded_proposal_id: proposalId,
          approved_budget_lakh: Number(totalBidLakh),
          award_notes: `Officially awarded by Government Engineering Review Board following technical and financial evaluation.`,
        },
        token
      );
      setSuccessMessage(`Tender ${selectedTender.id} awarded to ${firmName} successfully!`);
      // Reload tender details
      const detail = await api.getTender(selectedTender.id, token);
      setSelectedTender(detail);
      await loadTenders();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to award tender');
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
              MUNICIPAL PROCUREMENT
            </span>
            <h1 className="text-lg font-bold text-white">
              Tender Lifecycle &amp; Work-Package Allocation
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Administer public RFPs, review accredited firm proposals, and execute binding contract
            allocations.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Publish New Corridor Tender</span>
        </button>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
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
        <div className="mx-5 mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Layout: Tender List (Left) + Selected Tender Details (Right) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Tenders List */}
        <div className="lg:col-span-5 h-full border-r border-slate-800 overflow-y-auto p-4 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Active &amp; Historical Tenders ({tenders.length})
          </div>

          {loading && (
            <div className="p-8 text-center text-xs text-slate-500">
              Loading municipal tenders...
            </div>
          )}

          {!loading && tenders.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No tenders found. Click &quot;Publish New Corridor Tender&quot; to begin.
            </div>
          )}

          {tenders.map((t) => {
            const isSelected = selectedTender?.id === t.id;
            const isPublished = t.status === 'PUBLISHED';
            const isAwarded = t.status === 'AWARDED';

            return (
              <div
                key={t.id}
                onClick={() => handleSelectTender(t)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {t.corridor_id}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{t.id}</span>
                    </div>
                    <h3 className="text-xs font-bold text-white line-clamp-1">{t.title}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      isPublished
                        ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                        : isAwarded
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.status}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 font-mono text-amber-300 font-bold">
                    <IndianRupee className="w-3 h-3" />
                    <span>Ceiling: ₹{t.budget_ceiling_lakh}L</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    <span>{t.proposals_count || t.proposals?.length || 0} Bids</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Tender Detail & Proposals Evaluation */}
        <div className="lg:col-span-7 h-full overflow-y-auto p-5 space-y-5">
          {selectedTender ? (
            <div className="space-y-5">
              {/* Tender Overview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-slate-800 font-mono text-xs font-bold text-white">
                      {selectedTender.corridor_id}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{selectedTender.id}</span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedTender.status === 'PUBLISHED'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {selectedTender.status}
                  </span>
                </div>

                <h2 className="text-base font-bold text-white">{selectedTender.title}</h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedTender.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Budget Ceiling</div>
                    <div className="text-amber-300 font-bold mt-0.5">
                      ₹{selectedTender.budget_ceiling_lakh} Lakh
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Deadline</div>
                    <div className="text-slate-300 font-bold mt-0.5">
                      {selectedTender.submission_deadline
                        ? selectedTender.submission_deadline.substring(0, 10)
                        : 'Open'}
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Est. Duration</div>
                    <div className="text-slate-300 font-bold mt-0.5">
                      {selectedTender.estimated_duration_weeks || 16} Weeks
                    </div>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase">Bids Received</div>
                    <div className="text-emerald-400 font-bold mt-0.5">
                      {selectedTender.proposals?.length || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Submitted Proposals Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Competitive Proposals Submitted ({selectedTender.proposals?.length || 0})
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Institutional evaluation &amp; binding award
                  </span>
                </div>

                {(!selectedTender.proposals || selectedTender.proposals.length === 0) && (
                  <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                    No proposals submitted yet for this tender. Open for bids from accredited Pro
                    firms.
                  </div>
                )}

                <div className="space-y-3">
                  {selectedTender.proposals?.map((p) => {
                    const isAwarded = p.status === 'AWARDED';
                    const canAward = selectedTender.status === 'PUBLISHED' && !isAwarded;

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border bg-slate-900 ${
                          isAwarded
                            ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">
                                {p.firm_name || p.professional_id}
                              </h4>
                              {isAwarded && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                                  CONTRACT AWARDED
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                              {p.proposal_title}
                            </p>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-xs text-slate-400 block text-[10px]">
                              Total Bid
                            </span>
                            <span className="text-base font-bold text-amber-300">
                              ₹{p.total_financial_bid_lakh} Lakh
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 mt-2 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-850">
                          {p.technical_methodology}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
                          <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                            <span>CapEx: ₹{p.proposed_capex_lakh}L</span>
                            <span>5-Yr OpEx: ₹{p.proposed_opex_5yr_lakh}L</span>
                            <span>Timeline: {p.implementation_timeline_weeks} wks</span>
                          </div>

                          {canAward && (
                            <button
                              onClick={() =>
                                handleAwardTender(
                                  p.id,
                                  p.firm_name || p.professional_id,
                                  p.total_financial_bid_lakh
                                )
                              }
                              disabled={awarding}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>Award Contract to Firm</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center text-xs text-slate-500">
              Select a tender from the left column to inspect details and proposals.
            </div>
          )}
        </div>
      </div>

      {/* New Tender Creator Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Publish New Corridor Tender</h2>
                <p className="text-[11px] text-slate-400">
                  Issue a competitive municipal RFP for pedestrian climate interventions.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTender} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Target Corridor</label>
                <select
                  value={newCorridorId}
                  onChange={(e) => setNewCorridorId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {corridors.map((c) => (
                    <option key={c.code || c.id} value={c.code || c.id}>
                      {c.code || c.id} — {c.name} ({c.district})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Tender Title</label>
                <input
                  type="text"
                  placeholder="e.g. Pedestrian Climate Resilience RFP — Chandni Chowk"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Scope of Work</label>
                <textarea
                  rows={3}
                  placeholder="Describe technical objectives, heat mitigation targets, and streetscape requirements..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Budget Ceiling (₹ Lakh)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={newBudgetCeiling}
                    onChange={(e) => setNewBudgetCeiling(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Deadline (Days)</label>
                  <input
                    type="number"
                    min="7"
                    value={newDeadlineDays}
                    onChange={(e) => setNewDeadlineDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Duration (Wks)</label>
                  <input
                    type="number"
                    min="4"
                    value={newDurationWeeks}
                    onChange={(e) => setNewDurationWeeks(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Publishing...' : 'Publish RFP'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
