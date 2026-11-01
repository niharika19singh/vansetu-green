import React, { useEffect, useState } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  X,
  ExternalLink,
  Layers,
  Thermometer,
  Trees,
  Wind,
  Users,
  Compass,
} from 'lucide-react';
import { api } from '../api/client';
import { formatPercentage } from '../utils/numericFormat';

export default function CorridorEvidencePassportModal({ corridorId, open, onClose }) {
  const [passport, setPassport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !corridorId) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .getEvidencePassport(corridorId)
      .then((data) => {
        if (mounted) {
          setPassport(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load Evidence Passport');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [corridorId, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Corridor Evidence Passport
                </h2>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  {passport?.corridor_code || corridorId}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {passport?.corridor_name} &bull; {passport?.district} &bull; Standard v2.0
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-300 text-sm">
          {loading && (
            <div className="text-center py-16 text-slate-400">
              Loading verified satellite, telemetry, and evidence dimensions...
            </div>
          )}

          {error && (
            <div className="p-8 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-semibold text-white">Corridor Evidence Not Found</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    api
                      .getEvidencePassport(corridorId)
                      .then((data) => {
                        setPassport(data);
                        setLoading(false);
                      })
                      .catch((err) => {
                        setError(err.message || 'Failed to load Evidence Passport');
                        setLoading(false);
                      });
                  }}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition shadow"
                >
                  Retry Verification
                </button>
              </div>
            </div>
          )}

          {passport && (
            <>
              {/* 5 Data Quality Dimensions Bar */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white flex items-center gap-2 text-xs uppercase tracking-wider text-slate-400">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    5 Disaggregated Data Quality Dimensions
                  </h3>
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    Confidence:{' '}
                    {(() => {
                      const cScore = passport.data_quality_dimensions?.recommendation_confidence?.score;
                      return cScore != null ? (cScore <= 1 ? formatPercentage(cScore, 0) : `${cScore}%`) : '—';
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(passport.data_quality_dimensions || {}).map(([key, dim]) => (
                    <div
                      key={key}
                      className="bg-slate-900/90 border border-slate-800/80 p-2.5 rounded-lg text-center"
                    >
                      <div className="text-[10px] text-slate-400 uppercase font-semibold truncate">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-base font-bold text-white font-mono mt-0.5">
                        {dim?.score != null ? (dim.score <= 1 ? formatPercentage(dim.score, 0) : `${dim.score}%`) : '—'}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            dim.grade === 'HIGH' || dim.grade === 'EXCELLENT' || dim.grade?.startsWith('A')
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {dim.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1. WHAT WE KNOW */}
              <div className="space-y-3">
                <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4" />
                  1. What We Know (Empirical &amp; Satellite Observations)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Vegetation */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Trees className="w-3.5 h-3.5 text-emerald-400" />
                      Canopy Density (NDVI 10m)
                    </div>
                    <div className="text-slate-400">
                      Mean: <span className="font-mono text-emerald-400 font-bold">{passport.what_we_know.vegetation_evidence.measured_value}</span> &bull; Deficit: {passport.what_we_know.vegetation_evidence.green_deficit}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Resolution: {passport.what_we_know.vegetation_evidence.native_resolution} &bull; Copernicus Sentinel-2 L2A
                    </div>
                  </div>

                  {/* Surface Heat */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      Surface Radiometric Heat (LST)
                    </div>
                    <div className="text-slate-400">
                      Display Mean: <span className="font-mono text-amber-400 font-bold">{passport.what_we_know.surface_heat_evidence.display_lst_celsius}&deg;C</span> (Peak {passport.what_we_know.surface_heat_evidence.display_lst_max_celsius}&deg;C)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Native Resolution: 1,000m NASA MODIS Terra &bull; Resampled to 10m display
                    </div>
                  </div>

                  {/* Air Quality */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-sky-400" />
                      CPCB Air Quality
                    </div>
                    <div className="text-slate-400">
                      AQI: <span className="font-mono text-sky-400 font-bold">{passport.what_we_know.air_quality_evidence.aqi}</span> (PM2.5: {passport.what_we_know.air_quality_evidence.pm25} &mu;g/m&sup3;)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Station: {passport.what_we_know.air_quality_evidence.station_name} ({passport.what_we_know.air_quality_evidence.station_distance_km} km away)
                    </div>
                  </div>

                  {/* Social Vulnerability */}
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      Socio-Spatial Vulnerability
                    </div>
                    <div className="text-slate-400">
                      Vulnerability Index: <span className="font-mono text-purple-400 font-bold">{passport.what_we_know.social_vulnerability_evidence.vulnerability_score}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Unit: Ward-level census &amp; Master Plan 2041 demographic indicators
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. WHAT WE DON'T KNOW */}
              <div className="space-y-3">
                <h3 className="font-bold text-amber-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <HelpCircle className="w-4 h-4" />
                  2. What We Don't Know (Data Gaps &amp; Low-Resolution Proxies)
                </h3>
                <div className="space-y-2 text-xs">
                  {passport.what_we_dont_know.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">{item.category}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400 font-bold font-mono">
                          {item.status}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px]">{item.detail}</p>
                      <p className="text-amber-400/80 text-[11px] font-medium">
                        Risk Implication: {item.risk_implication}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. WHAT REQUIRES VERIFICATION */}
              <div className="space-y-3">
                <h3 className="font-bold text-rose-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" />
                  3. What Requires Verification (Pre-CapEx Checkpoints)
                </h3>
                <div className="space-y-2 text-xs">
                  {passport.what_requires_verification.map((chk, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start justify-between gap-4"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-white">{chk.item}</div>
                        <div className="text-[11px] text-slate-400">
                          Agency: {chk.responsible_entity} &bull; Stage: {chk.timeline}
                        </div>
                        <div className="text-[11px] text-slate-300">
                          Standard: {chk.verification_standard}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800 font-bold whitespace-nowrap">
                        MANDATORY
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. ACTIONABLE EVIDENCE IMPROVEMENT RECOMMENDATIONS */}
              <div className="space-y-3">
                <h3 className="font-bold text-sky-400 flex items-center gap-2 text-sm uppercase tracking-wide">
                  <Layers className="w-4 h-4" />
                  4. Actionable Evidence Improvement Recommendations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {passport.evidence_improvement_recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-sky-950/20 border border-sky-900/40 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{rec.action}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-bold">
                          {rec.priority}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">{rec.expected_gain}</p>
                      <div className="text-right text-[11px] font-mono text-emerald-400 font-bold">
                        Cost: {rec.estimated_cost_inr}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div>Standard: VanSetu Evidence-Aware Scientific Governance Specification v2.0</div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition"
          >
            Close Passport
          </button>
        </div>
      </div>
    </div>
  );
}
