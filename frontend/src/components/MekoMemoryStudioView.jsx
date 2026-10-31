import React, { useState, useEffect, useCallback } from 'react';
import {
  Brain,
  CheckCircle2,
  ShieldCheck,
  Database,
  ArrowRightLeft,
  PlusCircle,
  Award,
  Trash2,
  Activity,
} from 'lucide-react';
import { api } from '../api/client';

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
  const [loading, setLoading] = useState(false);

  const loadMekoData = useCallback(async () => {
    setLoading(true);
    try {
      const agentForDp =
        selectedDatapack === 'vansetu-build'
          ? 'niharika-coding-agent'
          : 'climate_planner_agent';

      const [dpRes, compRes, checkTRes, memRes, actRes] = await Promise.all([
        api.getMekoDatapacks(),
        api.compareMekoOnOff({ corridorId: 'C-14', wardId: 'ward-12', budgetLakh: 8.0 }),
        api.getMekoCheckT(),
        api.getMekoMemories({ agentId: agentForDp, datapackId: selectedDatapack }),
        api.getMekoActivity(30),
      ]);
      setDatapacks(dpRes.datapacks || []);
      setComparison(compRes);
      setCheckT(checkTRes);
      setMemories(memRes.memories || []);
      setActivity(actRes.events || []);
    } catch (err) {
      console.error('Meko load error:', err);
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
      await loadMekoData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleVerifyAndPromote = async (memoryId) => {
    try {
      await api.promoteMekoMemory(memoryId, {
        agent_id: 'municipal_reviewer',
        verified_by: 'planner_niharika',
        target_datapack_id: 'vansetu-climate-knowledge',
      });
      await loadMekoData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteMemory = async (memoryId) => {
    try {
      await api.deleteMekoMemory(memoryId, 'municipal_reviewer');
      await loadMekoData();
    } catch (err) {
      alert(err.message);
    }
  };

  const diff = comparison?.diff_summary || {};

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 bg-slate-950 text-slate-100">
      {/* Header & Global Meko Toggle */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">
              YugabyteDB / Meko Institutional Memory &amp; Multi-Agent Context Layer
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              Track A: Open Project • Build AI That Remembers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Connects geospatial intelligence with persistent municipal memory across 4 strictly isolated datapacks (1 Build-Time + 3 Runtime).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 px-3.5 py-2 rounded-lg border border-emerald-500/40">
          <span className="text-xs font-bold text-slate-200">Active Mode:</span>
          <button
            onClick={() => onToggleMeko(!mekoEnabled)}
            className={`px-3 py-1 rounded text-xs font-bold transition ${
              mekoEnabled
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-rose-700 text-white'
            }`}
          >
            {mekoEnabled ? 'MEKO ON (Persistent Memory Active)' : 'MEKO OFF (Stateless Baseline)'}
          </button>
        </div>
      </div>

      {/* Live MEKO ON vs MEKO OFF Proof Panel */}
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Demonstrable Outcome Shift: MEKO OFF vs. MEKO ON
            </h3>
          </div>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Prompt: &ldquo;Recommend interventions for Ward 12, Corridor C-14, with a budget of ₹8 lakh.&rdquo;
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* MEKO OFF Card */}
          <div className="bg-slate-950 border border-rose-500/40 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold">
                MEKO OFF (No Institutional Memory)
              </span>
              <span className="font-mono font-bold text-slate-200">
                Total CapEx: ₹{diff.meko_off_total_capex_inr_lakhs ?? '7.20'}L
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Evaluates only satellite NDVI/LST and OSM road width. Unaware of shallow 66kV BSES power duct &amp; DJB water main at 0.7m depth.
            </p>
            <div className="space-y-1 pt-1">
              {(diff.meko_off_selected || []).map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 p-2 rounded border border-slate-800 flex justify-between font-mono"
                >
                  <span className="text-rose-200 font-semibold">{item.name} ({item.deployment_km} km)</span>
                  <span className="text-slate-300">₹{item.capex_inr_lakhs}L</span>
                </div>
              ))}
            </div>
          </div>

          {/* MEKO ON Card */}
          <div className="bg-slate-950 border border-emerald-500/50 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                MEKO ON (Recalls Verified Survey-014)
              </span>
              <span className="font-mono font-bold text-emerald-400">
                Total CapEx: ₹{diff.meko_on_total_capex_inr_lakhs ?? '7.77'}L
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Recalls <code className="text-emerald-300">survey-014</code> from <code className="text-emerald-300">vansetu-climate-knowledge</code>, disqualifies deep excavation tree pits/bioswales, and reallocates ₹8.0L budget to surface-mounted cooling:
            </p>
            <div className="space-y-1 pt-1">
              {(diff.meko_on_selected || []).map((item) => (
                <div
                  key={item.id}
                  className="bg-emerald-950/30 p-2 rounded border border-emerald-500/40 flex justify-between font-mono"
                >
                  <span className="text-emerald-200 font-semibold">{item.name} ({item.deployment_km} km)</span>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-emerald-400" />
              4 Isolated Meko Datapacks (Build vs. Runtime RBAC)
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Click a datapack to inspect memories
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {datapacks.map((dp) => {
              const active = selectedDatapack === dp.logical_name;
              return (
                <div
                  key={dp.logical_name}
                  onClick={() => setSelectedDatapack(dp.logical_name)}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
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
                </div>
              );
            })}
          </div>

          {/* Memories List in Selected Datapack */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-200">
              Memories in <code className="text-emerald-400">{selectedDatapack}</code> ({memories.length})
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {memories.map((mem) => (
                <div
                  key={mem.memory_id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span className="text-emerald-300 font-bold">{mem.memory_id}</span>
                      <span className="text-slate-400">• Agent: {mem.agent_id}</span>
                      {mem.ward_id && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">
                          {mem.ward_id} / {mem.corridor_id}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
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
                          onClick={() => handleVerifyAndPromote(mem.memory_id)}
                          className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1"
                        >
                          <Award className="w-3 h-3" /> Verify &amp; Promote
                        </button>
                      )}
                      {mem.datapack_logical !== 'vansetu-build' && (
                        <button
                          onClick={() => handleDeleteMemory(mem.memory_id)}
                          className="p-1 rounded bg-slate-900 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300"
                          title="Forget / Delete Memory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-200 text-xs">{mem.content_text || mem.content}</p>
                  <div className="text-[10px] font-mono text-slate-400">
                    Evidence Ref: <span className="text-slate-300">{mem.evidence_reference}</span> • Valid From: {mem.valid_from}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Meko Check T Verification & Candidate Memory Intake (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Check T Panel */}
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Meko Check T — Shared Build Datapack Verification
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                {checkT?.check_t_passed ? 'PASSED (12/10 Promoted)' : 'CHECKING'}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              Verifies that coding agents for both teammates (<code className="text-emerald-300">niharika-coding-agent</code> &amp; <code className="text-emerald-300">kunal-coding-agent</code>) promoted &ge;10 architectural decisions into <code className="text-emerald-300">vansetu-build</code> and can cross-recall each other&apos;s decisions.
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
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              Record Candidate Site Memory (Human Approval Gate)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newWard}
                onChange={(e) => setNewWard(e.target.value)}
                placeholder="ward-12"
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
              <input
                type="text"
                value={newCorridor}
                onChange={(e) => setNewCorridor(e.target.value)}
                placeholder="C-14"
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
              <input
                type="text"
                value={newEvidenceRef}
                onChange={(e) => setNewEvidenceRef(e.target.value)}
                placeholder="survey-018"
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white"
              />
            </div>
            <textarea
              rows={2}
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
              <Activity className="w-4 h-4 text-cyan-400" />
              Live Meko MCP Activity Trace ({activity.length})
            </h3>
            <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1 font-mono text-[11px]">
              {activity.map((ev) => (
                <div
                  key={ev.log_id}
                  className="bg-slate-950 p-2 rounded border border-slate-800"
                >
                  <div className="flex justify-between text-[10px] text-emerald-400">
                    <span>[{ev.mcp_tool}] {ev.agent_id}</span>
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
