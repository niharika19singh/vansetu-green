import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileText,
  Layers,
  Thermometer,
  Trees,
  Wind,
  Footprints,
  Activity,
  Send,
  Eye,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { safeToFixed, formatNDVI } from '../utils/numericFormat';

export default function InterventionIntelligenceView({
  selectedCorridor,
  onSelectCorridor,
}) {
  const [segmentId, setSegmentId] = useState(
    selectedCorridor?.code ? `${selectedCorridor.code}-S001` : 'C-14-S001'
  );
  const [policyObjective, setPolicyObjective] = useState('heat_resilience');
  const [modelStatus, setModelStatus] = useState(null);
  const [dataStatus, setDataStatus] = useState(null);
  const [featuresData, setFeaturesData] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Field assessment submission state
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assArchetype, setAssArchetype] = useState('linear_street_trees');
  const [assState, setAssState] = useState('CONDITIONAL');
  const [officerToken, setOfficerToken] = useState(() => {
    return sessionStorage.getItem('vansetu_officer_token') || '';
  });
  const [assEvidenceType, setAssEvidenceType] = useState('GPR_UTILITY_SURVEY');
  const [assEvidenceRef, setAssEvidenceRef] = useState('');
  const [assEvidenceFile, setAssEvidenceFile] = useState(null);
  const [uploadedEvidence, setUploadedEvidence] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [assNotes, setAssNotes] = useState('');
  const [submittingAss, setSubmittingAss] = useState(false);
  const [assSuccessMsg, setAssSuccessMsg] = useState(null);

  // Sync segment with selected corridor
  useEffect(() => {
    if (selectedCorridor?.code) {
      setSegmentId(`${selectedCorridor.code}-S001`);
    }
  }, [selectedCorridor]);

  // Load system status once
  useEffect(() => {
    async function loadStatus() {
      try {
        const [mStatus, dStatus] = await Promise.all([
          api.getMlModelStatus(),
          api.getMlDataStatus(),
        ]);
        setModelStatus(mStatus);
        setDataStatus(dStatus);
      } catch (err) {
        console.error('Failed to load ML system status:', err);
      }
    }
    loadStatus();
  }, []);

  // Fetch recommendations and features for selected segment
  const fetchSegmentIntelligence = useCallback(async () => {
    if (!segmentId) return;
    setLoading(true);
    setError(null);
    try {
      const [featRes, recRes] = await Promise.all([
        api.getSegmentFeatures(segmentId),
        api.recommendInterventions({
          segment_id: segmentId,
          policy_objective: policyObjective,
        }),
      ]);
      setFeaturesData(featRes);
      setRecommendations(recRes);
    } catch (err) {
      setError(err.message || 'Failed to fetch segment recommendations.');
    } finally {
      setLoading(false);
    }
  }, [segmentId, policyObjective]);

  useEffect(() => {
    fetchSegmentIntelligence();
  }, [fetchSegmentIntelligence]);

  // Handle assessment submit
  const handleAssessmentSubmit = async (e) => {
    e.preventDefault();
    if (!officerToken.trim()) {
      alert('Authentication error: An accredited municipal officer token is required.');
      return;
    }
    setSubmittingAss(true);
    setAssSuccessMsg(null);
    try {
      let finalEvidenceId = uploadedEvidence?.evidence_id || null;

      // If a file was selected but not yet uploaded, upload it now
      if (assEvidenceFile && !finalEvidenceId) {
        setUploadingDoc(true);
        const formData = new FormData();
        formData.append('file', assEvidenceFile);
        formData.append('document_type', assEvidenceType);
        const upRes = await api.uploadEvidenceDocument(formData, officerToken);
        finalEvidenceId = upRes.evidence_id;
        setUploadedEvidence(upRes);
        setUploadingDoc(false);
      }

      const res = await api.submitSiteAssessment(
        {
          segment_id: segmentId,
          corridor_id: featuresData?.corridor_code || 'C-14',
          intervention_archetype: assArchetype,
          suitability_state: assState,
          evidence_reference: assEvidenceRef.trim() || (uploadedEvidence?.filename || 'FIELD_SURVEY_DOC'),
          evidence_document_type: assEvidenceType,
          evidence_id: finalEvidenceId,
          reviewer_notes: assNotes,
        },
        officerToken
      );
      setAssSuccessMsg(`Assessment recorded: ${res.assessment_id} (${res.suitability_state}) • Identity & evidence verified server-side`);
      fetchSegmentIntelligence();
    } catch (err) {
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmittingAss(false);
      setUploadingDoc(false);
    }
  };

  const feats = featuresData?.features || {};
  const recs = recommendations?.ranked_recommendations || [];
  const gate = modelStatus?.minimum_evidence_gate || {};

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              Delhi Road Segment Intervention Intelligence Engine
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
              {recommendations?.decision_engine === 'APPROVED_ML_CLASSIFIER'
                ? 'Approved ML Classifier Active'
                : 'Deterministic Rule Engine • Zero-Synthetic Training Policy'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Predicts intervention suitability at 75m road segment resolution using real 10m Sentinel-2 NDVI, 1km MODIS LST, CAAQM stations, and verified boundary spatial joins.
          </p>
        </div>

        {/* Data Ecosystem & Model State Badges */}
        <div className="flex items-center gap-2">
          <div className="text-right text-xs">
            <span className="text-slate-400 block text-[10px]">Ecosystem Sources</span>
            <span className="font-mono text-emerald-400 font-bold">
              {dataStatus?.sources_count ?? 8} Verified Adapters
            </span>
          </div>
          <button
            onClick={() => setShowAssessmentForm(!showAssessmentForm)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showAssessmentForm ? 'Hide Form' : 'Submit Ground Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Model Governance & Minimum Evidence Gate Disclosure */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <span className="text-slate-400 font-medium block">Model Training Integrity Gate:</span>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded font-mono text-[11px] ${gate.is_trainable ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
              {gate.status || 'CHECKING_GATE'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Enforces strict minimum: {gate.required_minimum_labels ?? 50} verified human field labels across {gate.required_minimum_corridors ?? 3} corridors.
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium block">Verified Labels on File:</span>
          <span className="text-base font-mono font-bold text-white">
            {gate.total_verified_labels ?? 0} <span className="text-xs font-normal text-slate-400">/ {gate.required_minimum_labels ?? 50} required</span>
          </span>
          <p className="text-[11px] text-slate-400">
            Synthetic &amp; simulated demonstration records are strictly quarantined from training sets.
          </p>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium block">Causal Outcome Learning:</span>
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-cyan-300 font-mono text-[11px]">Difference-in-Differences Framework</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Awaits empirical multi-season post-deployment telemetry before outcome model training.
          </p>
        </div>
      </div>

      {/* Field Assessment Form (Collapsible) */}
      {showAssessmentForm && (
        <form onSubmit={handleAssessmentSubmit} className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 text-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Record Municipal Field Suitability Assessment</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Auditable Human-in-the-Loop Ground Truth
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Target Segment ID</label>
              <input
                type="text"
                value={segmentId}
                onChange={(e) => setSegmentId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Intervention Class</label>
              <select
                value={assArchetype}
                onChange={(e) => setAssArchetype(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              >
                <option value="linear_street_trees">Linear Street Trees</option>
                <option value="roadside_bioswales">Roadside Bioswales</option>
                <option value="architectural_shade_structures">Architectural Shade Structures</option>
                <option value="high_albedo_cool_pavements">High-Albedo Cool Pavements</option>
                <option value="living_green_walls">Living Green Walls</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Suitability State</label>
              <select
                value={assState}
                onChange={(e) => setAssState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              >
                <option value="ELIGIBLE">ELIGIBLE (Feasible &amp; Justified)</option>
                <option value="CONDITIONAL">CONDITIONAL (Pending Work/Permit)</option>
                <option value="INELIGIBLE">INELIGIBLE (Hard Constraint Prevents)</option>
                <option value="UNASSESSED">UNASSESSED (Insufficient Evidence)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Accredited Officer Token</label>
              <input
                type="password"
                value={officerToken}
                onChange={(e) => {
                  setOfficerToken(e.target.value);
                  sessionStorage.setItem('vansetu_officer_token', e.target.value);
                }}
                placeholder="Bearer token (e.g. vs_...)"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-white text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Evidence Document Type</label>
              <select
                value={assEvidenceType}
                onChange={(e) => setAssEvidenceType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              >
                <option value="GPR_UTILITY_SURVEY">GPR Utility Survey (Ground-Penetrating Radar)</option>
                <option value="MUNICIPAL_WORK_ORDER">Municipal Work Order</option>
                <option value="ENGINEERING_CROSS_SECTION">Engineering Cross-Section Survey</option>
                <option value="TREE_CENSUS_REGISTER">Tree Census Register</option>
                <option value="HERITAGE_RESTRICTION_CIRCULAR">Heritage Restriction Circular</option>
                <option value="UNVERIFIED_TEXTUAL_NOTE">Unverified Textual Note</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Upload Clearance Document (PDF/PNG/JPEG)</label>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setAssEvidenceFile(file);
                  setUploadedEvidence(null);
                  if (file && !assEvidenceRef) {
                    setAssEvidenceRef(file.name.replace(/\.[^/.]+$/, ''));
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-300 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
              />
              {uploadedEvidence && (
                <span className="text-emerald-400 text-[10px] font-mono block mt-0.5">
                  ✓ Uploaded: {uploadedEvidence.evidence_id}
                </span>
              )}
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Document Reference Identifier</label>
              <input
                type="text"
                value={assEvidenceRef}
                onChange={(e) => setAssEvidenceRef(e.target.value)}
                placeholder="e.g., PWD/SOUTH/2026/GPR-7104"
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 font-mono text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Field Assessment Notes & Observations</label>
              <input
                type="text"
                value={assNotes}
                onChange={(e) => setAssNotes(e.target.value)}
                placeholder="Observed site realities, utility markers, soil condition, pedestrian clear width..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            {assSuccessMsg && (
              <span className="text-emerald-400 font-mono text-xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {assSuccessMsg}
              </span>
            )}
            <button
              type="submit"
              disabled={submittingAss}
              className="ml-auto px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingAss ? 'Submitting...' : 'Commit Verified Label'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Target Segment & Objective Selection Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 text-xs">
        <div>
          <label className="text-slate-400 block mb-1 font-medium">Target Road Segment (75m segment code):</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 font-mono text-white text-sm"
              placeholder="C-14-S001"
            />
            <button
              onClick={fetchSegmentIntelligence}
              disabled={loading}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-medium"
            >
              Analyze
            </button>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Sample segments: <code className="text-emerald-300">C-14-S001</code>, <code className="text-emerald-300">C-14-S002</code>, <code className="text-emerald-300">C-01-S001</code>
          </span>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">Urban Climate Policy Objective:</label>
          <select
            value={policyObjective}
            onChange={(e) => setPolicyObjective(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-white"
          >
            <option value="heat_resilience">Heat Resilience (Thermal Anomaly Priority)</option>
            <option value="waterlogging_mitigation">Waterlogging Mitigation (Bioswales &amp; Infiltration)</option>
            <option value="pedestrian_shade">Pedestrian Shade Continuity (Canopy &amp; Shelters)</option>
            <option value="air_quality">Air Quality Mitigation (Particulate Filtration)</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1 font-medium">Corridor Context:</label>
          <div className="bg-slate-950 border border-slate-800 rounded p-2 text-xs">
            <span className="text-white font-semibold block">{featuresData?.corridor_name || 'Corridor C-14'}</span>
            <span className="text-slate-400 text-[11px]">
              District: <span className="text-slate-200">{featuresData?.district || 'Central / South'}</span> • Highway: <span className="font-mono text-emerald-300">{feats.highway_class || 'primary'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Environmental Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Sentinel-2 NDVI</span>
            <Trees className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <span className="text-lg font-mono font-bold text-emerald-400 block mt-1">
            {formatNDVI(feats.ndvi_mean, 3)}
          </span>
          <span className="text-[10px] text-emerald-300/80 block font-mono">10m Satellite Observed</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>MODIS LST &amp; UHI</span>
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <span className="text-lg font-mono font-bold text-rose-300 block mt-1">
            {feats.modis_lst_celsius ? `${feats.modis_lst_celsius}°C` : 'N/A'}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            {feats.thermal_anomaly_celsius ? `+${feats.thermal_anomaly_celsius}°C (Scene baseline 25.8°C)` : '1km native grid'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Right-of-Way (ROW)</span>
            <Footprints className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-base font-mono font-bold text-purple-300 block mt-1">
            {feats.road_class_guideline_row_m || feats.estimated_row_width_m ? `${feats.road_class_guideline_row_m || feats.estimated_row_width_m}m` : 'N/A'}
          </span>
          <span className="text-[10px] text-amber-400/90 block font-mono">
            {feats.surveyed_row_width_m ? `Surveyed: ${feats.surveyed_row_width_m}m` : 'Guideline only • Survey pending'}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Moisture (NDMI) / NDBI</span>
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <span className="text-xs font-mono font-bold text-slate-300 block mt-1.5 truncate">
            UNAVAILABLE
          </span>
          <span className="text-[9px] text-slate-400 block leading-tight">
            SWIR Band 11 required; synthetic proxy disabled
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Subsurface Clearance</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-xs font-mono font-bold text-amber-300 block mt-1.5 truncate">
            {feats.gpr_utility_survey_status || 'FIELD_GPR_REQUIRED'}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">Hard safety gate active</span>
        </div>
      </div>

      {/* Ranked Candidate Interventions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Ranked GreenTech Interventions for Segment {segmentId} ({recs.length} Classes)</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            CPWD 2023 DSR Reference Rates
          </span>
        </div>

        {recs.map((item, idx) => {
          const stateColors = {
            ELIGIBLE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
            CONDITIONAL: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
            INELIGIBLE: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            UNASSESSED: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
          };
          const badgeClass = stateColors[item.suitability_state] || stateColors.CONDITIONAL;

          return (
            <div
              key={item.archetype}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2 hover:border-slate-700 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 font-bold">#{idx + 1}</span>
                  <span className="font-bold text-white text-sm">{item.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${badgeClass}`}>
                    {item.suitability_state}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Relative Suitability Score</span>
                    <span className="font-mono text-emerald-400 font-bold text-sm">
                      {safeToFixed(item.ranking_score, 1)} / 100
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Indicative CapEx</span>
                    <span className="font-mono text-white font-bold text-sm">
                      ₹{item.indicative_capex_lakhs}L/km
                    </span>
                  </div>
                </div>
              </div>

              {/* Rationale & Warnings */}
              <p className="text-slate-300 text-xs bg-slate-950 p-2.5 rounded border border-slate-800/80">
                {item.explanation?.narrative_summary}
              </p>

              {/* Hard Constraints & Warnings Badges */}
              {item.hard_constraints?.length > 0 && (
                <div className="bg-rose-950/30 border border-rose-500/30 rounded p-2 text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[11px] block">Hard Physical Constraint Enforced:</span>
                    {item.hard_constraints.map((c, i) => (
                      <span key={i} className="block text-[11px] text-rose-300">• {c}</span>
                    ))}
                  </div>
                </div>
              )}

              {item.missing_evidence_warnings?.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded p-2 text-amber-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold text-[11px] block">Verification Checklist Required:</span>
                    {item.missing_evidence_warnings.map((w, i) => (
                      <span key={i} className="block text-[11px] text-amber-300">• {w}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Expected Impact & Technical Specifications */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-400 bg-slate-950/50 p-2 rounded">
                <div>
                  <span className="block text-slate-500">Cooling Potential</span>
                  <span className="text-emerald-300 font-semibold">{item.cooling_potential}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Annual OpEx</span>
                  <span className="text-amber-300 font-semibold">₹{item.annual_opex_lakhs}L/km/yr</span>
                </div>
                <div>
                  <span className="block text-slate-500">Primary Goal</span>
                  <span className="text-cyan-300 font-semibold">{item.primary_objective}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Decision Mode</span>
                  <span className="text-slate-300 font-semibold">{item.explanation?.decision_method}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
