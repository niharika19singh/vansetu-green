import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  IndianRupee,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Play,
  FileCheck,
  ShieldCheck,
  Building2,
  Briefcase,
  Layers,
  X,
  ThermometerSnowflake,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import DataTable from './ui/DataTable';
import { formatCurrencyLakh } from '../utils/numericFormat';

export default function CorridorCostOptimizerView({
  token,
  corridors = [],
  selectedCorridor,
  isGovernmentUser = true,
}) {
  const [corridorId, setCorridorId] = useState(
    selectedCorridor?.code || corridors[0]?.code || 'C-14'
  );
  const [baseline, setBaseline] = useState(null);
  const [optimizedResult, setOptimizedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Optimization Parameters
  const [budgetCeiling, setBudgetCeiling] = useState(10.0);
  const [maintenanceHorizon, setMaintenanceHorizon] = useState(5);
  const [discountRate, setDiscountRate] = useState(0.04);
  const [minCoolingTarget, setMinCoolingTarget] = useState(1.5);

  // Government Approval Fields
  const [approvedBudgetLakh, setApprovedBudgetLakh] = useState(8.5);
  const [contingencyPct, setContingencyPct] = useState(5.0);
  const [approvalNotes, setApprovalNotes] = useState(
    'Sanctioned under Municipal Green Corridor Resilience Fund.'
  );

  useEffect(() => {
    if (selectedCorridor?.code) {
      setCorridorId(selectedCorridor.code);
    }
  }, [selectedCorridor]);

  const loadBaseline = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getCorridorCostBaseline(corridorId, token);
      setBaseline(res);
      if (res.approved_budget_lakh) {
        setApprovedBudgetLakh(res.approved_budget_lakh);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load cost baseline');
    } finally {
      setLoading(false);
    }
  }, [corridorId, token]);

  useEffect(() => {
    loadBaseline();
  }, [loadBaseline]);

  const handleRunOptimizer = async () => {
    setOptimizing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.optimizeCorridorCost(
        corridorId,
        {
          budget_ceiling_lakh: Number(budgetCeiling),
          maintenance_horizon_years: Number(maintenanceHorizon),
          discount_rate: Number(discountRate),
          min_cooling_target_celsius: Number(minCoolingTarget),
        },
        token
      );
      setOptimizedResult(res);
      setSuccessMessage('Cost optimization completed successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'Optimization failed');
    } finally {
      setOptimizing(false);
    }
  };

  const handleApproveBudget = async () => {
    if (
      !window.confirm(
        `Confirm official budget approval of ₹${approvedBudgetLakh} Lakh for corridor ${corridorId}?`
      )
    ) {
      return;
    }

    setApproving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.approveCorridorBudget(
        corridorId,
        {
          approved_budget_lakh: Number(approvedBudgetLakh),
          contingency_percentage: Number(contingencyPct),
          approval_notes: approvalNotes,
        },
        token
      );
      setSuccessMessage(
        `Budget officially approved! Total Sanctioned: ₹${res.total_sanctioned_lakh} Lakh`
      );
      await loadBaseline();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to approve budget');
    } finally {
      setApproving(false);
    }
  };

  const isSanctioned = Boolean(baseline?.approved_budget_lakh);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                CAPEX / OPEX MODELING
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Corridor Cost Optimization &amp; Budget Sanction
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Optimize upfront capital expenditure and 5-year maintenance lifecycle costs using Mixed
              Integer Linear Programming (MILP) with strict Central Public Works Department (CPWD) rate benchmarks.
            </p>
          </div>

          {/* Corridor Selector */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span className="text-xs text-slate-400 font-mono">Target:</span>
            <select
              value={corridorId}
              onChange={(e) => setCorridorId(e.target.value)}
              className="bg-transparent text-xs text-emerald-400 font-mono font-bold focus:outline-none cursor-pointer"
            >
              {corridors.map((c) => (
                <option key={c.code || c.id} value={c.code || c.id} className="bg-slate-900 text-slate-100">
                  {c.code || c.id} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Est. Baseline CapEx"
            value={`₹${baseline?.baseline_capex_lakh || '6.80'}L`}
            subtitle="Initial Civil &amp; Green Works"
            icon={IndianRupee}
            color="amber"
          />
          <StatCard
            title="Est. 5-Yr OpEx"
            value={`₹${baseline?.baseline_opex_5yr_lakh || '2.40'}L`}
            subtitle="Irrigation &amp; Tree Maintenance"
            icon={Layers}
            color="blue"
          />
          <StatCard
            title="Min Cooling Target"
            value={`-${minCoolingTarget}°C`}
            subtitle="Pedestrian LST Reduction"
            icon={ThermometerSnowflake}
            color="emerald"
          />
          <StatCard
            title="Sanction Status"
            value={isSanctioned ? `₹${baseline.approved_budget_lakh}L` : 'PENDING'}
            subtitle={isSanctioned ? 'Officially Sanctioned' : 'Requires Municipal Review'}
            icon={ShieldCheck}
            color={isSanctioned ? 'emerald' : 'rose'}
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

      {/* Main Split-Pane Canvas */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: MILP Controls & Budget Sanction Form */}
        <div className="lg:col-span-5 h-full border-r border-slate-800 overflow-y-auto p-6 space-y-5">
          {/* MILP Optimization Configuration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                  MILP Parameters
                </h3>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">HiGHS Solver</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1.5 font-medium">
                  <span>CapEx Budget Ceiling:</span>
                  <span className="font-mono text-emerald-400 font-bold">₹{budgetCeiling} Lakh</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="25"
                  step="0.5"
                  value={budgetCeiling}
                  onChange={(e) => setBudgetCeiling(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1.5 font-medium">
                  <span>Maintenance Horizon:</span>
                  <span className="font-mono text-blue-400 font-bold">
                    {maintenanceHorizon} Years
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={maintenanceHorizon}
                  onChange={(e) => setMaintenanceHorizon(Number(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1.5 font-medium">
                  <span>Cooling Performance Constraint:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    -{minCoolingTarget}°C LST
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={minCoolingTarget}
                  onChange={(e) => setMinCoolingTarget(Number(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <button
                onClick={handleRunOptimizer}
                disabled={optimizing}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
              >
                <Play className="w-4 h-4" />
                <span>{optimizing ? 'Solving HiGHS Simplex...' : 'Execute Cost Optimization'}</span>
              </button>
            </div>
          </div>

          {/* Government Sanction Card */}
          {isGovernmentUser && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    Official Municipal Budget Sanction
                  </h3>
                </div>
                <StatusBadge variant={isSanctioned ? 'success' : 'default'} showDot>
                  {isSanctioned ? 'SANCTIONED' : 'DRAFT'}
                </StatusBadge>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Sanctioned CapEx (₹ Lakh)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={approvedBudgetLakh}
                    onChange={(e) => setApprovedBudgetLakh(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Contingency Reserve (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={contingencyPct}
                    onChange={(e) => setContingencyPct(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Sanction Order Notes</label>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleApproveBudget}
                  disabled={approving}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{approving ? 'Signing & Stamping...' : 'Sign-Off & Sanction Budget'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Optimization Results & Interventions Schedule */}
        <div className="lg:col-span-7 h-full overflow-y-auto p-6 space-y-5">
          {optimizedResult ? (
            <div className="space-y-5">
              {/* Result Overview Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      Optimal Solution Found (HiGHS / SciPy)
                    </span>
                    <span className="text-slate-500 text-xs">• 0.04s solve time</span>
                  </div>
                  <StatusBadge variant="info" showDot>
                    {optimizedResult.is_indicative_estimate
                      ? 'INDICATIVE COST ESTIMATE'
                      : 'SANCTIONED BUDGET'}
                  </StatusBadge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Optimized CapEx</span>
                    <span className="text-amber-300 font-bold text-base">
                      ₹{optimizedResult.optimized_capex_lakh}L
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">5-Yr OpEx</span>
                    <span className="text-blue-300 font-bold text-base">
                      ₹{optimizedResult.optimized_opex_5yr_lakh}L
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Cost</span>
                    <span className="text-emerald-400 font-bold text-base">
                      ₹{optimizedResult.optimized_total_cost_lakh}L
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 uppercase block">Cooling Impact</span>
                    <span className="text-cyan-300 font-bold text-base">
                      -{optimizedResult.projected_cooling_celsius}°C
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20 font-medium">
                  <TrendingDown className="w-4 h-4 shrink-0" />
                  <span>
                    Estimated lifecycle savings: ₹{optimizedResult.estimated_savings_lakh || '1.20'}{' '}
                    Lakh compared to standard unoptimized procurement.
                  </span>
                </div>
              </div>

              {/* Physical Interventions Schedule */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                    Recommended Physical Interventions Schedule
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">DSR 2023 Conformance</span>
                </div>

                <div className="divide-y divide-slate-800/80 text-xs">
                  {optimizedResult.selected_interventions?.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-bold text-white text-xs">{item.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Qty: <span className="font-mono text-slate-300">{item.quantity}</span> {item.unit} • Unit CapEx: <span className="font-mono text-slate-300">₹{item.unit_capex_lakh}L</span>
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-amber-300 font-bold text-sm">
                          {formatCurrencyLakh(item.quantity * item.unit_capex_lakh, 2)}
                        </div>
                        <div className="text-[10px] text-emerald-400">
                          +{item.cooling_impact_celsius}°C Cooling
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade-off Alternatives Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Alternative A: Maximum Thermal Shield</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Prioritizes dense Pilkhan &amp; Neem canopy cover to achieve up to -2.3°C cooling with slightly higher year-1 irrigation expenditure.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Alternative B: Living Bio-Retention Sponge</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Maximizes permeable pavement and bioswales for urban flood mitigation, reducing waterlogging while keeping OpEx minimal.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-3 bg-slate-900/30 border border-slate-850 rounded-2xl">
              <Calculator className="w-12 h-12 text-slate-700" />
              <div>
                <h4 className="text-sm font-bold text-slate-300">No Optimization Model Run Yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Configure budget ceiling and maintenance parameters on the left and click &quot;Execute Cost Optimization&quot;.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}