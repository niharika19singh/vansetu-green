import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  IndianRupee,
  Play,
  Sliders,
} from 'lucide-react';
import { api } from '../api/client';

export default function InterventionOptimizerView({
  selectedCorridor,
  mekoEnabled,
  onToggleMeko,
}) {
  const [budgetLakh, setBudgetLakh] = useState(8.0);
  const [climatePriority, setClimatePriority] = useState('heat_resilience');
  const [equityWeight, setEquityWeight] = useState(0.25);
  const [targetCorridorCode, setTargetCorridorCode] = useState(
    selectedCorridor?.code || 'C-14'
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCorridor?.code) {
      setTargetCorridorCode(selectedCorridor.code);
    }
  }, [selectedCorridor]);

  const executeOptimizer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.runOptimizer({
        budget_lakh: Number(budgetLakh),
        target_corridor_ids: [targetCorridorCode],
        climate_priority: climatePriority,
        equity_weight: Number(equityWeight),
        meko_enabled: mekoEnabled,
      });
      setResult(res);
    } catch (err) {
      console.error('Optimizer error:', err);
    } finally {
      setLoading(false);
    }
  }, [budgetLakh, targetCorridorCode, climatePriority, equityWeight, mekoEnabled]);

  useEffect(() => {
    executeOptimizer();
  }, [executeOptimizer]);

  const fin = result?.financial_summary || {};
  const selected = result?.selected_interventions || [];
  const rejected = result?.rejected_alternatives || [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Budget-Constrained Climate Intervention Optimizer (MILP)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              scipy.optimize.milp • Deterministic Solver
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Allocates municipal capital budgets across the 5 GreenTech intervention classes using Mixed-Integer Linear Programming—never LLM guesswork.
          </p>
        </div>

        {/* Meko Constraint Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-300">
            Meko Institutional Site Memory:
          </span>
          <button
            onClick={() => onToggleMeko(!mekoEnabled)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              mekoEnabled
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {mekoEnabled ? 'MEKO ON (Recalls Survey-014)' : 'MEKO OFF (Stateless)'}
          </button>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs">
        <div>
          <label className="text-slate-400 block mb-1 font-medium">
            Target Corridor (Code / ID)
          </label>
          <input
            type="text"
            value={targetCorridorCode}
            onChange={(e) => setTargetCorridorCode(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-white"
          />
          <span className="text-[10px] text-slate-400 mt-1 block">
            Tip: Use <code className="text-emerald-300">C-14</code> (Ward 12 Lal Bahadur Shastri Marg)
          </span>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">
            Available Municipal Budget: <span className="text-emerald-400 font-mono font-bold">₹{Number(budgetLakh).toFixed(2)} Lakh</span>
          </label>
          <input
            type="range"
            min="2"
            max="35"
            step="0.5"
            value={budgetLakh}
            onChange={(e) => setBudgetLakh(parseFloat(e.target.value))}
            className="w-full accent-emerald-500 mt-1"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>₹2.0L</span>
            <button
              onClick={() => {
                setTargetCorridorCode('C-14');
                setBudgetLakh(8.0);
              }}
              className="text-emerald-400 underline"
            >
              Reset Demo (C-14 @ ₹8.0L)
            </button>
            <span>₹35.0L</span>
          </div>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">
            Climate Objective Priority
          </label>
          <select
            value={climatePriority}
            onChange={(e) => setClimatePriority(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="heat_resilience">Heat Resilience (Thermal Priority)</option>
            <option value="air_quality">Air Quality (PM2.5/PM10 Filtration)</option>
            <option value="pedestrian_equity">Pedestrian &amp; Social Equity</option>
            <option value="baseline">Balanced Multi-Hazard Baseline</option>
          </select>
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <label className="text-slate-400 block mb-1 font-medium">
              Social Equity Multiplier: <span className="font-mono text-purple-300">{equityWeight}</span>
            </label>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={equityWeight}
              onChange={(e) => setEquityWeight(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>
          <button
            onClick={executeOptimizer}
            disabled={loading}
            className="mt-2 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{loading ? 'Solving MILP...' : 'Run MILP Portfolio Solver'}</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Budget Ceiling</span>
          <span className="text-lg font-mono font-bold text-white">
            ₹{fin.available_budget_inr_lakhs ?? budgetLakh}L
          </span>
        </div>
        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Selected CapEx</span>
          <span className="text-lg font-mono font-bold text-emerald-400">
            ₹{fin.total_capex_inr_lakhs ?? 0}L
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Annual OpEx</span>
          <span className="text-lg font-mono font-bold text-amber-300">
            ₹{fin.total_annual_opex_inr_lakhs ?? 0}L/yr
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">5-Year Lifecycle Cost</span>
          <span className="text-lg font-mono font-bold text-cyan-300">
            ₹{fin.total_five_year_lifecycle_inr_lakhs ?? 0}L
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[11px] text-slate-400 block">Remaining Budget</span>
          <span className="text-lg font-mono font-bold text-slate-200">
            ₹{fin.remaining_budget_inr_lakhs ?? 0}L ({fin.budget_utilization_pct ?? 0}% used)
          </span>
        </div>
      </div>

      {/* Active Meko Site Constraints Alert */}
      {result?.applied_site_restrictions?.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-amber-200">
              Meko Institutional Site Restriction Enforced (Evidence: {result.applied_site_restrictions[0].evidence_reference})
            </div>
            <p className="text-amber-100/90 mt-0.5">
              {result.applied_site_restrictions[0].reason}
            </p>
          </div>
        </div>
      )}

      {/* Selected vs Rejected Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Selected Portfolio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Selected Portfolio ({selected.length} Interventions)
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              CPWD DSR 2023 Reference Rates
            </span>
          </div>

          <div className="space-y-2.5">
            {selected.map((item, idx) => (
              <div
                key={`${item.corridor_id}-${item.intervention_id}-${idx}`}
                className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    {item.intervention_name}
                  </span>
                  <span className="font-mono font-bold text-emerald-400">
                    CapEx: ₹{item.capex_inr_lakhs}L
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Corridor: <span className="text-slate-200 font-semibold">{item.corridor_code} — {item.corridor_name}</span> ({item.ward_id}) • Treated Span: <span className="font-mono text-slate-200">{item.deployment_km} km</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono bg-slate-900 p-2 rounded">
                  <div>
                    <span className="text-slate-400 block">Annual OpEx</span>
                    <span className="text-amber-300">₹{item.annual_opex_inr_lakhs}L/yr</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">5-Yr Lifecycle</span>
                    <span className="text-cyan-300">₹{item.five_year_lifecycle_inr_lakhs}L</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Cooling Impact</span>
                    <span className="text-emerald-300">{item.expected_cooling_range_celsius}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rejected Alternatives & Trade-offs */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
              <XCircle className="w-4 h-4" />
              Rejected Alternatives &amp; Trade-off Explanations ({rejected.length})
            </h3>
          </div>

          <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
            {result?.tradeoff_explanation}
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {rejected.map((rej, idx) => (
              <div
                key={`${rej.corridor_id}-${rej.intervention_id}-${idx}`}
                className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    {rej.intervention_name} ({rej.corridor_code})
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                    {rej.reason_code || rej.rejection_reason}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{rej.reason || rej.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
