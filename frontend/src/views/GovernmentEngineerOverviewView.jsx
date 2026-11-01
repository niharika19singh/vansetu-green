import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Ruler,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Layers,
  MapPin,
  Trees,
  Sun,
  FileCheck2,
  Calendar,
  Activity,
  Droplets,
  HardHat,
} from 'lucide-react';
import { api } from '../api/client';
import StatCard from '../components/ui/StatCard';
import StatusBadge from '../components/ui/StatusBadge';

export default function GovernmentEngineerOverviewView({
  token,
  corridors = [],
  onNavigate,
  onSelectCorridor,
}) {
  const [selectedInspectionCorridor, setSelectedInspectionCorridor] = useState('C-14');
  const [engineeringData, setEngineeringData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await api.getCorridorEngineering(selectedInspectionCorridor, token);
        if (mounted) setEngineeringData(res);
      } catch (err) {
        console.warn('Failed loading engineering profile', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, [selectedInspectionCorridor, token]);

  // Mock list of 8 corridors currently assigned for field inspection
  const assignedCorridors = [
    { id: 'C-14', name: 'Lal Bahadur Shastri Marg', district: 'South', length: '11.2 km', priority: 'High', status: 'INSPECTION_PENDING', roadClass: 'Primary Arterial', row: '45m' },
    { id: 'C-01', name: 'Outer Ring Road (Nehru Place)', district: 'South', length: '14.5 km', priority: 'Critical', status: 'INSPECTION_PENDING', roadClass: 'Trunk Arterial', row: '45m' },
    { id: 'C-08', name: 'Mehrauli-Gurgaon (MG) Road', district: 'South', length: '8.4 km', priority: 'High', status: 'FEASIBILITY_VERIFIED', roadClass: 'Major Arterial', row: '35m' },
    { id: 'C-22', name: 'Vikas Marg (Laxmi Nagar)', district: 'East', length: '6.2 km', priority: 'High', status: 'INSPECTION_PENDING', roadClass: 'Primary Arterial', row: '30m' },
    { id: 'C-05', name: 'Barakhamba Road', district: 'New Delhi', length: '3.1 km', priority: 'Moderate', status: 'FEASIBILITY_VERIFIED', roadClass: 'Commercial Spine', row: '30m' },
    { id: 'C-19', name: 'GT Karnal Road Spine', district: 'North', length: '16.0 km', priority: 'Critical', status: 'INSPECTION_PENDING', roadClass: 'National Highway', row: '60m' },
    { id: 'C-31', name: 'Najafgarh Road (Uttam Nagar)', district: 'West', length: '9.8 km', priority: 'High', status: 'INSPECTION_PENDING', roadClass: 'Primary Arterial', row: '35m' },
    { id: 'C-12', name: 'Mathura Road (Ashram - Badarpur)', district: 'South East', length: '12.4 km', priority: 'Critical', status: 'CONSTRAINED_UTILITIES', roadClass: 'Primary Arterial', row: '45m' },
  ];

  const pendingCount = assignedCorridors.filter(c => c.status === 'INSPECTION_PENDING').length;
  const verifiedCount = assignedCorridors.filter(c => c.status === 'FEASIBILITY_VERIFIED').length;

  return (
    <div className="h-full overflow-y-auto bg-[#071C16] p-4 md:p-6 space-y-6 text-slate-100 font-body">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/80 via-[#0D2821] to-[#071C16] border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5 text-amber-400" />
                MUNICIPAL INFRASTRUCTURE &amp; FIELD ENGINEERING WORKSPACE
              </span>
              <span className="text-slate-400 text-xs hidden sm:inline">Delhi PWD Civil Maintenance Division</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Engineering Feasibility &amp; Physical Validation Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Verify actual road geometry, calculate Right-of-Way under IRC:SP:73, evaluate sidewalk widths under IRC:103,
              inspect underground utility conflicts, and submit accredited field surveys for contractor tenders.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate && onNavigate('corridor_engineering')}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg"
            >
              <Wrench className="w-4 h-4" />
              <span>Open Engineering Suite</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Engineering KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Field Corridors"
          value={assignedCorridors.length}
          subtitle="Zonal Maintenance Roster"
          icon={Layers}
          color="amber"
        />
        <StatCard
          title="Pending Physical Surveys"
          value={pendingCount}
          subtitle="Trial Pit & Width Audits"
          icon={Clock}
          color="rose"
        />
        <StatCard
          title="Feasibility Approved"
          value={verifiedCount}
          subtitle="Cleared for Tender Packaging"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="IRC:103 Sidewalk Ratio"
          value="72.4%"
          subtitle="≥1.80m Clear Width Standard"
          icon={Ruler}
          color="blue"
        />
      </div>

      {/* Main Grid: Assigned Corridors Queue & Detailed Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Assigned Corridors Inspection Queue */}
        <div className="lg:col-span-7 bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <HardHat className="w-4 h-4 text-amber-400" />
                Physical Inspection &amp; Engineering Roster
              </h2>
              <span className="text-[11px] font-mono text-slate-400">8 Active Packages</span>
            </div>
            <p className="text-xs text-slate-400">
              Corridors awaiting road cross-section verification and utility trial pit inspections.
            </p>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {assignedCorridors.map((c) => {
              const isSelected = selectedInspectionCorridor === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedInspectionCorridor(c.id)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-400 shadow-md'
                      : 'bg-[#071C16] border-emerald-500/15 hover:border-emerald-500/30'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-amber-300 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {c.id}
                      </span>
                      <span className="text-xs font-bold text-white">{c.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-3">
                      <span>{c.district} Delhi</span>
                      <span>Length: {c.length}</span>
                      <span>RoW: {c.row}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      c.status === 'FEASIBILITY_VERIFIED'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : c.status === 'CONSTRAINED_UTILITIES'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {c.status.replace('_', ' ')}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate('corridor_engineering');
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white"
                      title="Inspect Engineering Data"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Inspections follow IRC:SP:73 standard guidelines</span>
            <button
              onClick={() => onNavigate && onNavigate('corridor_engineering')}
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              <span>Launch Field Measurement Form</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column (5 cols): Selected Corridor Engineering Feasibility Snapshot */}
        <div className="lg:col-span-5 bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {selectedInspectionCorridor} Engineering Audit
              </span>
              <span className="text-xs text-emerald-400 font-bold">FEASIBILITY: 88%</span>
            </div>
            <h3 className="text-sm font-bold text-white">Physical Cross-Section Specifications</h3>
          </div>

          {engineeringData ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-[#071C16] p-3 rounded-xl border border-emerald-500/10 font-mono text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Standard RoW</span>
                  <strong className="text-white">{engineeringData.engineering_specifications?.standard_right_of_way_m}m</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Carriageway</span>
                  <strong className="text-white">{engineeringData.engineering_specifications?.estimated_carriageway_width_m}m</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Sidewalk Width</span>
                  <strong className="text-teal-300">{engineeringData.engineering_specifications?.estimated_pedestrian_sidewalk_m}m</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Green Verge</span>
                  <strong className="text-emerald-300">{engineeringData.engineering_specifications?.green_verge_available_m}m</strong>
                </div>
              </div>

              {/* Utility Clearances */}
              <div className="space-y-1.5 p-3 rounded-xl bg-[#071C16] border border-emerald-500/10">
                <div className="font-bold text-white text-[11px] flex items-center justify-between">
                  <span>Subsurface Utility Clashes</span>
                  <span className="text-emerald-400 text-[10px]">NO CRITICAL CONFLICTS</span>
                </div>
                <div className="text-[10px] text-slate-300 space-y-1">
                  <div>⚡ Power: {engineeringData.feasibility_checklist?.underground_power_clearance}</div>
                  <div>💧 Water: {engineeringData.feasibility_checklist?.water_mains_clearance}</div>
                  <div>🚰 STP Recycled Water Line: ~{engineeringData.feasibility_checklist?.recycled_water_distance_m}m distance</div>
                </div>
              </div>

              {/* Shade Gap Identification */}
              <div className="space-y-1 p-3 rounded-xl bg-[#071C16] border border-emerald-500/10">
                <div className="font-bold text-amber-300 text-[11px] flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Identified Pedestrian Shade Gaps</span>
                </div>
                <div className="text-[10px] text-slate-300">
                  {engineeringData.shade_gap_bridges?.[0]?.chainage_km} (300m gap) — Requires tree plantation at 8m c/c.
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Loading engineering specifications...
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onNavigate && onNavigate('corridor_engineering')}
              className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Submit Measured Road Dimensions</span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('evidence_passport')}
              className="w-full py-2 rounded-xl bg-[#071C16] hover:bg-white/5 border border-emerald-500/30 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-teal-400" />
              <span>View Evidence Dossier</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Engineering Validation Tools */}
      <div className="bg-[#0D2821] border border-emerald-500/20 rounded-2xl p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-white">Engineering Validation &amp; Analysis Workflows</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => onNavigate && onNavigate('shade')}
            className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 hover:border-amber-500/50 transition text-left space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-amber-300">Pedestrian Shade Continuity</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400">Identify unshaded gaps and calculate tree spacing.</p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('corridor_cost_approval')}
            className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 hover:border-amber-500/50 transition text-left space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-amber-300">Material &amp; CapEx Estimation</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400">Estimate tree guards, curb cutting, and soil excavation costs.</p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('canopy')}
            className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 hover:border-amber-500/50 transition text-left space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-amber-300">Canopy &amp; Hydrology</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400">Rainwater infiltration trenches and bioretention swales.</p>
          </button>

          <button
            onClick={() => onNavigate && onNavigate('studio')}
            className="p-4 rounded-xl bg-[#071C16] border border-emerald-500/20 hover:border-amber-500/50 transition text-left space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs group-hover:text-amber-300">Intervention Design</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400">Select Right-Tree-Right-Place native species configurations.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
