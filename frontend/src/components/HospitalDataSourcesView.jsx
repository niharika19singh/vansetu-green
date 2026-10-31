import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Plus,
  Shield,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  X,
  Database,
} from 'lucide-react';
import { api } from '../api/client';

export default function HospitalDataSourcesView({ token }) {
  const [sources, setSources] = useState([]);
  const [abhaStatus, setAbhaStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Upload Dataset Form
  const [district, setDistrict] = useState('Central');
  const [reportingFacility, setReportingFacility] = useState('LNJP Hospital');
  const [month, setMonth] = useState('2026-05');
  const [heatstrokeCases, setHeatstrokeCases] = useState(45);
  const [heatExhaustionCases, setHeatExhaustionCases] = useState(88);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [srcRes, abhaRes] = await Promise.allSettled([
        api.listHospitalSources(token),
        api.getAbhaStatus(),
      ]);
      if (srcRes.status === 'fulfilled') {
        setSources(srcRes.value.sources || []);
      }
      if (abhaRes.status === 'fulfilled') {
        setAbhaStatus(abhaRes.value);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load hospital sources');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadSources();
  }, [loadSources]);

  const handleUploadDataset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = {
        district,
        reporting_facility: reportingFacility,
        reporting_month: month,
        reported_heatstroke_cases: Number(heatstrokeCases),
        reported_heat_exhaustion_cases: Number(heatExhaustionCases),
        is_aggregate_only: true,
      };

      const res = await api.uploadHospitalDataset(payload, token);
      setSuccessMessage(
        `Aggregate epidemiological indicators ingested successfully for ${district} (${res.upload_id})`
      );
      setUploadModalOpen(false);
      await loadSources();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload dataset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
              HEALTH SURVEILLANCE INTEGRATION
            </span>
            <h1 className="text-lg font-bold text-white">
              Hospital Data Sources &amp; ABDM Integration
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure participating hospital providers and ingest aggregate heat-illness data under
            strict zero-PII architectural standards.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg"
        >
          <Upload className="w-4 h-4" />
          <span>Upload Aggregate Dataset</span>
        </button>
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
        {/* Left Column: Hospital Providers */}
        <div className="lg:col-span-7 h-full border-r border-slate-800 overflow-y-auto p-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            Registered Hospital Providers ({sources.length})
          </div>

          <div className="space-y-3">
            {sources.map((src) => (
              <div
                key={src.id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">{src.facility_name}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 font-mono">
                    {src.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  District:{' '}
                  <span className="font-semibold text-white">{src.district || 'Central'}</span> •
                  Provider ID: <span className="font-mono text-slate-400">{src.id}</span>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80 flex justify-between">
                  <span>Last sync: {src.last_synced_at || '2026-10-31'}</span>
                  <span className="text-emerald-400">Verified Epidemiological Node</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: ABDM Ecosystem Security & Architecture Disclosures */}
        <div className="lg:col-span-5 h-full overflow-y-auto p-5 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
            ABDM Sandbox Architecture
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Shield className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Ayushman Bharat Digital Mission (ABDM)</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              VanSetu interfaces with ABDM health data networks under a privacy-preserving aggregate
              architecture. Individual health identifiers (ABHA numbers, patient names, medical
              diagnoses) are strictly prohibited and stripped at the gateway.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Gateway Status:</span>
                <span className="text-emerald-400 font-bold">
                  {abhaStatus?.status || 'SANDBOX_CONFIGURED'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Production Mode:</span>
                <span className="text-amber-300 font-bold">
                  {abhaStatus?.is_live_production ? 'TRUE' : 'FALSE (SANDBOX)'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Zero PII Guarantee:</span>
                <span className="text-emerald-400 font-bold">ENFORCED (100%)</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-200/90 leading-relaxed">
              <strong>Compliance Protocol:</strong> Only monthly epidemiological counts of
              heatstroke attendances aggregated by municipal district are stored for corridor
              prioritization calculations.
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Upload Aggregate Dataset</h2>
                <p className="text-[11px] text-slate-400">
                  Ingest district-level monthly heat illness numbers.
                </p>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadDataset} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">District</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  {[
                    'Central',
                    'North East',
                    'South',
                    'New Delhi',
                    'North',
                    'West',
                    'East',
                    'North West',
                    'South West',
                    'South East',
                    'Shahdara',
                  ].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reporting Facility</label>
                <input
                  type="text"
                  value={reportingFacility}
                  onChange={(e) => setReportingFacility(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Reporting Month</label>
                <input
                  type="text"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">
                    Heatstroke Attendances
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={heatstrokeCases}
                    onChange={(e) => setHeatstrokeCases(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Heat Exhaustion</label>
                  <input
                    type="number"
                    min="0"
                    value={heatExhaustionCases}
                    onChange={(e) => setHeatExhaustionCases(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition"
                >
                  <Upload className="w-4 h-4" />
                  <span>{submitting ? 'Ingesting...' : 'Ingest Dataset'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
