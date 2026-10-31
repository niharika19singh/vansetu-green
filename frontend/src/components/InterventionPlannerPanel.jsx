import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Trees,
  IndianRupee,
  AlertTriangle,
  ClipboardCheck,
  ShieldAlert,
  Sparkles,
  Clock,
} from 'lucide-react';

export default function InterventionPlannerPanel({ corridor }) {
  const plan = corridor?.intervention_plan;
  const allInterventions = plan?.all_interventions || [];
  const [selectedIntId, setSelectedIntId] = useState(
    plan?.primary_recommendation?.id || 'linear_street_trees'
  );

  useEffect(() => {
    if (plan?.primary_recommendation?.id) {
      setSelectedIntId(plan.primary_recommendation.id);
    }
  }, [corridor?.id, plan?.primary_recommendation?.id]);

  if (!corridor || !plan) {
    return (
      <div className="p-6 text-center text-slate-400 text-xs">
        Select an urban corridor to inspect its 5-category green infrastructure intervention plan and CPWD lifecycle cost breakdown.
      </div>
    );
  }

  const activeIntervention =
    allInterventions.find((item) => item.id === selectedIntId) || allInterventions[0];

  const costChartData = allInterventions.map((item) => ({
    name: item.name
      .replace('Architectural ', '')
      .replace('Linear ', '')
      .replace('Roadside ', '')
      .replace('Living ', ''),
    CapEx: item.cost_breakdown.total_capex_inr_lakhs,
    OpEx5Yr: item.cost_breakdown.total_five_year_opex_inr_lakhs,
    Total5Yr: item.cost_breakdown.total_five_year_lifecycle_inr_lakhs,
    suitability: Math.round(item.suitability_score * 100),
  }));

  const cb = activeIntervention?.cost_breakdown || {};

  return (
    <div className="space-y-4 text-xs">
      {/* Corridor Context Banner */}
      <div className="bg-slate-950/90 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-emerald-400 uppercase font-semibold">
            CPWD DSR 2023 Lifecycle Engineering Estimate
          </div>
          <div className="font-bold text-slate-100 text-sm">{corridor.name}</div>
          <div className="text-[11px] text-slate-400">
            Length: {plan.corridor_length_km} km ({plan.corridor_length_m} m) • Highway:{' '}
            <span className="uppercase font-mono">{plan.highway_type}</span> • {plan.district}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-slate-400">Primary Fit</div>
          <div className="font-bold text-emerald-400">
            {plan.primary_recommendation?.name}
          </div>
          <div className="text-[10px] font-mono text-slate-300">
            Suitability: {(plan.primary_recommendation?.suitability_score * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* 5 Intervention Archetype Selector Tabs */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-300">
          5 GreenTech Intervention Categories (Ranked by Suitability)
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {allInterventions.map((item) => {
            const isSelected = item.id === activeIntervention?.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedIntId(item.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between ${
                  isSelected
                    ? 'bg-emerald-950/50 border-emerald-500 text-slate-100 shadow'
                    : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono text-[10px] font-bold">
                      #{item.rank}
                    </span>
                    <span className="font-bold text-xs truncate">{item.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-300">
                      {item.suitability_level}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {item.category}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-mono font-bold text-emerald-400 text-xs">
                    {(item.suitability_score * 100).toFixed(0)}% Fit
                  </div>
                  <div className="font-mono text-[10px] text-amber-300">
                    ₹{item.cost_breakdown.total_five_year_lifecycle_inr_lakhs}L (5-yr)
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts Comparative 5-Year Lifecycle Cost Chart */}
      <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
            Comparative CapEx vs. 5-Year OpEx (₹ Lakhs for {plan.corridor_length_km} km)
          </span>
        </div>

        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={costChartData}
              margin={{ top: 6, right: 8, left: -14, bottom: 2 }}
            >
              <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 9 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  fontSize: '11px',
                }}
                formatter={(val, name) => [`₹${Number(val).toFixed(2)} Lakhs`, name]}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <Bar dataKey="CapEx" stackId="a" fill="#10b981" name="Capital Expenditure (CapEx)" />
              <Bar
                dataKey="OpEx5Yr"
                stackId="a"
                fill="#f59e0b"
                name="5-Year Maintenance (OpEx)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Intervention Detailed Specification */}
      {activeIntervention && (
        <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="border-b border-slate-800 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <Trees className="w-4 h-4" />
                {activeIntervention.name}
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-sky-400" /> Service Life:{' '}
                {cb.expected_service_life_years} yrs
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1">{activeIntervention.summary}</p>
            <p className="text-[11px] text-emerald-300/90 mt-1 italic">
              Rationale: {activeIntervention.selection_rationale}
            </p>
          </div>

          {/* CapEx, OpEx, Lifecycle Numbers */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">CapEx ({plan.corridor_length_km} km)</div>
              <div className="text-sm font-bold font-mono text-emerald-400">
                ₹{cb.total_capex_inr_lakhs} L
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                ₹{cb.capex_inr_lakhs_per_km} L/km
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">Annual OpEx</div>
              <div className="text-sm font-bold font-mono text-amber-400">
                ₹{cb.total_annual_opex_inr_lakhs} L/yr
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                ₹{cb.annual_opex_inr_lakhs_per_km} L/km/yr
              </div>
            </div>

            <div className="bg-slate-900 p-2 rounded border border-slate-800">
              <div className="text-[10px] text-slate-400">5-Yr Lifecycle Total</div>
              <div className="text-sm font-bold font-mono text-sky-400">
                ₹{cb.total_five_year_lifecycle_inr_lakhs} L
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                ₹{cb.five_year_lifecycle_inr_lakhs_per_km} L/km
              </div>
            </div>
          </div>

          {/* Line-Item Cost Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80 space-y-1">
              <div className="font-semibold text-slate-300 text-[10px] uppercase">
                CapEx Line Items (per km)
              </div>
              {Object.entries(cb.capex_line_items_per_km || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px]">
                  <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-slate-200">₹{Number(v).toFixed(2)}L</span>
                </div>
              ))}
            </div>

            <div className="bg-slate-900/70 p-2 rounded border border-slate-800/80 space-y-1">
              <div className="font-semibold text-slate-300 text-[10px] uppercase">
                Annual OpEx Items (per km/yr)
              </div>
              {Object.entries(cb.opex_line_items_per_km || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px]">
                  <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-slate-200">₹{Number(v).toFixed(2)}L</span>
                </div>
              ))}
              <div className="pt-1 border-t border-slate-800 flex justify-between text-[10px] text-amber-300">
                <span>Mortality Replacement Allowance</span>
                <span className="font-mono">{cb.mortality_replacement_rate_pct}%</span>
              </div>
            </div>
          </div>

          {/* Recommended Native Delhi Species / Materials */}
          <div className="space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Recommended NCT Delhi Species / Specification
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
              {(activeIntervention.recommended_species_delhi || []).map((sp, i) => (
                <li key={i}>{sp}</li>
              ))}
            </ul>
          </div>

          {/* Site Constraints */}
          <div className="space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5" />
              Site Constraints &amp; Engineering Prerequisites
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
              {(activeIntervention.site_constraints || []).map((sc, i) => (
                <li key={i}>{sc}</li>
              ))}
            </ul>
          </div>

          {/* Required Pre-Installation Verification */}
          <div className="space-y-1">
            <div className="font-semibold text-sky-300 flex items-center gap-1 text-[11px]">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Required Pre-Installation Field Verification
            </div>
            <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
              {(activeIntervention.pre_installation_verification || []).map((pv, i) => (
                <li key={i}>{pv}</li>
              ))}
            </ul>
          </div>

          {/* Evidence & Confidence Limitations */}
          <div className="bg-amber-950/30 border border-amber-500/30 rounded p-2.5 space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1 text-[11px]">
              <ShieldAlert className="w-3.5 h-3.5" />
              Evidence &amp; Confidence Limitations
            </div>
            <ul className="list-disc list-inside text-[10px] text-amber-200/90 space-y-1">
              {(activeIntervention.evidence_and_confidence_limitations || []).map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
