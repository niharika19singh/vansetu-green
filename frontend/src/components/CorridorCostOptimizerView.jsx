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
} from 'lucide-react';
import { api } from '../api/client';

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

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
              CAPEX / OPEX MODELING
            </span>
            <h1 className="text-lg font-bold text-white">
              Corridor Cost Optimization &amp; Budget Sanction
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Optimize upfront capital expenditure and 5-year maintenance lifecycle costs using Mixed
            Integer Linear Programming (MILP).
          </p>
        </div>

        {/* Corridor Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Select Corridor:</span>
          <select
            value={corridorId}
            onChange={(e) => setCorridorId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
          >
            {corridors.map((c) => (
              <option key={c.code || c.id} value={c.code || c.id}>
                {c.code || c.id} — {c.name}
              </option>
            ))}
          </select>
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

      {/* Main Content Layout */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Column: Baseline & Optimization Parameters */}
        <div className="lg:col-span-5 h-full border-r border-slate-800 overflow-y-auto p-5 space-y-5">
          {/* Baseline Summary Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono uppercase">
                Corridor {corridorId} Baseline
              </span>
              {baseline?.approved_budget_lakh ? (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                  SANCTIONED: ₹{baseline.approved_budget_lakh}L
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">
                  PENDING APPROVAL
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase block">Est. CapEx</span>
                <span className="text-amber-300 font-bold text-sm">
                  ₹{baseline?.baseline_capex_lakh || '6.80'} Lakh
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                <span className="text-[10px] text-slate-500 uppercase block">Est. 5-Yr OpEx</span>
                <span className="text-blue-300 font-bold text-sm">
                  ₹{baseline?.baseline_opex_5yr_lakh || '2.40'} Lakh
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 pt-1">
              Length: <span className="text-white font-mono">{baseline?.length_km || 1.8} km</span>{' '}
              • District:{' '}
              <span className="text-white font-medium">{baseline?.district || 'Central'}</span>
            </div>
          </div>

          {/* Optimizer Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase font-mono">
                MILP Optimization Parameters
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Budget Ceiling:</span>
                  <span className="font-mono text-emerald-400 font-bold">₹{budgetCeiling} Lakh</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="25"
                  step="0.5"
                  value={budgetCeiling}
                  onChange={(e) => setBudgetCeiling(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
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
                  className="w-full accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-400 mb-1">
                  <span>Min Cooling Target:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {minCoolingTarget}°C LST Reduction
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={minCoolingTarget}
                  onChange={(e) => setMinCoolingTarget(Number(e.target.value))}
                  className="w-full accent-cyan-500"
                />
              </div>

              <button
                onClick={handleRunOptimizer}
                disabled={optimizing}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
              >
                <Play className="w-4 h-4" />
                <span>{optimizing ? 'Solving MILP...' : 'Execute Cost Optimization'}</span>
              </button>
            </div>
          </div>

          {/* Government Formal Budget Approval Panel (If Govt Role) */}
          {isGovernmentUser && (
            <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase font-mono">
                  Official Municipal Budget Sanction
                </h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Approved Budget (₹ Lakh)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    min="1"
                    value={approvedBudgetLakh}
                    onChange={(e) => setApprovedBudgetLakh(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Approval Notes</label>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={handleApproveBudget}
                  disabled={approving}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{approving ? 'Sanctioning...' : 'Sign-Off & Sanction Budget'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Optimization Results & Interventions Breakdown */}
        <div className="lg:col-span-7 h-full overflow-y-auto p-5 space-y-5">
          {optimizedResult ? (
            <div className="space-y-5">
              {/* Status Header */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    Optimal Solution Found (HiGHS / SciPy)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                    {optimizedResult.is_indicative_estimate
                      ? 'INDICATIVE COST ESTIMATE'
                      : 'SANCTIONED BUDGET'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase block">Optimized CapEx</span>
                    <span className="text-amber-300 font-bold text-sm">
                      ₹{optimizedResult.optimized_capex_lakh}L
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase block">5-Yr OpEx</span>
                    <span className="text-blue-300 font-bold text-sm">
                      ₹{optimizedResult.optimized_opex_5yr_lakh}L
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Cost</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      ₹{optimizedResult.optimized_total_cost_lakh}L
                    </span>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850">
                    <span className="text-[10px] text-slate-500 uppercase block">Projected Cooling</span>
                    <span className="text-cyan-300 font-bold text-sm">
                      -{optimizedResult.projected_cooling_celsius}°C
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-emerald-400 pt-1">
                  <TrendingDown className="w-4 h-4" />
                  <span>
                    Estimated lifecycle savings: ₹{optimizedResult.estimated_savings_lakh || '1.20'}{' '}
                    Lakh compared to standard unoptimized procurement.
                  </span>
                </div>
              </div>

              {/* Interventions Schedule Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
                  Recommended Physical Interventions Schedule
                </h3>

                <div className="divide-y divide-slate-800 text-xs">
                  {optimizedResult.selected_interventions?.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Qty: {item.quantity} {item.unit} • Unit CapEx: ₹{item.unit_capex_lakh}L
                        </div>
                      </div>
                      <div className="text-right font-mono">
                        <div className="text-amber-300 font-bold">
                          ₹{(item.quantity * item.unit_capex_lakh).toFixed(2)}L
                        </div>
                        <div className="text-[10px] text-slate-400">
                          +{item.cooling_impact_celsius}°C Cooling
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-slate-500 space-y-2">
              <Calculator className="w-10 h-10 text-slate-700" />
              <p>Configure parameters on the left and click &quot;Execute Cost Optimization&quot;.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
