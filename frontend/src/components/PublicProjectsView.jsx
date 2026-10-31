import React, { useState, useEffect } from 'react';
import { Trees, CheckCircle2, Clock, ShieldCheck, MapPin, Sparkles } from 'lucide-react';
import { api } from '../api/client';

export default function PublicProjectsView({ corridors = [], onNavigate }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadPublicProjects() {
      setLoading(true);
      try {
        const res = await api.listCorridorAssignments({}, null);
        if (mounted) {
          setAssignments(res.assignments || []);
        }
      } catch (err) {
        console.error('Failed to load public project updates', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadPublicProjects();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 shrink-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
            PUBLIC WORKS TRANSPARENCY
          </span>
          <h1 className="text-lg font-bold text-white">NCT Delhi Climate Greening Projects</h1>
        </div>
        <p className="text-xs text-slate-400">
          Public status tracking of pedestrian shade corridors, native tree planting, and urban cool
          zones.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((proj) => {
            const corr = corridors.find((c) => (c.code || c.id) === proj.corridor_id);
            return (
              <div
                key={proj.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-emerald-500/40 transition shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {proj.corridor_id}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {corr?.name || `Corridor ${proj.corridor_id} Pedestrian Spine`}
                    </h3>
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {proj.status}
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>
                    District: {corr?.district || 'Central'} • Length: {corr?.length_km || 1.8} km
                  </span>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-850 leading-relaxed">
                  {proj.deliverables_notes ||
                    'Comprehensive pedestrian greening, shade tree canopy restoration, and bioswales.'}
                </p>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Sanctioned Under Municipal Plan</span>
                  <span className="text-emerald-400 font-bold">Public Climate Action</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
