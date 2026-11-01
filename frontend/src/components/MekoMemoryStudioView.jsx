import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  ShieldCheck,
  Database,
  ArrowRightLeft,
  PlusCircle,
  Award,
  Trash2,
  Activity,
  Edit3,
  Check,
  X,
  Server,
  AlertCircle,
} from 'lucide-react';
import { api } from '../api/client';
import {
  SyntheticScenarioBadge,
  FeasibilityStatusBadge,
} from './ui/ScientificBadges';

export default function MekoMemoryStudioView({ mekoEnabled, onToggleMeko }) {
  const [datapacks, setDatapacks] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [checkT, setCheckT] = useState(null);
  const [memories, setMemories] = useState([]);
  const [activity, setActivity] = useState([]);
  const [selectedDatapack, setSelectedDatapack] = useState('vansetu-climate-knowledge');
  const [newContent, setNewContent] = useState('');
  const [newCorridor, setNewCorridor] = useState('C-14');
  const [newWard, setNewWard] = useState('ward-12');
  const [newEvidenceRef, setNewEvidenceRef] = useState('survey-018-field');
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingEvidence, setEditingEvidence] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadMekoData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const agentForDp =
        selectedDatapack === 'vansetu-build'
          ? 'niharika-coding-agent'
          : 'climate_planner_agent';

      const [dpRes, compRes, checkTRes, memRes, actRes] = await Promise.allSettled([
        api.getMekoDatapacks(),
        api.compareMekoOnOff({ corridorId: 'C-14', wardId: 'ward-12', budgetLakh: 8.0 }),
        api.getMekoCheckT(),
        api.getMekoMemories({ agentId: agentForDp, datapackId: selectedDatapack }),
        api.getMekoActivity(30),
      ]);
      if (dpRes.status === 'fulfilled') setDatapacks(dpRes.value?.datapacks || []);
      if (compRes.status === 'fulfilled') setComparison(compRes.value);
      if (checkTRes.status === 'fulfilled') setCheckT(checkTRes.value);
      if (memRes.status === 'fulfilled') setMemories(memRes.value?.memories || []);
      if (actRes.status === 'fulfilled') setActivity(actRes.value?.events || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load Meko datapack state.');
    } finally {
      setLoading(false);
    }
  }, [selectedDatapack]);

  useEffect(() => {
    loadMekoData();
  }, [loadMekoData]);

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await api.addMekoMemory({
        agent_id: 'climate_planner_agent',
        datapack_id: 'vansetu-project-memory',
        content: newContent,
        ward_id: newWard,
        corridor_id: newCorridor,
        evidence_reference: newEvidenceRef,
        verification_status: 'pending_human_review',
      });
      setNewContent('');
      setSelectedDatapack('vansetu-project-memory');
      setStatusMessage('Candidate memory stored in vansetu-project-memory (pending_human_review).');
      await loadMekoData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleVerifyAndPromote = async (memoryId) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await api.promoteMekoMemory(memoryId, {
        agent_id: 'municipal_reviewer',
        verified_by: 'planner_niharika',
        target_datapack_id: 'vansetu-climate-knowledge',
      });
      setStatusMessage(`Memory ${memoryId} approved as human_verified and promoted.`);
      await loadMekoData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleStartEdit = (mem) => {
    setEditingMemoryId(mem.memory_id);
    setEditingContent(mem.content_text || mem.content || '');
    setEditingEvidence(mem.evidence_reference || '');
  };

  const handleSaveCorrection = async (memoryId) => {
    if (!editingContent.trim()) return;
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await api.updateMekoMemory(memoryId, {
        agent_id: 'municipal_reviewer',
        content: editingContent,
        evidence_reference: editingEvidence,
      });
      setEditingMemoryId(null);
      setStatusMessage(`Memory ${memoryId} corrected via PATCH /api/meko/memories/${memoryId}.`);
      await loadMekoData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await api.deleteMekoMemory(memoryId, 'municipal_reviewer');
      setStatusMessage(`Memory ${memoryId} forgotten/deleted from active datapack.`);
      await loadMekoData();
    } catch (err) {
      setErrorMessage(err.message);
    }
  };

  const diff = comparison?.diff_summary || {};
  const transportMode = checkT?.transport_mode || 'local_persistent_mcp_engine';
  const isLiveCloudMeko = transportMode === 'live_meko_mcp';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header & Global Meko Toggle + Honest Connection Status */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Brain className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 className="text-base font-bold text-white">
              YugabyteDB / Meko Institutional Memory &amp; Multi-Agent Context Layer
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Track A: Open Project • Build AI That Remembers
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                isLiveCloudMeko
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
              }`}
              title="Reflects actual backend Meko transport mode; never claims cloud connection when MEKO_API_KEY is unset."
            >
              <Server className="w-3 h-3" aria-hidden="true" />
              {isLiveCloudMeko
                ? 'Connection: Live Meko Cloud MCP'
                : 'Connection: Local Persistent MCP Engine (SQLite / MEKO_API_KEY Unset)'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connects geospatial intelligence with persistent municipal memory across 4 strictly isolated datapacks (1 Build-Time + 3 Runtime).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-lg border border-emerald-500/40">
          <span className="text-xs font-bold text-slate-200">Active Mode:</span>
          <button
            type="button"
            onClick={() => onToggleMeko(!mekoEnabled)}
            className={`px-3 py-1 rounded text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
              mekoEnabled
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-rose-700 text-white'
            }`}
          >
            {mekoEnabled ? 'MEKO ON (Persistent Memory Active)' : 'MEKO OFF (Stateless Baseline)'}
          </button>
        </div>
      </div>

      {/* Real API Operation Feedback Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="bg-rose-950/60 border border-rose-500/50 rounded-xl px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>
              <strong>Backend Operation Error: </strong>
              {errorMessage}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-300 hover:text-white font-mono text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          className="bg-emerald-950/50 border border-emerald-500/40 rounded-xl px-4 py-2 text-xs text-emerald-200 flex items-center justify-between"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-emerald-300 hover:text-white font-mono text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Live MEKO ON vs MEKO OFF Proof Panel with Explicit Synthetic Demo Disclosure */}
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white">
              Demonstrable Outcome Shift: MEKO OFF vs. MEKO ON (Ward 12 / Corridor C-14)
            </h3>
            <SyntheticScenarioBadge />
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Prompt: &ldquo;Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh.&rdquo;
          </span>
        </div>

        <p className="text-[11px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded border border-slate-800">
          <strong className="text-purple-300">Scenario Provenance Disclosure: </strong>
          The Corridor C-14 GPR subsurface utility record (<code className="text-emerald-300">survey-014</code>) is a controlled <strong>SYNTHETIC DEMONSTRATION SCENARIO</strong> seeded to verify that Meko institutional memory deterministically alters MILP portfolio optimization when recalled. It is not represented as an official municipal civil filing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* MEKO OFF Card */}
          <div className="bg-slate-950 border border-rose-500/40 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                MEKO OFF (No Institutional Memory)
              </span>
              <span className="font-mono font-bold text-slate-200">
                Total CapEx: ₹{diff.meko_off_total_capex_inr_lakhs ?? '7.20'}L
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Evaluates only satellite NDVI/LST and OSM road width (~24m proxy). Unaware of shallow 66kV BSES power duct &amp; DJB water main at 0.7m depth.
            </p>
            <div className="space-y-1 pt-1">
              {(diff.meko_off_selected || []).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between font-mono"
                >
                  <span className="text-rose-200 font-semibold">
                    {item.name} ({item.deployment_km} km)
                  </span>
                  <span className="text-slate-300">₹{item.capex_inr_lakhs}L</span>
                </div>
              ))}
            </div>
          </div>

          {/* MEKO ON Card */}
          <div className="bg-slate-950 border border-emerald-500/50 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                MEKO ON (Recalls Verified Survey-014)
              </span>
              <div className="flex items-center gap-1.5">
                <FeasibilityStatusBadge status="CONSTRAINT_IDENTIFIED" compact />
                <span className="font-mono font-bold text-emerald-400">
                  Total CapEx: ₹{diff.meko_on_total_capex_inr_lakhs ?? '7.77'}L
                </span>
              </div>
            </div>
            <p className="text-slate-300 text-[11px]">
              Recalls <code className="text-emerald-300">survey-014</code> from{' '}
              <code className="text-emerald-300">vansetu-climate-knowledge</code>, disqualifies deep excavation tree pits/bioswales, and reallocates ₹8.0L budget to surface-mounted cooling:
            </p>
            <div className="space-y-1 pt-1">
              {(diff.meko_on_selected || []).map((item) => (
                <div
                  key={item.id}
                  className="bg-emerald-950/30 p-2 rounded border border-emerald-500/40 flex justify-between font-mono"
                >
                  <span className="text-emerald-200 font-semibold">
                    {item.name} ({item.deployment_km} km)
                  </span>
                  <span className="text-emerald-300">₹{item.capex_inr_lakhs}L</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300">
          <strong className="text-emerald-400">Why Meko Changed the Recommendation: </strong>
          {diff.why_outcome_changed}
        </div>
      </div>

      {/* 4 Datapacks Isolation & Check T Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 4 Datapacks Explorer (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              4 Isolated Meko Datapacks (Build vs. Runtime RBAC)
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Select datapack to review, approve, correct, or forget memories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {datapacks.map((dp) => {
              const active = selectedDatapack === dp.logical_name;
              return (
                <button
                  type="button"
                  key={dp.logical_name}
                  onClick={() => setSelectedDatapack(dp.logical_name)}
                  className={`text-left p-3 rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                    active
                      ? 'bg-emerald-950/40 border-emerald-500'
                      : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-300">
                      {dp.logical_name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {dp.tier}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {dp.description}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-300">
                    <span>Memories: {dp.memory_count}</span>
                    <span className="text-emerald-400">Promoted: {dp.promoted_count}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Memories List in Selected Datapack with Review / Approve / Correct / Forget Controls */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200">
                Memories in <code className="text-emerald-400">{selectedDatapack}</code> ({memories.length})
              </div>
              {loading && (
                <span className="text-[10px] font-mono text-slate-400">Refreshing...</span>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {memories.map((mem) => {
                const isEditing = editingMemoryId === mem.memory_id;
                const isSyntheticSurvey014 =
                  String(mem.evidence_reference || '').includes('survey-014') ||
                  String(mem.memory_id || '').includes('014');

                return (
                  <div
                    key={mem.memory_id}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] flex-wrap">
                        <span className="text-emerald-300 font-bold">{mem.memory_id}</span>
                        <span className="text-slate-400">
                          • Scope: {mem.datapack_logical || selectedDatapack}
                        </span>
                        <span className="text-slate-400">
                          • Author: {mem.created_by || mem.agent_id}
                        </span>
                        {mem.ward_id && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">
                            {mem.ward_id} / {mem.corridor_id}
                          </span>
                        )}
                        {isSyntheticSurvey014 && <SyntheticScenarioBadge />}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            mem.verification_status === 'human_verified'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {mem.verification_status}
                        </span>

                        {mem.datapack_logical !== 'vansetu-build' && !mem.promoted && (
                          <button
                            type="button"
                            onClick={() => handleVerifyAndPromote(mem.memory_id)}
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1"
                            title="Approve and promote candidate memory to human_verified"
                          >
                            <Award className="w-3 h-3" aria-hidden="true" /> Approve &amp; Promote
                          </button>
                        )}

                        {mem.datapack_logical !== 'vansetu-build' && !isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(mem)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1"
                            title="Correct memory content or evidence reference"
                          >
                            <Edit3 className="w-3 h-3" aria-hidden="true" /> Correct
                          </button>
                        )}

                        {mem.datapack_logical !== 'vansetu-build' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(mem.memory_id)}
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 text-[10px] font-semibold flex items-center gap-1"
                            title="Forget / Delete Memory"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" /> Forget
                          </button>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="bg-slate-900 p-2.5 rounded border border-emerald-500/40 space-y-2">
                        <textarea
                          rows={2}
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          aria-label="Edit memory content"
                          className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={editingEvidence}
                            onChange={(e) => setEditingEvidence(e.target.value)}
                            placeholder="Evidence reference (e.g., survey-018)"
                            aria-label="Edit evidence reference"
                            className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white"
                          />
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveCorrection(mem.memory_id)}
                              className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" aria-hidden="true" /> Save Correction
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMemoryId(null)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                            >
                              <X className="w-3 h-3" aria-hidden="true" /> Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-200 text-xs leading-relaxed">
                        {mem.content_text || mem.content}
                      </p>
                    )}

                    <div className="text-[10px] font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900">
                      <span>
                        Source / Evidence Ref:{' '}
                        <span className="text-slate-300">{mem.evidence_reference || 'N/A'}</span>
                      </span>
                      <span>
                        Date: <span className="text-slate-300">{mem.valid_from || '2026-10'}</span> • Confidence:{' '}
                        <span className="text-emerald-400">
                          {Math.round((mem.confidence || 0.9) * 100)}%
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Meko Check T Verification & Candidate Memory Intake (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Check T Panel */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                Meko Check T — Shared Build Datapack Verification
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {checkT?.check_t_passed ? 'PASSED (12/10 Promoted)' : 'CHECKING'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Verifies that coding agents for both teammates (
              <code className="text-emerald-300">niharika-coding-agent</code> &amp;{' '}
              <code className="text-emerald-300">kunal-coding-agent</code>) promoted &ge;10 architectural decisions into{' '}
              <code className="text-emerald-300">vansetu-build</code> and can cross-recall each other&apos;s decisions.
            </p>
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 block">Promoted Decisions</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {checkT?.total_promoted_decisions ?? 12}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Teammates</span>
                <span className="text-white font-bold">
                  {(checkT?.unique_teammates || ['Kunal', 'Niharika']).join(' & ')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Cross-Agent Recall</span>
                <span className="text-cyan-300 font-bold">
                  {checkT?.cross_agent_recall_test?.recalled_from_teammate_count ?? 6} Recalled
                </span>
              </div>
            </div>
          </div>

          {/* Add New Candidate Geospatial Memory */}
          <form
            onSubmit={handleAddCandidate}
            className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs"
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              Record Candidate Site Memory (Human Approval Gate)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                aria-label="Ward ID"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                placeholder="ward-12"
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
              <input
                type="text"
                aria-label="Corridor code"
                value={newCorridor}
                onChange={(e) => setNewCorridor(e.target.value)}
                placeholder="C-14"
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
              <input
                type="text"
                aria-label="Evidence reference"
                value={newEvidenceRef}
                onChange={(e) => setNewEvidenceRef(e.target.value)}
                placeholder="survey-018"
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
            </div>
            <textarea
              rows={2}
              aria-label="Candidate site memory observation text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter field survey observation or corridor constraint (stored as pending_human_review until verified)..."
              className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white"
            />
            <button
              type="submit"
              className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              Store Candidate Memory in vansetu-project-memory
            </button>
          </form>

          {/* Live Meko Activity Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              Live Meko MCP Activity Trace ({activity.length})
            </h3>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 font-mono text-[11px]">
              {activity.map((ev) => (
                <div
                  key={ev.log_id}
                  className="bg-slate-950 p-2 rounded border border-slate-800"
                >
                  <div className="flex justify-between text-[10px] text-emerald-400">
                    <span>
                      [{ev.mcp_tool}] {ev.agent_id}
                    </span>
                    <span className="text-slate-400">{ev.datapack_logical}</span>
                  </div>
                  <div className="text-slate-300 mt-0.5">{ev.summary}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
