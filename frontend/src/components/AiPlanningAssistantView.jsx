import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Wrench,
  Play,
  ShieldCheck,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { api } from '../api/client';

export default function AiPlanningAssistantView({
  selectedCorridor,
  mekoEnabled,
  onToggleMeko,
}) {
  const [prompt, setPrompt] = useState(
    'Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh.'
  );
  const [corridorCode, setCorridorCode] = useState(selectedCorridor?.code || 'C-14');
  const [wardId, setWardId] = useState(selectedCorridor?.ward_id || 'ward-12');
  const [budgetLakh, setBudgetLakh] = useState(8.0);
  const [toolsMeta, setToolsMeta] = useState(null);
  const [planResult, setPlanResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runWorkflow = useCallback(async () => {
    setLoading(true);
    try {
      const [toolsRes, planRes] = await Promise.all([
        api.getAgentTools(),
        api.runAgentPlan({
          prompt,
          corridor_id: corridorCode,
          ward_id: wardId,
          budget_lakh: Number(budgetLakh),
          climate_priority: 'heat_resilience',
          meko_enabled: mekoEnabled,
        }),
      ]);
      setToolsMeta(toolsRes);
      setPlanResult(planRes);
    } catch (err) {
      console.error('Agent plan error:', err);
    } finally {
      setLoading(false);
    }
  }, [prompt, corridorCode, wardId, budgetLakh, mekoEnabled]);

  useEffect(() => {
    runWorkflow();
  }, [runWorkflow]);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Multi-Tool Climate Action Reasoning Agent (Google Gemini API)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              SDK: {toolsMeta?.sdk || 'google-genai'} • Model: {toolsMeta?.model || 'gemini-3.8-flash'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Orchestrates 8 deterministic backend tools: recalls Meko institutional memory before reasoning, queries Tiger Data history, runs MILP budget optimization, and generates procurement plans.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleMeko(!mekoEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              mekoEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-700 text-white'
            }`}
          >
            {mekoEnabled ? 'MEKO ON (Recalls Survey-014)' : 'MEKO OFF (No Memory)'}
          </button>
        </div>
      </div>

      {/* Prompt & Parameter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6">
            <label className="text-slate-400 block mb-1 font-medium">
              Municipal Planning Directive
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-slate-400 block mb-1 font-medium">Corridor</label>
            <input
              type="text"
              value={corridorCode}
              onChange={(e) => setCorridorCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-white"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-slate-400 block mb-1 font-medium">Budget (₹ Lakh)</label>
            <input
              type="number"
              step="0.5"
              value={budgetLakh}
              onChange={(e) => setBudgetLakh(parseFloat(e.target.value) || 8.0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 font-mono text-white"
            />
          </div>
          <div className="md:col-span-2 flex items-end">
            <button
              onClick={runWorkflow}
              disabled={loading}
              className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{loading ? 'Running...' : 'Execute Agent'}</span>
            </button>
          </div>
        </div>

        {/* 8 Registered Gemini Function Declarations */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            8 Bound Gemini Tools:
          </span>
          {(toolsMeta?.tools || []).map((t) => (
            <span
              key={t.name}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-emerald-300 border border-slate-800"
              title={t.description}
            >
              {t.name}()
            </span>
          ))}
        </div>
      </div>

      {/* Main Output Grid: Tool Execution Trace vs. Synthesized Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Multi-Tool Execution Trace (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Multi-Step Function-Calling Trace ({planResult?.tool_calls_count || 0} Tools Invoked)
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
              {planResult?.execution_mode}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 text-xs">
            {(planResult?.tool_execution_trace || []).map((step) => (
              <div
                key={step.step}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono">
                  <span className="text-emerald-400 font-bold">
                    Step {step.step}: {step.tool_name}()
                  </span>
                  <span className="text-[10px] text-slate-400">
                    args: {JSON.stringify(step.arguments)}
                  </span>
                </div>
                <pre className="text-[10px] font-mono text-slate-300 bg-slate-900 p-2 rounded overflow-x-auto max-h-28">
                  {JSON.stringify(step.output_summary, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>

        {/* Grounded Executive Synthesis & Governance Gate (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Grounded Executive Recommendation (Zero Hallucinated Math)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                RFP: {planResult?.procurement_rfp_reference}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
              {planResult?.explanation_markdown}
            </div>

            {/* Human-in-the-Loop Governance Gate */}
            <div className="bg-slate-950 border border-amber-500/40 rounded-lg p-3 text-xs flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-300">
                  Human Governance Gate Active
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Final municipal procurement authorization and promotion of new planning decisions into <code className="text-emerald-300">vansetu-planning-decisions</code> require explicit human planner approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
