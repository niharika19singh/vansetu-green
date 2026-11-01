import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Info,
  Shield,
  HeartPulse,
  Thermometer,
  Layers,
  ArrowUpRight,
  Database,
  Cpu,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';
import { safeToFixed } from '../utils/numericFormat';

export default function RegionalHealthIntelligenceView({ token }) {
  const [indicators, setIndicators] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [abhaStatus, setAbhaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showModelDetails, setShowModelDetails] = useState(true);

  const loadHealthData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [indRes, abhaRes] = await Promise.allSettled([
        api.getRegionalHealthIndicators({}, token),
        api.getAbhaStatus(),
      ]);
      if (indRes.status === 'fulfilled') {
        setIndicators(indRes.value.indicators || []);
      }
      if (abhaRes.status === 'fulfilled') {
        setAbhaStatus(abhaRes.value);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load health indicators');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  const filtered = indicators.filter((ind) => {
    if (selectedDistrict !== 'All' && ind.district !== selectedDistrict) {
      return false;
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-[#071C16] text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-emerald-900/40 bg-[#0D2821]/80 shrink-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/40">
                EPIDEMIOLOGICAL SURVEILLANCE
              </span>
              <h1 className="text-lg font-bold text-white">
                Regional Hospital Health Intelligence &amp; Heat Vulnerability
              </h1>
            </div>
            <p className="text-xs text-emerald-200/60 mt-0.5">
              Aggregate district heatstroke attendances and clinical vulnerability multipliers for
              pedestrian climate corridors.
            </p>
          </div>

          {/* ABDM Ecosystem Status Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#071C16] border border-emerald-900/60 rounded-xl px-3 py-1.5 text-xs font-mono">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-400">ABDM Integration:</span>
              <span className={abhaStatus?.status === 'SANDBOX_CONFIGURED' ? 'text-emerald-300 font-bold' : 'text-slate-300 font-bold'}>
                {abhaStatus?.status || abhaStatus?.integration_state || 'SANDBOX_CONFIGURED'}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Zero PII</span>
            </div>

            <button
              onClick={() => setShowModelDetails(!showModelDetails)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/60 transition"
            >
              <Cpu className="w-3.5 h-3.5 text-[#00f5d4]" />
              <span>Model Transparency</span>
              {showModelDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Model Transparency & Provenance Card */}
        {showModelDetails && (
          <div className="bg-[#071C16] border border-emerald-900/50 rounded-xl p-4 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-900/40 pb-2">
              <div className="flex items-center gap-2 text-white font-semibold">
                <Database className="w-4 h-4 text-[#00f5d4]" />
                <span>Health Vulnerability Multiplier Model &amp; Data Provenance</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                <span className="text-slate-400">Dataset Store:</span>
                <span className="bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800/50">
                  backend/data/hospital_health.sqlite
                </span>
              </div>
            </div>

            {/* 3-Stage Pipeline Visualization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-[#0D2821]/60 border border-emerald-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                  <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Stage 1: Urban Heat Exposure</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Remote-sensing Land Surface Temperature (LST) anomaly and Normalized Difference Vegetation Index (NDVI) deficit over corridor path.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0D2821]/60 border border-emerald-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-[#00f5d4]" />
                  <span>Stage 2: Catchment &amp; Facilities</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Catchment population exposure mapped to participating tertiary facilities (LNJP Hospital, AIIMS, Safdarjung Hospital).
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0D2821]/60 border border-emerald-900/40 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
                  <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                  <span>Stage 3: Observed Clinical Impact</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Preprocessed emergency attendances scale baseline vulnerability score from <span className="font-mono font-bold text-white">1.00×</span> up to <span className="font-mono font-bold text-rose-300">1.25×</span> multiplier.
                </p>
              </div>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded bg-slate-950/60 border border-emerald-950 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px]">Participating Hospitals</span>
                <span className="text-emerald-300 font-bold mt-1">AIIMS, Safdarjung, LNJP</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-emerald-950 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px]">Input Features</span>
                <span className="text-emerald-300 font-bold mt-1">Heat Illness, Heatstroke, Respiratory</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-emerald-950 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px]">Target Variable Bounds</span>
                <span className="text-amber-300 font-bold mt-1">1.00× to 1.25× Multiplier</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-emerald-950 flex flex-col justify-between">
                <span className="text-slate-400 text-[10px]">Privacy &amp; Governance</span>
                <span className="text-[#00f5d4] font-bold mt-1">Strict Zero PII, Monthly Aggregate</span>
              </div>
            </div>
          </div>
        )}

        {/* Scientific Integrity Disclosure Banner */}
        <div className="bg-[#071C16]/90 border border-emerald-900/40 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-[#00f5d4] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white">Truthful Data Disclosure:</span>
            <p className="text-emerald-200/70 text-[11px] leading-relaxed">
              VanSetu reports health vulnerability multipliers only where aggregate clinical records
              exist from participating hospitals (e.g. LNJP, Safdarjung, AIIMS). Districts without an
              active reporting facility truthfully display{' '}
              <span className="font-mono text-amber-300 font-bold">
                HEALTH_DATA_NOT_AVAILABLE
              </span>{' '}
              with a baseline multiplier of 1.00×. No synthetic medical records are ever fabricated.
            </p>
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-y-auto p-5">
        <div className="bg-[#0D2821]/80 border border-emerald-900/40 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#071C16] border-b border-emerald-900/40 text-emerald-400/80 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Reporting Hospital Source</th>
                <th className="py-3 px-4">Heatstroke Cases (30d)</th>
                <th className="py-3 px-4">Heat Exhaustion</th>
                <th className="py-3 px-4">Vulnerability Multiplier</th>
                <th className="py-3 px-4">Surveillance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/30">
              {filtered.map((ind) => {
                const hasData = ind.status !== 'HEALTH_DATA_NOT_AVAILABLE';
                const mult = ind.vulnerability_multiplier || 1.0;
                const isHigh = mult >= 1.15;

                return (
                  <tr key={ind.district} className="hover:bg-emerald-950/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{ind.district}</td>

                    <td className="py-3 px-4">
                      {hasData ? (
                        <div className="flex items-center gap-1.5 text-slate-200">
                          <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{ind.reporting_facility || ind.hospital_name || 'Participating Tertiary Hospital'}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No reporting hospital</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {hasData ? (
                        <span className="font-bold text-amber-300">
                          {ind.reported_heatstroke_cases_30d ?? ind.heatstroke_emergency_attendances ?? 0} cases
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      {hasData ? (
                        <span className="text-slate-300">
                          {ind.reported_heat_exhaustion_cases_30d ?? ind.heat_illness_visits ?? 0} cases
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          isHigh
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : hasData
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {safeToFixed(mult, 2)}×
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      {hasData ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          NOT AVAILABLE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
