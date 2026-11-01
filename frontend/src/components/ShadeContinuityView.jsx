import React, { useEffect, useState } from 'react';
import {
  Sun,
  ShieldAlert,
  Train,
  Trees,
  ArrowRight,
  TrendingUp,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { api } from '../api/client';

export default function ShadeContinuityView({ selectedCorridor }) {
  const corridorId = selectedCorridor?.code || selectedCorridor?.id || 'C-14';

  const [activeTab, setActiveTab] = useState('corridor'); // 'corridor' | 'city'
  const [shadeData, setShadeData] = useState(null);
  const [cityRankings, setCityRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getShadeContinuity(corridorId),
      api.getShadeNetworkGaps(),
    ])
      .then(([corrRes, cityRes]) => {
        if (!mounted) return;
        setShadeData(corrRes);
        setCityRankings(cityRes.rankings || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to analyze shade continuity');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [corridorId]);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">
                Pedestrian Shade Continuity Analyser
              </h1>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-amber-300">
                {corridorId}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Walkability graph network model &bull; Unshaded exposure gap detection &bull; Transit feeder connectivity &bull; Shade Bridges
            </p>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('corridor')}
            className={`px-3 py-1.5 font-medium rounded-md transition ${
              activeTab === 'corridor'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Corridor Analysis
          </button>
          <button
            onClick={() => setActiveTab('city')}
            className={`px-3 py-1.5 font-medium rounded-md transition ${
              activeTab === 'city'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            City-Wide Shade Gap Rankings ({cityRankings.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Constructing walkability graph network and computing continuous thermal gap intervals...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && activeTab === 'corridor' && shadeData && (
          <>
            {/* Top Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Shade Gap Score</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-0.5">
                  {shadeData.shade_gap_score}/100
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Exposure penalty score</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Unshaded Exposure</div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                  {shadeData.exposure_summary.unshaded_gap_length_m}m
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {shadeData.exposure_summary.unshaded_gap_percentage}% of corridor length
                </div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Continuous Gaps</div>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {shadeData.exposure_summary.critical_continuous_gaps_count} stretches
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Uninterrupted sun exposure</div>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Transit Proximity</div>
                <div className="text-xs font-bold text-emerald-400 truncate mt-1">
                  {shadeData.transit_connectivity.nearest_hub_name}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {shadeData.transit_connectivity.distance_km} km ({shadeData.transit_connectivity.transit_shed_status.replace(/_/g, ' ')})
                </div>
              </div>
            </div>

            {/* Middle: Continuous Thermal Gaps & Shade Bridges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Continuous Gaps */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Identified Continuous Thermal Gaps
                </h3>
                <div className="space-y-2 text-xs">
                  {shadeData.continuous_thermal_gaps?.length === 0 && (
                    <div className="text-slate-400 py-6 text-center">
                      No critical unbroken thermal gaps identified along this corridor.
                    </div>
                  )}
                  {shadeData.continuous_thermal_gaps?.map((gap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{gap.gap_id}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            gap.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {gap.severity} EXPOSURE
                        </span>
                      </div>
                      <div className="text-slate-400">
                        Span: <span className="font-mono text-white">{gap.start_segment}</span> to{' '}
                        <span className="font-mono text-white">{gap.end_segment}</span> ({gap.total_unbroken_exposure_length_m}m unbroken)
                      </div>
                      <div className="text-[11px] text-amber-400">
                        Recommended Solution: {gap.shade_bridge_recommended}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shade Bridge Recommendations */}
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                <h3 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <Trees className="w-4 h-4" />
                  Proposed Shade Bridge Interventions
                </h3>
                <div className="space-y-2 text-xs">
                  {shadeData.shade_bridge_recommendations?.map((bridge, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/50 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{bridge.recommended_shade_bridge}</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          ₹{bridge.estimated_investment_lakhs}L
                        </span>
                      </div>
                      <div className="text-slate-300 text-[11px]">
                        Target: {bridge.span} ({bridge.unshaded_distance_m}m gap) &bull;{' '}
                        <span className="text-emerald-400 font-bold">
                          {bridge.trees_or_modules_required} units required
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px]">{bridge.expected_connectivity_impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scientific Guardrail Footer */}
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <span className="font-bold text-slate-300">Scientific Guardrail: </span>
              {shadeData.scientific_guardrail}
            </div>
          </>
        )}

        {/* Tab 2: City-Wide Shade Gap Rankings */}
        {!loading && !error && activeTab === 'city' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">
                NCT Delhi Corridor Shade Gap Rankings (Worst Exposure First)
              </h3>
              <span className="text-xs text-slate-400">{cityRankings.length} Corridors</span>
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {cityRankings.map((corr, idx) => (
                <div
                  key={corr.corridor_id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-slate-500 w-6 text-right font-bold">#{idx + 1}</span>
                    <div>
                      <div className="font-bold text-white">
                        {corr.corridor_code} - {corr.corridor_name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {corr.district} &bull; {corr.total_length_m}m length &bull; Near {corr.nearest_transit_hub}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-400 text-sm">
                      Gap Score: {corr.shade_gap_score}
                    </div>
                    <div className="text-[10px] text-rose-400">
                      {corr.unshaded_gap_length_m}m unshaded ({corr.critical_gaps_count} gaps)
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
