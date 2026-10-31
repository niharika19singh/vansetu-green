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
} from 'lucide-react';
import { api } from '../api/client';

export default function RegionalHealthIntelligenceView({ token }) {
  const [indicators, setIndicators] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [abhaStatus, setAbhaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

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
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-3">
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
            <p className="text-xs text-slate-400 mt-0.5">
              Aggregate district heatstroke attendances and clinical vulnerability multipliers for
              pedestrian climate corridors.
            </p>
          </div>

          {/* ABDM Ecosystem Status Pill */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-400">ABDM Integration:</span>
            <span className={abhaStatus?.status === 'SANDBOX_CONFIGURED' ? 'text-emerald-300 font-bold' : 'text-slate-300 font-bold'}>
              {abhaStatus?.status || abhaStatus?.integration_state || 'NOT_CONFIGURED'}
            </span>
            <span className="text-[10px] text-slate-500">(Zero PII)</span>
          </div>
        </div>

        {/* Scientific Integrity Disclosure Banner */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-start gap-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-white">Truthful Data Disclosure:</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px]">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">Reporting Hospital Source</th>
                <th className="py-3 px-4">Heatstroke Cases (30d)</th>
                <th className="py-3 px-4">Heat Exhaustion</th>
                <th className="py-3 px-4">Vulnerability Multiplier</th>
                <th className="py-3 px-4">Surveillance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((ind) => {
                const hasData = ind.status !== 'HEALTH_DATA_NOT_AVAILABLE';
                const mult = ind.vulnerability_multiplier || 1.0;
                const isHigh = mult >= 1.15;

                return (
                  <tr key={ind.district} className="hover:bg-slate-850/50 transition">
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
                        {mult.toFixed(2)}×
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
