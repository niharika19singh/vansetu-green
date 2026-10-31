import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Database,
  PlusCircle,
  Award,
  XCircle,
  CheckCircle2,
  Scale,
} from 'lucide-react';
import { api } from '../api/client';

const EQUITY_DIMENSIONS = [
  {
    id: 'climate_burden',
    title: '1. Climate Burden',
    metric: 'Surface LST + AQI + Canopy Deficit',
    detail: 'Physical environmental hazard intensity measured from MODIS LST, Sentinel-2 NDVI, and CPCB stations.',
    color: 'border-orange-500/40 text-orange-300',
  },
  {
    id: 'population_exposure',
    title: '2. Population Exposure',
    metric: 'Pedestrian & Transit Wait Density Proxy',
    detail: 'Duration and intensity of unshaded street exposure along bus stops, markets, and walking corridors.',
    color: 'border-sky-500/40 text-sky-300',
  },
  {
    id: 'social_vulnerability',
    title: '3. Social Vulnerability',
    metric: 'Outdoor Workers, Elderly & Children',
    detail: 'Socio-spatial susceptibility of populations with high occupational heat exposure and low adaptive capacity.',
    color: 'border-purple-500/40 text-purple-300',
  },
  {
    id: 'intervention_accessibility',
    title: '4. Intervention Accessibility',
    metric: 'Public Right-of-Way Shade & Cooling',
    detail: 'Ensures green infrastructure is deployed in free, publicly accessible footpaths rather than gated enclaves.',
    color: 'border-emerald-500/40 text-emerald-300',
  },
  {
    id: 'equity_weighted_prioritisation',
    title: '5. Equity-Weighted Prioritisation',
    metric: 'MILP Equity Multiplier (0.00–0.80)',
    detail: 'Explicit policy weight in the MILP budget solver directing capital toward high-vulnerability wards.',
    color: 'border-amber-500/40 text-amber-300',
  },
];

export default function EquityAndProvenanceView({ provenance, statsSummary }) {
  const [equityData, setEquityData] = useState(null);
  const [acceptanceMatrix, setAcceptanceMatrix] = useState(null);
  const [corridorId, setCorridorId] = useState('C-14');
  const [category, setCategory] = useState('heat_exposure');
  const [vulnerableGroup, setVulnerableGroup] = useState('outdoor_workers');
  const [severity, setSeverity] = useState(5);
  const [landmark, setLandmark] = useState('Ward 12 Bus Stop & Pedestrian Crossing');
  const [obsText, setObsText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  const loadEquityAndAcceptance = useCallback(async () => {
    try {
      const [eqRes, accRes] = await Promise.all([
        api.getEquitySummary(),
        api.getAcceptanceMatrix().catch(() => null),
      ]);
      setEquityData(eqRes);
      if (accRes) setAcceptanceMatrix(accRes);
    } catch (err) {
      console.error('Equity load error:', err);
    }
  }, []);

  useEffect(() => {
    loadEquityAndAcceptance();
  }, [loadEquityAndAcceptance]);

  const handleSubmitObservation = async (e) => {
    e.preventDefault();
    if (!obsText.trim()) return;
    setFeedbackMsg(null);
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
      setFeedbackMsg('Community observation recorded as Pending review (isolated from verified municipal evidence until planner review).');
      await loadEquityAndAcceptance();
    } catch (err) {
      setFeedbackMsg(`Error: ${err.message}`);
    }
  };

  const handleVerifyObs = async (obsId, approve = true) => {
    setFeedbackMsg(null);
    try {
      await api.verifyEquityObservation(obsId, {
        verified_by: 'planner_niharika',
        approve,
      });
      setFeedbackMsg(
        approve
          ? `Observation ${obsId} verified by municipal planner (Human verified).`
          : `Observation ${obsId} marked as Rejected.`
      );
      await loadEquityAndAcceptance();
    } catch (err) {
      setFeedbackMsg(`Error: ${err.message}`);
    }
  };

  const datasets = provenance?.datasets ? Object.values(provenance.datasets) : [];
  const allObs = equityData?.observations || [];
  const filteredObs = allObs.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.verification_status === statusFilter;
  });

  const formatVerificationLabel = (status) => {
    if (status === 'human_verified') return 'Human verified';
    if (status === 'rejected') return 'Rejected';
    return 'Pending review';
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-white">
              Social Equity Framework, Community Governance &amp; Data Provenance
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
              Best Social Innovation • Human-Verified Governance
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Separates Climate Burden, Population Exposure, Social Vulnerability, Intervention Accessibility, and Equity-Weighted Prioritisation while keeping community reports distinct from verified municipal datasets.
          </p>
        </div>
      </div>

      {/* Section 6E: 5-Dimension Equity Disambiguation Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-purple-400" aria-hidden="true" />
            5-Dimension Equity-Aware Planning Architecture (Conceptual Separation)
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            Explicitly separated in scoring &amp; MILP allocation
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 text-xs">
          {EQUITY_DIMENSIONS.map((dim) => (
            <div
              key={dim.id}
              className={`bg-slate-950 border ${dim.color} rounded-lg p-3 space-y-1`}
            >
              <div className="font-bold text-xs">{dim.title}</div>
              <div className="font-mono text-[10px] text-slate-200">{dim.metric}</div>
              <p className="text-[10px] text-slate-400 leading-relaxed">{dim.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {feedbackMsg && (
        <div
          role="status"
          className="bg-slate-900 border border-emerald-500/40 rounded-xl px-4 py-2 text-xs text-emerald-200 flex items-center justify-between"
        >
          <span>{feedbackMsg}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-white font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Social Equity & Community Observation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Community Observations with Explicit Status Separation (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                Anonymized Community Heat &amp; Shade Observations ({equityData?.total_community_observations || 0})
              </h3>
              <p className="text-[11px] text-slate-400">
                Visibly separated from official satellite/CPCB datasets. Statuses: <strong>Pending review</strong>, <strong>Human verified</strong>, or <strong>Rejected</strong>.
              </p>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'human_verified', label: 'Human verified' },
                { id: 'pending_review', label: 'Pending review' },
                { id: 'rejected', label: 'Rejected' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2 py-1 rounded border transition ${
                    statusFilter === tab.id
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filteredObs.map((obs) => {
              const humanStatus = formatVerificationLabel(obs.verification_status);
              return (
                <div
                  key={obs.observation_id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-mono text-[11px] flex-wrap">
                      <span className="text-emerald-300 font-bold">{obs.corridor_code}</span>
                      <span className="text-slate-400">({obs.ward_id})</span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        {obs.vulnerable_group}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300">
                        Severity {obs.severity}/5
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          obs.verification_status === 'human_verified'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : obs.verification_status === 'rejected'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        {humanStatus} ({obs.verification_status})
                      </span>
                      {obs.verification_status !== 'human_verified' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyObs(obs.observation_id, true)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Approve
                        </button>
                      )}
                      {obs.verification_status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleVerifyObs(obs.observation_id, false)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-[10px] font-semibold flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" aria-hidden="true" /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-200">{obs.observation_text}</p>
                  <div className="text-[10px] text-slate-400">
                    Landmark: {obs.location_landmark} • Source Classification: Community Report ({obs.anonymized_reporter_role})
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Community Observation Form (5 cols) */}
        <form
          onSubmit={handleSubmitObservation}
          className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            Submit Anonymized Community Observation
          </h3>
          <p className="text-[11px] text-slate-400">
            Zero personal data is collected. Submissions enter{' '}
            <code className="text-amber-300">Pending review</code> (<code className="text-amber-300">pending_review</code>) and require municipal planner verification before influencing formal Meko memory or budget optimization.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="eq-corridor-input" className="text-slate-400 block mb-1">
                Corridor Code
              </label>
              <input
                id="eq-corridor-input"
                type="text"
                value={corridorId}
                onChange={(e) => setCorridorId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-white"
              />
            </div>
            <div>
              <label htmlFor="eq-group-select" className="text-slate-400 block mb-1">
                Vulnerable Group
              </label>
              <select
                id="eq-group-select"
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
              <label htmlFor="eq-cat-select" className="text-slate-400 block mb-1">
                Issue Category
              </label>
              <select
                id="eq-cat-select"
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
              <label htmlFor="eq-sev-slider" className="text-slate-400 block mb-1">
                Severity (1-5): {severity}
              </label>
              <input
                id="eq-sev-slider"
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
            <label htmlFor="eq-landmark-input" className="text-slate-400 block mb-1">
              Location Landmark
            </label>
            <input
              id="eq-landmark-input"
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
            />
          </div>

          <div>
            <label htmlFor="eq-obs-textarea" className="text-slate-400 block mb-1">
              Observation Details
            </label>
            <textarea
              id="eq-obs-textarea"
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
            Submit Community Observation (Pending Review)
          </button>
        </form>
      </div>

      {/* Scientific Data Provenance & Native vs Display Resolution Registry */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" aria-hidden="true" />
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
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-bold text-emerald-300">{ds.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300">
                  Native: {ds.native_resolution_m}m → Display: {ds.display_resolution_m}m ({ds.crs})
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

      {/* Official Track & Sponsor 7-Gate Acceptance Matrix */}
      {acceptanceMatrix && (
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white">
                HackCBS 9.0 Official Track &amp; Sponsor 7-Gate Acceptance Matrix
              </h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              All {acceptanceMatrix.total_tracks_and_prizes} Tracks: {acceptanceMatrix.overall_status}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                  <th className="py-1.5 pr-2">Track / Sponsor Prize</th>
                  <th className="py-1.5 px-2">Current Lifecycle Gate</th>
                  <th className="py-1.5 px-2">Primary Code Evidence</th>
                  <th className="py-1.5 pl-2">Live Verification Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(acceptanceMatrix.tracks || []).map((tr) => (
                  <tr key={tr.id}>
                    <td className="py-2 pr-2 font-semibold text-slate-100">{tr.title}</td>
                    <td className="py-2 px-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono text-[10px] font-bold">
                        {tr.current_lifecycle_state}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[10px] text-slate-300">
                      {(tr.evidence?.code_files || []).slice(0, 2).join(', ')}
                    </td>
                    <td className="py-2 pl-2 font-mono text-[10px] text-cyan-300">
                      {JSON.stringify(tr.evidence?.live_verification || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
