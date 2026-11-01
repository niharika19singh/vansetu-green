import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Layers,
  Award,
  Shield,
  Briefcase,
  ArrowRight,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import DataTable from './ui/DataTable';
import { formatCurrencyLakh } from '../utils/numericFormat';

export default function MyProposalsView({ token }) {
  const [tenders, setTenders] = useState([]);
  const [myProposals, setMyProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);

  const loadProposals = useCallback(async () => {
    setLoading(true);
    try {
      const [tenRes, propRes] = await Promise.allSettled([
        api.listTenders({}, token),
        api.getMyProposals(token),
      ]);
      if (tenRes.status === 'fulfilled') {
        setTenders(tenRes.value.tenders || []);
      }
      if (propRes.status === 'fulfilled') {
        setMyProposals(propRes.value.proposals || []);
      }
    } catch (err) {
      console.error('Failed to load proposals', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const awardedCount = myProposals.filter((p) => p.status === 'AWARDED').length;
  const pendingCount = myProposals.filter((p) => p.status !== 'AWARDED').length;
  const totalBidValue = myProposals.reduce(
    (s, p) => s + (Number(p.total_financial_bid_lakh) || 0),
    0
  );

  const columns = [
    {
      header: 'Corridor & RFP',
      accessor: 'tenderCorridor',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            {row.tenderCorridor || 'C-14'}
          </span>
          <div>
            <div className="font-bold text-slate-200 text-xs truncate max-w-[200px]">
              {row.tenderTitle}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Proposal: {row.id}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Proposal Title',
      accessor: 'proposal_title',
      render: (row) => (
        <span className="text-slate-300 text-xs font-medium truncate max-w-[220px] block">
          {row.proposal_title}
        </span>
      ),
    },
    {
      header: 'Financial Bid',
      accessor: 'total_financial_bid_lakh',
      render: (row) => (
        <div className="font-mono">
          <div className="font-bold text-amber-300 text-xs">
            {formatCurrencyLakh(row.total_financial_bid_lakh, 2)}
          </div>
          <div className="text-[10px] text-slate-400">
            CapEx: ₹{row.proposed_capex_lakh}L • OpEx: ₹{row.proposed_opex_5yr_lakh}L
          </div>
        </div>
      ),
    },
    {
      header: 'Timeline',
      accessor: 'implementation_timeline_weeks',
      render: (row) => (
        <span className="font-mono text-slate-300 text-xs">
          {row.implementation_timeline_weeks} Weeks
        </span>
      ),
    },
    {
      header: 'Evaluation Status',
      accessor: 'status',
      render: (row) => {
        if (row.status === 'AWARDED') {
          return (
            <StatusBadge variant="success" showDot>
              CONTRACT AWARDED
            </StatusBadge>
          );
        }
        return (
          <StatusBadge variant="info" showDot>
            UNDER EVALUATION
          </StatusBadge>
        );
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => setSelectedProposal(row)}
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
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold border border-blue-500/40">
                PROPOSALS &amp; BIDS
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                My Submitted Tender Proposals
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Track competitive bid statuses, technical evaluations, and contract award decisions with
              confidential sealed proposal protection.
            </p>
          </div>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Bids Submitted"
            value={myProposals.length}
            subtitle="Municipal RFPs Addressed"
            icon={Briefcase}
            color="blue"
          />
          <StatCard
            title="Contracts Awarded"
            value={awardedCount}
            subtitle="Exclusive Project Allocations"
            icon={Award}
            color="emerald"
          />
          <StatCard
            title="Under Review"
            value={pendingCount}
            subtitle="Pending Board Evaluation"
            icon={Clock}
            color="amber"
          />
          <StatCard
            title="Aggregate Bid Volume"
            value={formatCurrencyLakh(totalBidValue, 1)}
            subtitle="CapEx + 5-Yr OpEx Submitted"
            icon={IndianRupee}
            color="rose"
          />
        </div>
      </div>

      {/* Main Table Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        <DataTable
          title="Submitted Bids Directory"
          subtitle="All sealed proposals filed by Studio Vriksh under Municipal Tenders"
          columns={columns}
          data={myProposals}
          onRowClick={(row) => setSelectedProposal(row)}
          searchPlaceholder="Search proposals by corridor or title..."
          itemsPerPage={8}
        />
      </div>

      {/* Slide-over Proposal Details Drawer */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {selectedProposal.tenderCorridor}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {selectedProposal.id}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">
                    {selectedProposal.proposal_title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                    Evaluation Status
                  </span>
                  {selectedProposal.status === 'AWARDED' ? (
                    <StatusBadge variant="success" showDot>
                      CONTRACT AWARDED
                    </StatusBadge>
                  ) : (
                    <StatusBadge variant="info" showDot>
                      UNDER EVALUATION
                    </StatusBadge>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedProposal.status === 'AWARDED'
                    ? 'Congratulations! This proposal was selected by the Municipal Engineering Board and granted exclusive corridor execution rights.'
                    : 'Your proposal is currently under technical and financial review. Bids remain sealed from competing firms.'}
                </p>
              </div>

              {/* Financial & Timeline Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Proposed CapEx</span>
                  <span className="text-amber-300 font-bold text-sm">
                    ₹{selectedProposal.proposed_capex_lakh}L
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">5-Yr OpEx</span>
                  <span className="text-blue-300 font-bold text-sm">
                    ₹{selectedProposal.proposed_opex_5yr_lakh}L
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Total Bid</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{selectedProposal.total_financial_bid_lakh}L
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Timeline</span>
                  <span className="text-white font-bold text-sm">
                    {selectedProposal.implementation_timeline_weeks} Wks
                  </span>
                </div>
              </div>

              {/* Technical Methodology */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-400 uppercase font-mono">
                  Technical Methodology
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                  {selectedProposal.technical_methodology}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedProposal(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}