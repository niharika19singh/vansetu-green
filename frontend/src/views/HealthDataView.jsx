/**
 * HealthDataView.jsx — District Public Health & Clinical Heat Admissions Workspace.
 * 
 * Features:
 * - Direct intake for clinical hospital admissions and primary health centre heat statistics.
 * - Integration with NCT Delhi administrative districts across all 11 districts.
 * - Aggregate telemetry visualizer tracking heatstroke, dehydration, and respiratory burdens.
 * - Official clinical verification badge and record registry.
 */
import React, { useState, useEffect } from 'react';
import {
  Activity,
  HeartPulse,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Filter,
} from 'lucide-react';
import { api } from '../api/client';

export default function HealthDataView({
  districts = [],
  selectedDistrict = 'All Districts',
  onSelectDistrict,
}) {
  const [formData, setFormData] = useState({
    district: selectedDistrict !== 'All Districts' ? selectedDistrict : 'Central',
    area: '',
    heatstroke_cases: 12,
    dehydration_cases: 34,
    respiratory_cases: 48,
    emergency_visits: 180,
    vulnerable_population_pct: 35.5,
    heat_risk_level: 'High',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [healthRecords, setHealthRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Sync district
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'All Districts') {
      setFormData((prev) => ({ ...prev, district: selectedDistrict }));
    }
  }, [selectedDistrict]);

  // Load records
  const loadRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const data = await api.getHealthDataLegacy(selectedDistrict);
      if (Array.isArray(data)) {
        setHealthRecords(data);
      }
    } catch (err) {
      console.warn('Failed to load health records:', err);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [selectedDistrict]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.area.trim()) {
      setSubmitError('Please specify the hospital, clinic, or catchment area name.');
      return;
    }

    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const res = await api.submitHealthDataLegacy(formData);
      setSubmitSuccess(`Health record logged successfully (ID: ${res.id}). Clinical verification attached.`);
      setFormData((prev) => ({ ...prev, area: '' }));
      loadRecords();
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit health record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalHeatCases = healthRecords.reduce((acc, r) => acc + (r.total_heat_cases || (r.heatstroke_cases || 0) + (r.dehydration_cases || 0) + (r.respiratory_cases || 0)), 0);
  const totalHeatstroke = healthRecords.reduce((acc, r) => acc + (r.heatstroke_cases || 0), 0);
  const totalRespiratory = healthRecords.reduce((acc, r) => acc + (r.respiratory_cases || 0), 0);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#071C16] text-[#F3F1E7]">
      {/* Top Header */}
      <header className="h-16 px-6 border-b border-white/10 flex items-center justify-between bg-[#071C16]/95 backdrop-blur-md flex-shrink-0">
        <div>
          <h2 className="font-editorial text-xl font-bold text-white flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-red-400" />
            District Public Health &amp; Clinical Heat Admissions
          </h2>
          <p className="text-xs text-[#9CB9A3]">
            Hospital emergency attendances, heatstroke registry, and vulnerable population disease surveillance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* District selector */}
          <div className="flex items-center gap-2 bg-[#12392B] px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={selectedDistrict}
              onChange={(e) => onSelectDistrict && onSelectDistrict(e.target.value)}
              className="bg-transparent text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All Districts" className="bg-[#0b241c] text-white">All 11 Districts</option>
              {districts.map((d) => (
                <option key={d} value={d} className="bg-[#0b241c] text-white">{d}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadRecords}
            className="px-3 py-1.5 rounded-xl bg-[#12392B] hover:bg-[#12392B]/80 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoadingRecords ? 'animate-spin' : ''}`} />
            <span>Refresh Records</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Metric Summary Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CB9A3] font-semibold">Total Heat-Related Cases Logged</span>
              <div className="text-2xl font-black text-white font-mono mt-1">{totalHeatCases}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-950/40 text-red-400 border border-red-500/20">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CB9A3] font-semibold">Acute Heatstroke Emergencies</span>
              <div className="text-2xl font-black text-amber-300 font-mono mt-1">{totalHeatstroke}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-500/20">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0d2b21] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#9CB9A3] font-semibold">Respiratory Complications</span>
              <div className="text-2xl font-black text-purple-300 font-mono mt-1">{totalRespiratory}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-950/40 text-purple-400 border border-purple-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Form and Records Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Health Submission Form */}
          <div className="lg:col-span-6 bg-[#0d2b21] border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                Log Hospital / PHC Health Data
              </h3>
              <span className="text-[11px] text-[#9CB9A3] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                De-identified Aggregates
              </span>
            </div>

            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Administrative District</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d} className="bg-[#0b241c] text-white">{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Hospital / PHC / Clinic Catchment</label>
                  <input
                    type="text"
                    placeholder="e.g. AIIMS Delhi, LNJP Hospital, GTB Enclave Clinic"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Heatstroke Cases</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.heatstroke_cases}
                    onChange={(e) => setFormData({ ...formData, heatstroke_cases: Number(e.target.value) })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Dehydration Cases</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.dehydration_cases}
                    onChange={(e) => setFormData({ ...formData, dehydration_cases: Number(e.target.value) })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Respiratory Emergencies</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.respiratory_cases}
                    onChange={(e) => setFormData({ ...formData, respiratory_cases: Number(e.target.value) })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Vulnerable Population (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.vulnerable_population_pct}
                    onChange={(e) => setFormData({ ...formData, vulnerable_population_pct: parseFloat(e.target.value) })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Heat Risk Level</label>
                  <select
                    value={formData.heat_risk_level}
                    onChange={(e) => setFormData({ ...formData, heat_risk_level: e.target.value })}
                    className="w-full bg-[#12392B] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 transition shadow"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Health Record...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Submit Verified Health Data</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Registered Health Records List */}
          <div className="lg:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                Clinical Registry Records ({healthRecords.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {healthRecords.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#0d2b21] border border-white/10 text-center text-xs text-[#9CB9A3]">
                  No clinical records found for the selected district filter. Submit data using the form to register new records.
                </div>
              ) : (
                healthRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 rounded-xl bg-[#0d2b21] border border-white/10 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white text-sm">{rec.area || 'Regional Medical Center'}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/20">
                        {rec.district}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono">
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-[#9CB9A3] text-[10px] block font-sans">Heatstroke</span>
                        <span className="text-amber-300 font-bold">{rec.heatstroke_cases || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-[#9CB9A3] text-[10px] block font-sans">Dehydration</span>
                        <span className="text-emerald-300 font-bold">{rec.dehydration_cases || 0}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white/5">
                        <span className="text-[#9CB9A3] text-[10px] block font-sans">Respiratory</span>
                        <span className="text-purple-300 font-bold">{rec.respiratory_cases || 0}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#9CB9A3] pt-2 border-t border-white/5">
                      <span>Status: <strong className="text-emerald-400">{rec.verification_status || 'Official'}</strong></span>
                      <span>Total Cases: <strong className="text-white font-mono">{rec.total_heat_cases || 0}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
