import React, { useState, useEffect, useCallback } from 'react';
import {
  Calculator,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Play,
  FileSpreadsheet,
  Users,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import {
  FeasibilityStatusBadge,
  SyntheticScenarioBadge,
  deriveInterventionFeasibilityStatus,
} from './ui/ScientificBadges';

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
  const eqSummary = result?.equity_and_social_impact || result?.equity_impact_summary || {};
  const selected = result?.selected_interventions || [];
  const rejected = result?.rejected_alternatives || [];
  const isC14Demo = String(targetCorridorCode).toUpperCase() === 'C-14';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header Banner — Municipal Investment-Planning Report */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-white">
              Municipal Climate Investment-Planning Report (MILP Portfolio Optimizer)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {result?.solver_engine || 'scipy.optimize.milp (HiGHS)'} • Status: {result?.solver_status || 'OPTIMAL'}
            </span>
            {isC14Demo && <SyntheticScenarioBadge />}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Allocates finite municipal capital budgets across the 5 GreenTech intervention classes using deterministic Mixed-Integer Linear Programming—never LLM guesswork.
          </p>
        </div>

        {/* Meko Constraint Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
          <span className="text-xs font-medium text-slate-300">
            Meko Institutional Site Memory:
          </span>
          <button
            onClick={() => onToggleMeko(!mekoEnabled)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
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
          <label htmlFor="milp-corridor-input" className="text-slate-400 block mb-1 font-medium">
            Target Corridor (Code / ID)
          </label>
          <input
            id="milp-corridor-input"
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
          <label htmlFor="milp-budget-slider" className="text-slate-400 block mb-1 font-medium">
            Available Municipal Budget:{' '}
            <span className="text-emerald-400 font-mono font-bold">
              ₹{Number(budgetLakh).toFixed(2)} Lakh
            </span>
          </label>
          <input
            id="milp-budget-slider"
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
              type="button"
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
          <label htmlFor="milp-priority-select" className="text-slate-400 block mb-1 font-medium">
            Climate Objective Priority
          </label>
          <select
            id="milp-priority-select"
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
            <label htmlFor="milp-equity-slider" className="text-slate-400 block mb-1 font-medium">
              Social Equity Multiplier:{' '}
              <span className="font-mono text-purple-300">{equityWeight}</span>
            </label>
            <input
              id="milp-equity-slider"
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
            type="button"
            onClick={executeOptimizer}
            disabled={loading}
            className="mt-2 w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{loading ? 'Solving MILP...' : 'Run MILP Portfolio Solver'}</span>
          </button>
        </div>
      </div>

      {/* Section 7: 7-Card Executive Investment Summary (CapEx, OpEx, 5-Yr Lifecycle, Remaining, Corridors Served, Equity Share) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">1. Budget Ceiling</span>
          <span className="text-base font-mono font-bold text-white">
            ₹{fin.available_budget_inr_lakhs ?? budgetLakh}L
          </span>
          <span className="text-[10px] text-slate-500 block">Municipal Cap</span>
        </div>

        <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">2. Budget Utilized</span>
          <span className="text-base font-mono font-bold text-emerald-400">
            ₹{fin.total_capex_inr_lakhs ?? 0}L
          </span>
          <span className="text-[10px] text-emerald-300/80 block font-mono">
            {fin.budget_utilization_pct ?? 0}% of ceiling
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">3. Remaining Budget</span>
          <span className="text-base font-mono font-bold text-slate-200">
            ₹{fin.remaining_budget_inr_lakhs ?? 0}L
          </span>
          <span className="text-[10px] text-slate-500 block">Unallocated contingency</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">4. Annual OpEx</span>
          <span className="text-base font-mono font-bold text-amber-300">
            ₹{fin.total_annual_opex_inr_lakhs ?? 0}L/yr
          </span>
          <span className="text-[10px] text-slate-500 block">Maintenance &amp; watering</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">5. 5-Yr Lifecycle</span>
          <span className="text-base font-mono font-bold text-cyan-300">
            ₹{fin.total_five_year_lifecycle_inr_lakhs ?? 0}L
          </span>
          <span className="text-[10px] text-slate-500 block">CapEx + 5×Annual OpEx</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">6. Corridors Served</span>
          <span className="text-base font-mono font-bold text-sky-300">
            {result?.corridors_evaluated_count ?? 1} Corridor(s)
          </span>
          <span className="text-[10px] text-slate-400 block truncate">
            {selected.length} packages selected
          </span>
        </div>

        <div className="bg-slate-900 border border-purple-500/30 rounded-xl p-3">
          <span className="text-[10px] text-slate-400 uppercase block">7. Equity Share</span>
          <span className="text-base font-mono font-bold text-purple-300">
            {eqSummary.high_vulnerability_budget_share_pct ?? 100}%
          </span>
          <span className="text-[10px] text-purple-300/80 block">
            High-vulnerability wards
          </span>
        </div>
      </div>

      {/* Scientific Honesty Notice on MILP Objective Score (Section 7) */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg px-3.5 py-2 text-[11px] text-slate-300 flex items-center justify-between flex-wrap gap-2">
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
          <span>
            <strong className="text-sky-300">Methodological Note: </strong>
            The MILP objective value (<code className="text-emerald-300">{result?.objective_utility_score ?? '—'}</code>) is a dimensionless multi-criteria prioritization utility index combining corridor climate urgency, intervention suitability, and social equity weight—it does <strong>not</strong> represent degrees Celsius of ambient air cooling.
          </span>
        </span>
      </div>

      {/* Active Meko Site Constraints Alert */}
      {result?.applied_site_restrictions?.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-3.5 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-200">
                Meko Institutional Site Restriction Enforced (Evidence: {result.applied_site_restrictions[0].evidence_reference})
              </span>
              <FeasibilityStatusBadge status="CONSTRAINT_IDENTIFIED" />
            </div>
            <p className="text-amber-100/90">
              {result.applied_site_restrictions[0].reason}
            </p>
          </div>
        </div>
      )}

      {/* Selected vs Rejected Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Selected Portfolio */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              Selected Investment Portfolio ({selected.length} Interventions)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              Illustrative CPWD DSR 2023 Rates
            </span>
          </div>

          <div className="space-y-2.5">
            {selected.map((item, idx) => (
              <div
                key={`${item.corridor_id}-${item.intervention_id}-${idx}`}
                className="bg-slate-950 border border-emerald-500/30 rounded-lg p-3 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">
                      {item.intervention_name}
                    </span>
                    <FeasibilityStatusBadge status="FEASIBLE_ESTIMATE" compact />
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    CapEx: ₹{item.capex_inr_lakhs}L
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Corridor:{' '}
                  <span className="text-slate-200 font-semibold">
                    {item.corridor_code} — {item.corridor_name}
                  </span>{' '}
                  ({item.ward_id}) • Treated Span:{' '}
                  <span className="font-mono text-slate-200">{item.deployment_km} km</span> • Equity Priority:{' '}
                  <span className="font-mono text-purple-300">
                    {((item.vulnerable_population_index || 0.65) * 100).toFixed(0)}/100
                  </span>
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
                    <span className="text-slate-400 block">Literature Surface Effect</span>
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
              <XCircle className="w-4 h-4" aria-hidden="true" />
              Excluded Alternatives &amp; Trade-off Explanations ({rejected.length})
            </h3>
          </div>

          <p className="text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
            {result?.tradeoff_explanation}
          </p>

          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {rejected.map((rej, idx) => {
              const reasonCode = rej.reason_code || rej.rejection_reason || '';
              const isSiteRestricted = reasonCode.includes('SITE_MEMORY') || reasonCode.includes('INFEASIBLE');
              return (
                <div
                  key={`${rej.corridor_id}-${rej.intervention_id}-${idx}`}
                  className="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <span className="font-semibold text-slate-200">
                      {rej.intervention_name} ({rej.corridor_code})
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isSiteRestricted && (
                        <FeasibilityStatusBadge status="NOT_FEASIBLE" compact />
                      )}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        {reasonCode}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">{rej.reason || rej.explanation}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
