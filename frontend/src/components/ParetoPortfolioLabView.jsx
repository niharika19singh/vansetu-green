import React, { useEffect, useState } from 'react';
import {
  Calculator,
  TrendingUp,
  Shield,
  Layers,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

export default function ParetoPortfolioLabView({ onSelectPortfolioForImplementation }) {
  const [budgetLakhs, setBudgetLakhs] = useState(50.0);
  const [paretoData, setParetoData] = useState(null);
  const [selectedSolutionIndex, setSelectedSolutionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadFrontier = (budget) => {
    setLoading(true);
    setError(null);
    api
      .runParetoOptimizer({ budget_lakhs: budget })
      .then((data) => {
        setParetoData(data);
        setSelectedSolutionIndex(0);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to solve Pareto optimization');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadFrontier(budgetLakhs);
  }, []);

  const selectedSolution = paretoData?.pareto_frontier?.[selectedSolutionIndex] || paretoData?.all_scenarios?.[0];

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Pareto Portfolio Lab (Multi-Objective MILP Decision System)
            </h1>
            <p className="text-xs text-slate-400">
              Deterministic HiGHS solver &bull; Climate Priority vs. Social Equity vs. 5-Yr Lifecycle OpEx &bull; Non-dominated frontiers
            </p>
          </div>
        </div>

        {/* Budget Presets */}
        <div className="flex items-center gap-2">
          {[20, 50, 100].map((b) => (
            <button
              key={b}
              onClick={() => {
                setBudgetLakhs(b);
                loadFrontier(b);
              }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                budgetLakhs === b
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              ₹{b >= 100 ? `${b / 100} Cr` : `${b} Lakhs`}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Solving multi-objective Mixed-Integer Linear Program across Pareto frontiers...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && paretoData && (
          <>
            {/* Pareto Frontier Comparison Cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Pareto-Optimal Trade-Off Configurations (Budget ₹{budgetLakhs}L)
                </span>
                <span className="text-xs text-emerald-400 font-mono font-bold">
                  {paretoData.pareto_frontier_count} Non-Dominated Solutions Discovered
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {paretoData.pareto_frontier.map((sol, idx) => {
                  const isSel = idx === selectedSolutionIndex;
                  return (
                    <div
                      key={sol.scenario_id}
                      onClick={() => setSelectedSolutionIndex(idx)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                        isSel
                          ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-xl'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs font-bold"
                            style={{ color: sol.color || '#10b981' }}
                          >
                            {sol.scenario_name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                            PARETO
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{sol.description}</p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Climate Priority:</span>
                          <span className="font-mono font-bold text-white">
                            {sol.climate_priority_total} pts
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Social Equity Share:</span>
                          <span className="font-mono font-bold text-purple-400">
                            {sol.equity_share_percent}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">5-Yr Lifecycle Cost:</span>
                          <span className="font-mono font-bold text-amber-400">
                            ₹{sol.lifecycle_cost_lakhs}L
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Solution Deep Dive */}
            {selectedSolution && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left: Solution Summary & Implementation Action */}
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      Selected Portfolio: {selectedSolution.scenario_name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedSolution.corridors_covered_count} Corridors &bull; {selectedSolution.selected_interventions_count} Interventions Deployed
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">CapEx Required</div>
                      <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                        ₹{selectedSolution.capex_lakhs}L
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">5-Yr Maintenance</div>
                      <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                        ₹{selectedSolution.opex_5yr_lakhs}L
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Native Trees</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {selectedSolution.total_trees_deployed} saplings
                      </div>
                    </div>
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Canopy Area</div>
                      <div className="font-mono font-bold text-white text-sm mt-0.5">
                        {selectedSolution.total_canopy_area_m2} m&sup2;
                      </div>
                    </div>
                  </div>

                  {/* Implementation Trigger */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        if (onSelectPortfolioForImplementation) {
                          onSelectPortfolioForImplementation(selectedSolution);
                        }
                      }}
                      className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition"
                    >
                      <Sparkles className="w-4 h-4" />
                      Convert to Municipal Readiness Plan (WP-1 to WP-8)
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1.5">
                      Transfers selected portfolio to the 8-Gate Implementation Planner
                    </p>
                  </div>
                </div>

                {/* Center & Right: Selected Interventions Table & Excluded Alternatives */}
                <div className="lg:col-span-2 space-y-4">
                  {/* Selected Interventions */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                      Selected Interventions ({selectedSolution.interventions?.length || 0})
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {selectedSolution.interventions?.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-white">{item.corridor_code || item.corridor_name}</span>
                            <span className="text-slate-400 ml-2">({item.district})</span>
                            <div className="text-[11px] text-emerald-400">{item.intervention_name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-white">₹{item.capex_inr_lakhs?.toFixed(2)}L</div>
                            <div className="text-[10px] text-slate-500">5-Yr: ₹{item.five_year_lifecycle_inr_lakhs?.toFixed(2)}L</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Excluded Alternatives Rationale */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h4 className="font-bold text-amber-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                      Mathematical Justification for Excluded Alternatives
                    </h4>
                    <div className="space-y-2 text-xs">
                      {paretoData.excluded_alternatives_rationale?.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[11px] space-y-0.5"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{ex.corridor_code} - {ex.corridor_name}</span>
                            <span className="font-mono text-amber-400 font-bold">
                              Eff. {ex.marginal_efficiency} pts/₹L
                            </span>
                          </div>
                          <p className="text-slate-400">{ex.exclusion_rationale}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scientific Guardrail Footer */}
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{paretoData.scientific_guardrail}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
