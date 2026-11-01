import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  ChevronLeft,
  X,
  ShieldAlert,
  ArrowRight,
  Check,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import DataTable from './ui/DataTable';

export default function TenderManagementView({ token, corridors = [] }) {
  const [tenders, setTenders] = useState([]);
  const [selectedTender, setSelectedTender] = useState(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [awarding, setAwarding] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 3-Step New Tender Form State
  // Step 1: Corridor & Scope
  const [newCorridorId, setNewCorridorId] = useState(corridors[0]?.code || 'C-01');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  // Step 2: Budget & Milestones
  const [newBudgetCeiling, setNewBudgetCeiling] = useState(12.0);
  const [newDurationWeeks, setNewDurationWeeks] = useState(16);
  const [newDeadlineDays, setNewDeadlineDays] = useState(21);
  // Step 3: Eligibility & CPWD Requirements
  const [eligibleCategories, setEligibleCategories] = useState([
    'LANDSCAPE_ARCHITECT',
    'URBAN_PLANNER',
    'EPC_CONTRACTOR',
  ]);
  const [cpwdCompliance, setCpwdCompliance] = useState(true);
  const [priorityObjectives, setPriorityObjectives] = useState([
    'heat_mitigation',
    'pedestrian_shade',
    'stormwater_resilience',
  ]);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.listTenders({}, token);
      const list = res.tenders || [];
      setTenders(list);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch tenders');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const handleInspectTender = async (t) => {
    try {
      const detail = await api.getTender(t.id, token);
      setSelectedTender(detail);
      setDrawerOpen(true);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load tender details');
    }
  };

  const handleCreateTender = async (e) => {
    if (e) e.preventDefault();
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
        eligible_categories: eligibleCategories,
        priority_objectives: priorityObjectives,
      };

      const res = await api.createTender(payload, token);
      setSuccessMessage(`Tender ${res.tender_id} published successfully!`);
      setModalOpen(false);
      setModalStep(1);
      // Reset form fields
      setNewTitle('');
      setNewDescription('');
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
      await api.awardTender(
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

  // KPIs
  const openTendersCount = tenders.filter(
    (t) => t.status === 'PUBLISHED' || t.status === 'Open' || t.status === 'Under Review'
  ).length;
  const awardedCount = tenders.filter(
    (t) => t.status === 'AWARDED' || t.status === 'Awarded' || t.status === 'In Progress'
  ).length;
  const totalProposalsCount = tenders.reduce(
    (sum, t) => sum + (t.proposals_count || t.proposals?.length || 0),
    0
  );
  const totalBudgetSanctioned = tenders.reduce(
    (sum, t) => sum + (Number(t.budget_ceiling_lakh || t.approved_budget_lakh) || 0),
    0
  );

  // Filtered tenders
  const filteredTenders = useMemo(() => {
    if (statusFilter === 'ALL') return tenders;
    return tenders.filter((t) => {
      const s = String(t.status || '').toLowerCase();
      const f = String(statusFilter).toLowerCase();
      return s === f || (f === 'open' && (s === 'published' || s === 'open'));
    });
  }, [tenders, statusFilter]);

  // Columns for DataTable
  const columns = [
    {
      header: 'Tender ID & Corridor',
      accessor: 'id',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
            {row.corridor_id}
          </span>
          <div>
            <div className="font-mono text-xs font-bold text-emerald-400">{row.id}</div>
            <div className="font-medium text-slate-200 truncate max-w-[200px] text-xs">
              {row.title}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Scope Preview',
      accessor: 'description',
      render: (row) => (
        <span className="text-slate-400 text-xs truncate max-w-[240px] block">
          {row.description}
        </span>
      ),
    },
    {
      header: 'Budget Ceiling',
      accessor: 'budget_ceiling_lakh',
      render: (row) => (
        <span className="font-mono font-bold text-amber-300 text-xs">
          ₹{Number(row.budget_ceiling_lakh).toFixed(2)}L
        </span>
      ),
    },
    {
      header: 'Proposals',
      accessor: 'proposals_count',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
          <span>{row.proposals_count || row.proposals?.length || 0} Bids</span>
        </div>
      ),
    },
    {
      header: 'Duration',
      accessor: 'estimated_duration_weeks',
      render: (row) => (
        <span className="font-mono text-xs text-slate-400">
          {row.estimated_duration_weeks || 16} Wks
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => {
        const s = String(row.status || 'Open').toLowerCase();
        let variant = 'info';
        let label = 'Open';
        if (s === 'awarded' || s === 'completed') {
          variant = 'success';
          label = s === 'completed' ? 'Completed' : 'Awarded';
        } else if (s === 'under review' || s === 'applied' || s === 'in progress') {
          variant = 'warning';
          label = s === 'in progress' ? 'In Progress' : 'Under Review';
        } else if (s === 'rejected' || s === 'cancelled') {
          variant = 'danger';
          label = s === 'rejected' ? 'Rejected' : 'Cancelled';
        } else {
          variant = 'info';
          label = 'Open';
        }
        return <StatusBadge variant={variant} showDot>{label}</StatusBadge>;
      },
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => handleInspectTender(row)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-medium text-xs flex items-center gap-1"
        >
          <span>Evaluate</span>
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
                MUNICIPAL PROCUREMENT
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Tender Lifecycle &amp; Work-Package Allocation
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Administer public RFPs, review accredited firm proposals, and execute binding contract
              allocations with automated single-firm exclusivity.
            </p>
          </div>

          <button
            onClick={() => {
              setModalStep(1);
              setModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>Publish New Corridor Tender</span>
          </button>
        </div>

        {/* 4 KPI StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Open Tenders"
            value={openTendersCount}
            subtitle="Accepting Sealed Bids"
            icon={Clock}
            color="blue"
          />
          <StatCard
            title="Proposals Received"
            value={totalProposalsCount}
            subtitle="Competitive Bids Filed"
            icon={Briefcase}
            color="emerald"
          />
          <StatCard
            title="Awarded Contracts"
            value={awardedCount}
            subtitle="Exclusive Work Packages"
            icon={Award}
            color="amber"
          />
          <StatCard
            title="Total RFP Ceilings"
            value={`₹${totalBudgetSanctioned.toFixed(1)}L`}
            subtitle="Municipal Greening Fund"
            icon={IndianRupee}
            color="rose"
          />
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

      {/* Main DataTable Canvas */}
      <div className="flex-1 overflow-y-auto p-6">
        <DataTable
          title="Municipal Climate Tender Directory"
          subtitle="All active, evaluated, and awarded corridor procurement packages"
          columns={columns}
          data={filteredTenders}
          onRowClick={(row) => handleInspectTender(row)}
          searchPlaceholder="Search tender by ID, title, or corridor..."
          itemsPerPage={10}
          filterComponent={
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              {['ALL', 'PUBLISHED', 'AWARDED', 'CLOSED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-medium transition ${
                    statusFilter === st
                      ? 'bg-slate-800 text-emerald-300 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {/* Slide-over Tender Detail & Sealed Proposals Drawer */}
      {drawerOpen && selectedTender && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col justify-between overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded border border-slate-700">
                      {selectedTender.corridor_id}
                    </span>
                    <span className="font-mono text-xs text-slate-400 font-medium">
                      {selectedTender.id}
                    </span>
                    {selectedTender.status === 'PUBLISHED' ? (
                      <StatusBadge variant="info" showDot>
                        PUBLISHED
                      </StatusBadge>
                    ) : (
                      <StatusBadge variant="success" showDot>
                        AWARDED
                      </StatusBadge>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1.5">
                    {selectedTender.title}
                  </h3>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
                {selectedTender.description}
              </p>

              {/* Quick Spec Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Ceiling</span>
                  <span className="text-amber-300 font-bold text-sm">
                    ₹{selectedTender.budget_ceiling_lakh}L
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Est. Duration</span>
                  <span className="text-white font-bold text-sm">
                    {selectedTender.estimated_duration_weeks || 16} Wks
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Deadline</span>
                  <span className="text-slate-300 font-bold text-xs">
                    {selectedTender.submission_deadline
                      ? selectedTender.submission_deadline.substring(0, 10)
                      : 'Open'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Proposals</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    {selectedTender.proposals?.length || 0}
                  </span>
                </div>
              </div>

              {/* Submitted Proposals Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Competitive Proposals Submitted ({selectedTender.proposals?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Sealed Bid Review &amp; Contract Award
                  </span>
                </div>

                {(!selectedTender.proposals || selectedTender.proposals.length === 0) && (
                  <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                    No proposals submitted yet for this tender. Open for bids from accredited Pro firms.
                  </div>
                )}

                <div className="space-y-3">
                  {selectedTender.proposals?.map((p) => {
                    const isAwarded = p.status === 'AWARDED' || p.status === 'Awarded';
                    const canAward = (selectedTender.status === 'PUBLISHED' || selectedTender.status === 'Open' || selectedTender.status === 'Under Review') && !isAwarded;

                    return (
                      <div
                        key={p.id}
                        className={`p-4 rounded-xl border bg-slate-950 space-y-3 ${
                          isAwarded
                            ? 'border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-sm font-bold text-white">
                                {p.firm_name || p.professional_id}
                              </h5>
                              {isAwarded && (
                                <StatusBadge variant="success" showDot>
                                  CONTRACT AWARDED
                                </StatusBadge>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                              {p.proposal_title}
                            </p>
                          </div>

                          <div className="text-right font-mono">
                            <span className="text-[10px] text-slate-400 block uppercase">
                              Total Bid
                            </span>
                            <span className="text-base font-bold text-amber-300">
                              ₹{p.total_financial_bid_lakh} Lakh
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                          {p.technical_methodology}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
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
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
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

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contrasys-Style 3-Step Modal for Tender Creation */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Publish New Corridor Tender
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Issue a competitive municipal RFP for pedestrian climate interventions.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Wizard Indicator */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { step: 1, title: 'Corridor & Scope' },
                { step: 2, title: 'Budget & Milestones' },
                { step: 3, title: 'Eligibility & Specs' },
              ].map((s) => (
                <div
                  key={s.step}
                  onClick={() => modalStep > s.step && setModalStep(s.step)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    modalStep === s.step
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                      : modalStep > s.step
                      ? 'bg-slate-950 border-slate-800 text-slate-300 cursor-pointer'
                      : 'bg-slate-950/40 border-slate-850 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase">
                    {modalStep > s.step ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <span>0{s.step}</span>
                    )}
                    <span>Step {s.step}</span>
                  </div>
                  <div className="text-xs font-semibold mt-0.5 truncate">{s.title}</div>
                </div>
              ))}
            </div>

            {/* Step Form Body */}
            <div className="space-y-4 text-xs">
              {/* STEP 1: Corridor & Scope */}
              {modalStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-slate-400 mb-1.5 font-medium">
                      Target Urban Corridor
                    </label>
                    <select
                      value={newCorridorId}
                      onChange={(e) => setNewCorridorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      {corridors.map((c) => (
                        <option key={c.code || c.id} value={c.code || c.id}>
                          {c.code || c.id} — {c.name} ({c.district})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-medium">Tender Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Pedestrian Climate Resilience RFP — Chandni Chowk"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1.5 font-medium">
                      Scope of Work &amp; Technical Objectives
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe target streetscape objectives, heat mitigation standards, bioswale requirements, and pedestrian shade coverage..."
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: Budget & Milestones */}
              {modalStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1.5 font-medium">
                        Budget Ceiling (₹ Lakh)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        value={newBudgetCeiling}
                        onChange={(e) => setNewBudgetCeiling(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1.5 font-medium">
                        Bidding Window (Days)
                      </label>
                      <input
                        type="number"
                        min="7"
                        value={newDeadlineDays}
                        onChange={(e) => setNewDeadlineDays(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1.5 font-medium">
                        Delivery Horizon (Wks)
                      </label>
                      <input
                        type="number"
                        min="4"
                        value={newDurationWeeks}
                        onChange={(e) => setNewDurationWeeks(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-300 font-mono">
                      Milestone Schedule Structure:
                    </span>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                      <li>Phase 1: GPR Survey &amp; Tree Planting Suitability (Weeks 1-4)</li>
                      <li>Phase 2: Bioswales &amp; Permeable Pavement Installation (Weeks 5-10)</li>
                      <li>Phase 3: Sensor Calibration &amp; Handover to Municipal Cell (Weeks 11-16)</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* STEP 3: Eligibility & CPWD Requirements */}
              {modalStep === 3 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-slate-400 mb-2 font-medium">
                      Eligible Firm Categories
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: 'LANDSCAPE_ARCHITECT', label: 'Landscape Architects (COA)' },
                        { id: 'URBAN_PLANNER', label: 'Urban Planners (ITPI)' },
                        { id: 'EPC_CONTRACTOR', label: 'EPC Climate Contractors' },
                        { id: 'HORTICULTURE_SPECIALIST', label: 'Horticulture Specialists' },
                      ].map((cat) => {
                        const checked = eligibleCategories.includes(cat.id);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => {
                              if (checked) {
                                setEligibleCategories(
                                  eligibleCategories.filter((c) => c !== cat.id)
                                );
                              } else {
                                setEligibleCategories([...eligibleCategories, cat.id]);
                              }
                            }}
                            className={`p-3 rounded-xl border flex items-center gap-2 cursor-pointer transition ${
                              checked
                                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center border ${
                                checked
                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                  : 'border-slate-700'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-medium">{cat.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-white text-xs">
                        CPWD &amp; DDA Schedule of Rates (DSR 2023) Conformance
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Proposals must conform to standard Central Public Works Department unit
                        cost benchmarks for civil works, tree pit excavation, and storm water
                        channels.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Stepper Footer Controls */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  if (modalStep > 1) {
                    setModalStep(modalStep - 1);
                  } else {
                    setModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium text-xs flex items-center gap-1.5 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{modalStep === 1 ? 'Cancel' : 'Back'}</span>
              </button>

              {modalStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setModalStep(modalStep + 1)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateTender}
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-950/40"
                >
                  <Plus className="w-4 h-4" />
                  <span>{submitting ? 'Publishing RFP...' : 'Confirm & Publish RFP'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}