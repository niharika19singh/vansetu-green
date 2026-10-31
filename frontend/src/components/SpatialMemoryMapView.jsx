import React, { useEffect, useState } from 'react';
import {
  Brain,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Users,
  XCircle,
  CheckCircle2,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Share2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

const CATEGORIES = [
  { id: 'ALL', label: 'All Categories' },
  { id: 'SITE_CONSTRAINT', label: 'Site Constraint', color: 'text-red-400 border-red-800 bg-red-950/40' },
  { id: 'COMMUNITY_FEEDBACK', label: 'Community Feedback', color: 'text-blue-400 border-blue-800 bg-blue-950/40' },
  { id: 'PAST_FAILURE', label: 'Past Failure', color: 'text-orange-400 border-orange-800 bg-orange-950/40' },
  { id: 'SUCCESSFUL_PRECEDENT', label: 'Successful Precedent', color: 'text-emerald-400 border-emerald-800 bg-emerald-950/40' },
  { id: 'REGULATORY_RESTRICTION', label: 'Regulatory', color: 'text-purple-400 border-purple-800 bg-purple-950/40' },
];

export default function SpatialMemoryMapView({ selectedCorridor }) {
  const corridorId = selectedCorridor?.code || selectedCorridor?.id || 'C-14';

  const [pins, setPins] = useState([]);
  const [selectedPin, setSelectedPin] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadPinsAndComparison = () => {
    setLoading(true);
    Promise.all([
      api.getSpatialMemoryPins(),
      api.getSpatialMemoryCorridorComparison(corridorId),
    ])
      .then(([pinsRes, compRes]) => {
        setPins(pinsRes.pins || []);
        if (pinsRes.pins?.length > 0 && !selectedPin) {
          setSelectedPin(pinsRes.pins[0]);
        }
        setComparison(compRes);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load spatial institutional memory');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPinsAndComparison();
  }, [corridorId]);

  const handleAction = (memoryId, action) => {
    let correctionText = null;
    if (action === 'CORRECT') {
      correctionText = prompt('Enter verified ground-truth correction:');
      if (!correctionText) return;
    }

    api
      .executeSpatialMemoryAction({
        memory_id: memoryId,
        action: action,
        actor_agent: 'municipal_reviewer',
        correction_text: correctionText,
      })
      .then((res) => {
        alert(res.message);
        loadPinsAndComparison();
      })
      .catch((err) => alert(err.message || 'Action failed'));
  };

  const filteredPins = pins.filter((p) => {
    if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Spatial Institutional Memory Map (YugabyteDB / Meko)
            </h1>
            <p className="text-xs text-slate-400">
              Georeferenced memory pins &bull; Wards &bull; Corridors &bull; Full Memory Lifecycle (Review, Approve, Correct, Promote, Forget)
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
                categoryFilter === cat.id
                  ? 'bg-purple-600 border-purple-500 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Querying Meko datapacks and assembling georeferenced spatial knowledge pins...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* MEKO ON vs. OFF Comparison Banner */}
            {comparison && (
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    MEKO Institutional Memory ON vs. OFF Decision Impact: {comparison.corridor_code}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      comparison.recommendation_diverged
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {comparison.recommendation_diverged ? 'RECOMMENDATION DIVERGED' : 'CONSISTENT'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* MEKO OFF */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1.5 opacity-80">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400 flex items-center gap-1.5">
                        <EyeOff className="w-3.5 h-3.5" /> MEKO OFF (Generic Satellite Model)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">0 Memories</span>
                    </div>
                    <div className="text-white font-medium text-xs">
                      {comparison.comparison.meko_off.primary_recommendation}
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {comparison.comparison.meko_off.risk_exposure}
                    </p>
                  </div>

                  {/* MEKO ON */}
                  <div className="p-3 bg-purple-950/30 rounded-lg border border-purple-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-300 flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-purple-400" /> MEKO ON (Shared Context Active)
                      </span>
                      <span className="text-[10px] text-purple-300 font-mono font-bold">
                        {comparison.comparison.meko_on.retrieved_memories_count} Memories Recalled
                      </span>
                    </div>
                    <div className="text-white font-bold text-xs">
                      {comparison.comparison.meko_on.primary_recommendation}
                    </div>
                    <p className="text-purple-200/80 text-[11px]">
                      {comparison.comparison.meko_on.decision_divergence_rationale}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Pins Grid & Detail View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left: Spatial Pins List */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>Georeferenced Memory Pins</span>
                  <span className="text-purple-400">{filteredPins.length} Pins</span>
                </div>

                <div className="space-y-2 max-h-[65vh] overflow-y-auto">
                  {filteredPins.map((pin) => {
                    const isSel = pin.memory_id === selectedPin?.memory_id;
                    return (
                      <div
                        key={pin.memory_id}
                        onClick={() => setSelectedPin(pin)}
                        className={`p-3 rounded-xl border cursor-pointer transition space-y-2 ${
                          isSel
                            ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500/50 shadow-lg'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className="text-xs font-bold"
                              style={{ color: pin.color || '#8b5cf6' }}
                            >
                              {pin.category_label}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {pin.corridor_code} ({pin.segment_id}) &bull; {pin.ward_id}
                            </div>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300">
                            {pin.verification_status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 line-clamp-2">{pin.summary}</p>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                          <span>By: {pin.author_teammate}</span>
                          <span>{pin.observation_date}</span>
                        </div>

                        {pin.is_synthetic_demo && (
                          <div className="text-[9px] text-amber-400 font-bold bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/40">
                            SYNTHETIC DEMONSTRATION SCENARIO
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Selected Memory Pin Detail & Lifecycle Controls */}
              <div className="lg:col-span-2 space-y-4">
                {selectedPin ? (
                  <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold"
                            style={{ color: selectedPin.color || '#8b5cf6' }}
                          >
                            {selectedPin.category_label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            [{selectedPin.memory_id}]
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Location: [{selectedPin.coordinates.lat}, {selectedPin.coordinates.lng}] &bull;{' '}
                          {selectedPin.corridor_code} &bull; {selectedPin.datapack_logical}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-1 rounded font-bold border ${
                          selectedPin.is_synthetic_demo
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {selectedPin.badge}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Field Observation Content
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">
                        {selectedPin.summary}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Author Agent</div>
                        <div className="font-bold text-white mt-0.5 truncate">{selectedPin.author_agent}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Teammate</div>
                        <div className="font-bold text-white mt-0.5">{selectedPin.author_teammate}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Verification</div>
                        <div className="font-bold text-emerald-400 mt-0.5">{selectedPin.verification_status}</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="text-[10px] text-slate-500 uppercase">Validity</div>
                        <div className="font-bold text-purple-400 mt-0.5">{selectedPin.validity_status}</div>
                      </div>
                    </div>

                    {/* Lifecycle Action Buttons */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Memory Lifecycle Controls (Meko Operations)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleAction(selectedPin.memory_id, 'APPROVE')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve &amp; Verify
                        </button>

                        <button
                          onClick={() => handleAction(selectedPin.memory_id, 'CORRECT')}
                          className="px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700 text-blue-300 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Edit className="w-3.5 h-3.5" /> Correct Observation
                        </button>

                        <button
                          onClick={() => handleAction(selectedPin.memory_id, 'PROMOTE')}
                          className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Promote to Global
                        </button>

                        <button
                          onClick={() => handleAction(selectedPin.memory_id, 'FORGET')}
                          className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Forget / Revoke
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400">
                    Select a memory pin to inspect field reality and manage lifecycle.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
