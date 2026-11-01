import React, { useEffect, useState } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingBag,
  Layers,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { api } from '../api/client';

const GATE_LABELS = {
  '1_CONCEPT_IDENTIFIED': '1. Concept Identified',
  '2_FEASIBILITY_ESTIMATED': '2. Feasibility Estimated',
  '3_SITE_SURVEY_COMPLETED': '3. Site Survey Completed',
  '4_STAKEHOLDER_APPROVED': '4. Stakeholder Approved',
  '5_PROCUREMENT_READY': '5. Procurement Ready',
  '6_CONTRACT_AWARDED': '6. Contract Awarded',
  '7_UNDER_EXECUTION': '7. Under Execution',
  '8_OPERATIONAL_MONITORING': '8. Operational Monitoring',
};

export default function ProjectReadinessView({ initialPortfolio, onNavigateToProcurement }) {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectPlan, setProjectPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadProjects = () => {
    setLoading(true);
    api
      .getReadinessProjects()
      .then((data) => {
        const list = data.projects || [];
        setProjects(list);
        if (list.length > 0) {
          setSelectedProjectId(list[0].project_id);
        } else {
          // Trigger sample creation
          return api.getReadinessProjectPlan('PROJ-SAMPLE').then((sample) => {
            setProjectPlan(sample);
            setSelectedProjectId(sample.project.project_id);
          });
        }
      })
      .then(() => setLoading(false))
      .catch((err) => {
        setError(err.message || 'Failed to load readiness projects');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (!selectedProjectId) return;
    api
      .getReadinessProjectPlan(selectedProjectId)
      .then((plan) => setProjectPlan(plan))
      .catch((err) => console.error(err));
  }, [selectedProjectId]);

  const handleAdvanceGate = (packageId, currentGate) => {
    const gates = projectPlan?.readiness_gates || [];
    const currIdx = gates.indexOf(currentGate);
    if (currIdx === -1 || currIdx >= gates.length - 1) {
      alert('This work package is already at the final readiness gate!');
      return;
    }
    const nextGate = gates[currIdx + 1];

    api
      .advanceReadinessPackageGate(packageId, { new_gate: nextGate })
      .then((updated) => setProjectPlan(updated))
      .catch((err) => alert(err.message || 'Failed to advance gate'));
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Climate Project Implementation &amp; Readiness Planner
            </h1>
            <p className="text-xs text-slate-400">
              8 Standard Municipal Work Packages (WP-1 to WP-8) &bull; 8 Readiness Gates &bull; IOMETE Procurement Linkage
            </p>
          </div>
        </div>

        {/* IOMETE Link */}
        <button
          onClick={() => {
            if (onNavigateToProcurement) onNavigateToProcurement();
          }}
          className="px-3 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition"
        >
          <ShoppingBag className="w-3.5 h-3.5" /> Open IOMETE Procurement Studio
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Loading municipal implementation work packages and readiness checklists...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && projectPlan && (
          <>
            {/* Overall Project Progress Header */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    {projectPlan.project.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Budget: <span className="text-emerald-400 font-bold font-mono">₹{projectPlan.project.budget_lakhs} Lakhs</span> &bull; Covering {projectPlan.project.corridor_count} Corridors ({projectPlan.project.corridor_codes?.join(', ')})
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                    Overall Project Readiness
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                    {projectPlan.overall_readiness_percentage}%
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, projectPlan.overall_readiness_percentage)}%` }}
                />
              </div>
            </div>

            {/* 8 Work Packages Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  8 Standard Municipal Work Packages (WP-1 to WP-8)
                </h3>
                <span className="text-xs text-slate-400">
                  {projectPlan.work_packages_count} Packages Defined
                </span>
              </div>

              <div className="space-y-3">
                {projectPlan.work_packages.map((pkg) => {
                  const gates = projectPlan.readiness_gates || [];
                  const currIdx = gates.indexOf(pkg.current_gate);
                  const isDone = currIdx === gates.length - 1;

                  return (
                    <div
                      key={pkg.package_id}
                      className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-300">
                              {pkg.code}
                            </span>
                            <span className="font-bold text-white text-sm">{pkg.name}</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            Lead Agency: <span className="text-slate-300 font-semibold">{pkg.lead_agency}</span> &bull; Estimated Duration: {pkg.duration_weeks} weeks
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-emerald-400 text-sm">
                            ₹{pkg.allocated_budget_lakhs} Lakhs
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold font-mono">
                            {GATE_LABELS[pkg.current_gate] || pkg.current_gate}
                          </span>
                        </div>
                      </div>

                      {/* Deliverables */}
                      <p className="text-xs text-slate-300">
                        <span className="text-slate-500 font-semibold">Deliverable: </span>
                        {pkg.deliverables}
                      </p>

                      {/* Gate Step Indicator & Advance Action */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-500 font-mono">
                          {gates.map((g, gIdx) => {
                            const isPassed = gIdx <= currIdx;
                            const isCurrent = gIdx === currIdx;
                            return (
                              <span
                                key={g}
                                className={`px-1.5 py-0.5 rounded ${
                                  isCurrent
                                    ? 'bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700'
                                    : isPassed
                                    ? 'text-emerald-500'
                                    : 'text-slate-600'
                                }`}
                              >
                                G{gIdx + 1}
                              </span>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => handleAdvanceGate(pkg.package_id, pkg.current_gate)}
                          disabled={isDone}
                          className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            isDone
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow'
                          }`}
                        >
                          {isDone ? 'Completed' : 'Advance Next Gate'}
                          {!isDone && <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* IOMETE Link Card */}
            <div className="p-4 bg-purple-950/20 border border-purple-900/50 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="font-bold text-purple-300">
                  IOMETE Climate Technology Procurement Studio Link
                </div>
                <p className="text-slate-400 text-[11px]">
                  Work packages WP-1 through WP-7 automatically export equipment specifications and tender questions to the IOMETE catalog.
                </p>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToProcurement) onNavigateToProcurement();
                }}
                className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition flex items-center gap-1.5"
              >
                Draft Municipal Tender RFP
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
