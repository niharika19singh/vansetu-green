import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Database,
  CheckCircle2,
  PlusCircle,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api/client';

export default function EquityAndProvenanceView({ provenance, statsSummary }) {
  const [equityData, setEquityData] = useState(null);
  const [corridorId, setCorridorId] = useState('C-14');
  const [category, setCategory] = useState('heat_exposure');
  const [vulnerableGroup, setVulnerableGroup] = useState('outdoor_workers');
  const [severity, setSeverity] = useState(5);
  const [landmark, setLandmark] = useState('Ward 12 Bus Stop & Pedestrian Crossing');
  const [obsText, setObsText] = useState('');

  const loadEquity = useCallback(async () => {
    try {
      const res = await api.getEquitySummary();
      setEquityData(res);
    } catch (err) {
      console.error('Equity load error:', err);
    }
  }, []);

  useEffect(() => {
    loadEquity();
  }, [loadEquity]);

  const handleSubmitObservation = async (e) => {
    e.preventDefault();
    if (!obsText.trim()) return;
    try {
      await api.submitEquityObservation({
        corridor_id: corridorId,
        category,
        vulnerable_group: vulnerableGroup,
        severity: Number(severity),
        observation_text: obsText,
        location_landmark: landmark,
      });
      setObsText('');
      await loadEquity();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVerifyObs = async (obsId) => {
    try {
      await api.verifyEquityObservation(obsId, {
        verified_by: 'planner_niharika',
        approve: true,
      });
      await loadEquity();
    } catch (err) {
      alert(err.message);
    }
  };

  const datasets = provenance?.datasets ? Object.values(provenance.datasets) : [];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Social Equity, Community Observations &amp; Scientific Data Provenance
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Best Social Innovation • Human-Verified Governance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Prioritizes outdoor workers, transit commuters, schoolchildren, and elderly pedestrians while maintaining strict scientific transparency across satellite and station datasets.
          </p>
        </div>
      </div>

      {/* Social Equity & Community Observation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Vulnerable Corridor Rankings & Verified Community Observations (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Anonymized Community Heat &amp; Shade Observations ({equityData?.total_community_observations || 0})
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">
              Verified: {equityData?.human_verified_observations || 0} • Pending: {equityData?.pending_review_observations || 0}
            </span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {(equityData?.observations || []).map((obs) => (
              <div
                key={obs.observation_id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-emerald-300 font-bold">{obs.corridor_code}</span>
                    <span className="text-slate-400">({obs.ward_id})</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      {obs.vulnerable_group}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                      Severity {obs.severity}/5
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        obs.verification_status === 'human_verified'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {obs.verification_status}
                    </span>
                    {obs.verification_status !== 'human_verified' && (
                      <button
                        onClick={() => handleVerifyObs(obs.observation_id)}
                        className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold"
                      >
                        Planner Verify
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-slate-200">{obs.observation_text}</p>
                <div className="text-[10px] text-slate-400">
                  Landmark: {obs.location_landmark} • Reporter: {obs.anonymized_reporter_role}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Community Observation Form (5 cols) */}
        <form
          onSubmit={handleSubmitObservation}
          className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            Submit Anonymized Community Observation
          </h3>
          <p className="text-[11px] text-slate-400">
            Zero personal data is collected. Submissions enter <code className="text-amber-300">pending_review</code> and require municipal planner verification before influencing formal Meko memory or budget optimization.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Corridor Code</label>
              <input
                type="text"
                value={corridorId}
                onChange={(e) => setCorridorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Vulnerable Group</label>
              <select
                value={vulnerableGroup}
                onChange={(e) => setVulnerableGroup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white"
              >
                <option value="outdoor_workers">Outdoor Workers &amp; Street Vendors</option>
                <option value="transit_commuters">Bus &amp; Metro Transit Commuters</option>
                <option value="schoolchildren">Schoolchildren</option>
                <option value="elderly_residents">Elderly Residents</option>
                <option value="dense_low_income_neighborhoods">Dense Low-Income Neighborhoods</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Issue Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-white"
              >
                <option value="heat_exposure">Heat Exposure</option>
                <option value="shade_accessibility">Shade Accessibility</option>
                <option value="pedestrian_infrastructure">Pedestrian Infrastructure</option>
                <option value="drinking_water_cooling_access">Water &amp; Cooling Access</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Severity (1-5): {severity}</label>
              <input
                type="range"
                min="1"
                max="5"
                value={severity}
                onChange={(e) => setSeverity(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500 mt-1.5"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Location Landmark</label>
            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Observation Details</label>
            <textarea
              rows={2}
              value={obsText}
              onChange={(e) => setObsText(e.target.value)}
              placeholder="Describe shade deficit, thermal discomfort, or footpath obstruction..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
          >
            Submit Community Observation (Pending Planner Review)
          </button>
        </form>
      </div>

      {/* Scientific Data Provenance & Native vs Display Resolution Registry */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">
            Geospatial Data Provenance &amp; Native vs. Display Resolution Registry
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300">{ds.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                  Native: {ds.native_resolution_m}m → Display: {ds.display_resolution_m}m
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Provider: <span className="text-slate-200">{ds.provider}</span> • Period: {ds.observation_period}
              </div>
              <p className="text-[11px] text-amber-200/90 bg-amber-950/30 p-2 rounded border border-amber-500/20">
                {ds.resampling_note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
