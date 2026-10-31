import React, { useEffect, useState } from 'react';
import {
  Activity,
  Trees,
  Thermometer,
  Wind,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { api } from '../api/client';

const STATUS_CONFIG = {
  PLANNED: {
    label: 'Planned',
    color: 'bg-blue-950/80 text-blue-300 border-blue-800',
    icon: Clock,
  },
  UNDER_CONSTRUCTION: {
    label: 'Under Construction',
    color: 'bg-amber-950/80 text-amber-300 border-amber-800',
    icon: Wrench,
  },
  OPERATIONAL: {
    label: 'Operational',
    color: 'bg-emerald-950/80 text-emerald-300 border-emerald-800',
    icon: CheckCircle2,
  },
  MAINTENANCE_REQUIRED: {
    label: 'Maintenance Required',
    color: 'bg-rose-950/80 text-rose-300 border-rose-800',
    icon: AlertTriangle,
  },
};

export default function ImpactMonitoringView() {
  const [deployments, setDeployments] = useState([]);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(null);
  const [deploymentDetail, setDeploymentDetail] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadRegistry = () => {
    setLoading(true);
    api
      .getImpactRegistry()
      .then((data) => {
        setDeployments(data.deployments || []);
        if (data.deployments?.length > 0 && !selectedDeploymentId) {
          setSelectedDeploymentId(data.deployments[0].id);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load impact monitoring registry');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRegistry();
  }, []);

  useEffect(() => {
    if (!selectedDeploymentId) return;
    setDetailLoading(true);
    api
      .getImpactDeployment(selectedDeploymentId)
      .then((data) => {
        setDeploymentDetail(data);
        setDetailLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setDetailLoading(false);
      });
  }, [selectedDeploymentId]);

  const handleUpdateStatus = (newStatus) => {
    if (!selectedDeploymentId) return;
    api
      .updateImpactStatus(selectedDeploymentId, {
        lifecycle_status: newStatus,
        notes: `Status transitioned to ${newStatus} via municipal monitoring desk`,
      })
      .then(() => {
        loadRegistry();
      })
      .catch((err) => alert(err.message || 'Failed to update status'));
  };

  const filteredDeployments = deployments.filter((d) => {
    if (statusFilter !== 'ALL' && d.lifecycle_status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden text-slate-200">
      {/* Top Banner */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              Climate Intervention Impact Monitoring
            </h1>
            <p className="text-xs text-slate-400">
              Persistent 4-stage lifecycle registry &bull; Empirical before-after deltas &bull; Paired control corridors &bull; Non-causal attribution
            </p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 flex items-center gap-1 font-semibold">
            <Filter className="w-3.5 h-3.5" /> Stage:
          </span>
          {['ALL', 'PLANNED', 'UNDER_CONSTRUCTION', 'OPERATIONAL', 'MAINTENANCE_REQUIRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded border text-[11px] font-medium transition ${
                statusFilter === st
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL' ? 'All Stages' : STATUS_CONFIG[st]?.label || st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center py-20 text-slate-400">
            Connecting to persistent SQLite intervention registry and loading observation deltas...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left: Deployments List */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                <span>Intervention Deployments</span>
                <span className="text-emerald-400">{filteredDeployments.length} Records</span>
              </div>

              <div className="space-y-2 max-h-[75vh] overflow-y-auto">
                {filteredDeployments.map((dep) => {
                  const isSel = dep.id === selectedDeploymentId;
                  const cfg = STATUS_CONFIG[dep.lifecycle_status] || STATUS_CONFIG.PLANNED;
                  const Icon = cfg.icon;

                  return (
                    <div
                      key={dep.id}
                      onClick={() => setSelectedDeploymentId(dep.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition space-y-2 ${
                        isSel
                          ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/50 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">{dep.archetype}</div>
                          <div className="text-[11px] text-slate-400">
                            {dep.corridor_code} - {dep.corridor_name}
                          </div>
                        </div>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded border font-bold flex items-center gap-1 font-mono ${cfg.color}`}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        <span>CapEx: ₹{dep.capex_inr_lakhs}L</span>
                        <span>{dep.units_deployed} units deployed</span>
                      </div>

                      {dep.is_synthetic_demo && (
                        <div className="text-[9px] text-amber-400 font-bold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                          SYNTHETIC DEMONSTRATION SCENARIO
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Selected Deployment Detail & Empirical Deltas */}
            <div className="lg:col-span-2 space-y-4">
              {detailLoading && (
                <div className="text-center py-20 text-slate-400">
                  Loading deployment before-and-after empirical telemetry...
                </div>
              )}

              {!detailLoading && deploymentDetail && (
                <>
                  {/* Deployment Header */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white">
                          {deploymentDetail.deployment.archetype}
                        </h2>
                        <span className="font-mono text-xs text-slate-400">
                          [{deploymentDetail.deployment.id}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Corridor {deploymentDetail.deployment.corridor_code} &bull; {deploymentDetail.deployment.district} &bull; Planned: {deploymentDetail.deployment.planned_date}
                      </p>
                    </div>

                    {/* Status Changer */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-semibold">Change Stage:</span>
                      <select
                        value={deploymentDetail.deployment.lifecycle_status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs text-white px-2.5 py-1.5 rounded-lg"
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="UNDER_CONSTRUCTION">Under Construction</option>
                        <option value="OPERATIONAL">Operational</option>
                        <option value="MAINTENANCE_REQUIRED">Maintenance Required</option>
                      </select>
                    </div>
                  </div>

                  {/* Empirical Deltas Cards */}
                  <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-3">
                    <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                      Empirical Before vs. After Delta Comparison
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* NDVI Delta */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                          <Trees className="w-3 h-3 text-emerald-400" />
                          NDVI Canopy Delta
                        </span>
                        <div className="text-xl font-bold font-mono text-emerald-400">
                          {deploymentDetail.empirical_deltas.ndvi_change !== null
                            ? `+${deploymentDetail.empirical_deltas.ndvi_change}`
                            : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">Sentinel-2 10m surface reflectance</div>
                      </div>

                      {/* LST Delta */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-amber-400" />
                          Radiometric LST Delta
                        </span>
                        <div className="text-xl font-bold font-mono text-amber-400">
                          {deploymentDetail.empirical_deltas.lst_celsius_change !== null
                            ? `${deploymentDetail.empirical_deltas.lst_celsius_change}°C`
                            : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">Surface skin temperature</div>
                      </div>

                      {/* AQI Delta */}
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                          <Wind className="w-3 h-3 text-sky-400" />
                          PM2.5 Delta
                        </span>
                        <div className="text-xl font-bold font-mono text-sky-400">
                          {deploymentDetail.empirical_deltas.pm25_change !== null
                            ? `${deploymentDetail.empirical_deltas.pm25_change} µg/m³`
                            : 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500">CPCB monitoring station</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300">
                      {deploymentDetail.empirical_deltas.interpretation}
                    </p>
                  </div>

                  {/* Paired Control Corridor Comparison */}
                  {deploymentDetail.control_corridor_comparison && (
                    <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-2">
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        Paired Untreated Control Corridor (Difference-in-Differences)
                      </h4>
                      <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-white">
                            {deploymentDetail.control_corridor_comparison.control_code} - {deploymentDetail.control_corridor_comparison.control_name}
                          </span>
                          <span className="text-slate-400">
                            {deploymentDetail.control_corridor_comparison.district}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          {deploymentDetail.control_corridor_comparison.untreated_baseline_comparison}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Non-Causal Attribution Guardrail */}
                  <div className="p-3.5 bg-slate-900/40 rounded-xl border border-slate-800 text-xs space-y-1 text-slate-400">
                    <span className="font-bold text-slate-300">Non-Causal Attribution Honesty: </span>
                    <p className="text-[11px] leading-relaxed">
                      {deploymentDetail.attribution_honesty_disclaimer}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
