import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { api } from '../api/client';

export default function TenderMarketplaceView({ token, corridors = [] }) {
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
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

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.listTenders({}, token);
      setTenders(res.tenders || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load tenders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const handleOpenProposalModal = async (t) => {
    setSelectedTender(t);
    setProposalTitle(`Climate Action Masterplan — ${t.corridor_id} (${t.title})`);
    setModalOpen(true);
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
      setModalOpen(false);
      await loadTenders();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
                PRO PROCUREMENT MARKETPLACE
              </span>
              <h1 className="text-lg font-bold text-white">
                Municipal Climate Corridor Tender Marketplace
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Browse active municipal RFPs and submit competitive, data-backed climate intervention
              proposals.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Bid Privacy:</span>
            <span className="text-blue-300 font-bold">SEALED COMPETITIVE BIDS</span>
          </div>
        </div>

        {/* Confidentiality Notice Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-300">
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
        <div className="mx-5 mt-4 p-3 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between">
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

      {/* Tender Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenders.map((t) => {
            const isPublished = t.status === 'PUBLISHED';
            const isAwarded = t.status === 'AWARDED';

            return (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between hover:border-slate-700 transition shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-xs font-bold border border-slate-700">
                      {t.corridor_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPublished
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-white line-clamp-2">{t.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-3 leading-relaxed">
                      {t.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">
                        Budget Ceiling
                      </span>
                      <span className="text-amber-300 font-bold">₹{t.budget_ceiling_lakh} Lakh</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Est. Duration</span>
                      <span className="text-slate-300 font-bold">
                        {t.estimated_duration_weeks || 16} Weeks
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Deadline: {t.submission_deadline ? t.submission_deadline.substring(0, 10) : 'Open'}
                  </div>

                  {isPublished ? (
                    <button
                      onClick={() => handleOpenProposalModal(t)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Bid</span>
                    </button>
                  ) : (
                    <span className="text-xs font-mono text-slate-500">Tender Closed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Submit Proposal Modal */}
      {modalOpen && selectedTender && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Submit Tender Proposal</h2>
                <p className="text-[11px] text-slate-400">
                  Target Tender: <span className="font-mono text-white">{selectedTender.id}</span> (
                  {selectedTender.corridor_id})
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProposal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Proposal Title</label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Proposed CapEx (₹L)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    max={selectedTender.budget_ceiling_lakh}
                    value={proposedCapex}
                    onChange={(e) => setProposedCapex(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs flex justify-between">
                <span className="text-slate-400">Total Financial Bid:</span>
                <span className="text-amber-300 font-bold">
                  ₹{(Number(proposedCapex) + Number(proposedOpex)).toFixed(2)} Lakh
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Submitting Bid...' : 'Submit Sealed Bid'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
