import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Layers,
  Award,
  Shield,
} from 'lucide-react';
import { api } from '../api/client';

export default function MyProposalsView({ token }) {
  const [tenders, setTenders] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listTenders({}, token);
      const list = res.tenders || [];
      setTenders(list);

      // Collect all proposals returned for this authenticated firm
      const collected = [];
      for (const t of list) {
        if (t.proposals && t.proposals.length > 0) {
          for (const p of t.proposals) {
            collected.push({
              ...p,
              tenderTitle: t.title,
              tenderCorridor: t.corridor_id,
              tenderStatus: t.status,
            });
          }
        }
      }
      setMyProposals(collected);
    } catch (err) {
      console.error('Failed to load proposals', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
            PROPOSALS &amp; BIDS
          </span>
          <h1 className="text-lg font-bold text-white">My Submitted Tender Proposals</h1>
        </div>
        <p className="text-xs text-slate-400">
          Track competitive bid statuses, technical evaluations, and contract award decisions.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && (
          <div className="p-8 text-center text-xs text-slate-500">Loading submitted bids...</div>
        )}

        {!loading && myProposals.length === 0 && (
          <div className="p-12 text-center text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl max-w-md mx-auto space-y-3">
            <FileText className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Submitted Proposals Found</h3>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Your firm has not submitted any proposals yet. Visit the Tender Marketplace to browse
              active municipal RFPs.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myProposals.map((p) => {
            const isAwarded = p.status === 'AWARDED';

            return (
              <div
                key={p.id}
                className={`bg-slate-900 border rounded-2xl p-5 space-y-3 flex flex-col justify-between ${
                  isAwarded
                    ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                    : 'border-slate-800'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {p.tenderCorridor || 'C-14'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isAwarded
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{p.proposal_title}</h3>
                  <div className="text-[11px] text-slate-400 line-clamp-1">
                    Tender: {p.tenderTitle} ({p.tender_id})
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-850 leading-relaxed">
                    {p.technical_methodology}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="text-slate-400 text-[11px]">
                    CapEx: ₹{p.proposed_capex_lakh}L • OpEx: ₹{p.proposed_opex_5yr_lakh}L
                  </div>
                  <div className="text-amber-300 font-bold">
                    Total: ₹{p.total_financial_bid_lakh}L
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
