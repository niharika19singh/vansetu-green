import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  XCircle,
  Info,
  Thermometer,
  Wind,
  Layers,
  Activity,
  Compass,
} from 'lucide-react';

/**
 * 7-Step Municipal Climate Investment Decision Workflow (Section 3)
 */
export const DECISION_WORKFLOW_STEPS = [
  {
    step: 1,
    shortLabel: '1. Identify Priority',
    title: 'Identify Climate Priority',
    detail: 'Screen 50 urban corridors across thermal, vegetation, AQI, and pedestrian indicators.',
    targetView: 'explorer',
    targetTab: 'rankings',
  },
  {
    step: 2,
    shortLabel: '2. Evidence Quality',
    title: 'Understand Evidence Quality',
    detail: 'Inspect native vs. display resolution, CRS, sensor freshness, and confidence deductions.',
    targetView: 'explorer',
    targetTab: 'analytics',
  },
  {
    step: 3,
    shortLabel: '3. Site Feasibility',
    title: 'Evaluate Site Feasibility',
    detail: 'Distinguish OSM width estimates from required utility/GPR field surveys and Meko constraints.',
    targetView: 'meko',
  },
  {
    step: 4,
    shortLabel: '4. Compare Options',
    title: 'Compare Alternative Interventions',
    detail: 'Evaluate 5 GreenTech archetypes with CPWD DSR 2023 CapEx and 5-year OpEx breakdowns.',
    targetView: 'explorer',
    targetTab: 'interventions',
  },
  {
    step: 5,
    shortLabel: '5. Allocate Budget',
    title: 'Allocate Municipal Budget (MILP)',
    detail: 'Run deterministic Mixed-Integer Linear Programming under hard fiscal and site constraints.',
    targetView: 'optimizer',
  },
  {
    step: 6,
    shortLabel: '6. Explain Trade-Offs',
    title: 'Explain Cost, Equity & Trade-Offs',
    detail: 'Review grounded multi-tool AI synthesis, equity distribution, and procurement RFP specs.',
    targetView: 'agent',
  },
  {
    step: 7,
    shortLabel: '7. Preserve Memory',
    title: 'Preserve Institutional Knowledge',
    detail: 'Store verified field findings in Meko datapacks and monitor temporal outcomes.',
    targetView: 'temporal',
  },
];

/**
 * Feasibility & Engineering Uncertainty Status Definitions (Section 6D)
 */
export const FEASIBILITY_STATUS_META = {
  FEASIBLE_ESTIMATE: {
    code: 'FEASIBLE_ESTIMATE',
    label: 'FEASIBLE_ESTIMATE',
    humanLabel: 'Feasible (Desktop Estimate)',
    description:
      'OSM road classification and corridor geometry indicate likely physical fit; pre-construction field verification still required.',
    className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    Icon: CheckCircle2,
  },
  FIELD_VERIFICATION_REQUIRED: {
    code: 'FIELD_VERIFICATION_REQUIRED',
    label: 'FIELD_VERIFICATION_REQUIRED',
    humanLabel: 'Field Verification Required',
    description:
      'Road width is estimated from OSM highway class (~ROW proxy). Subsurface GPR utility clearance and soil pit tests are pending.',
    className: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    Icon: AlertTriangle,
  },
  CONSTRAINT_IDENTIFIED: {
    code: 'CONSTRAINT_IDENTIFIED',
    label: 'CONSTRAINT_IDENTIFIED',
    humanLabel: 'Subsurface Constraint Identified',
    description:
      'Recalled institutional memory or site record identifies an engineering restriction (e.g., shallow utility duct) limiting deep excavation.',
    className: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    Icon: ShieldAlert,
  },
  NOT_FEASIBLE: {
    code: 'NOT_FEASIBLE',
    label: 'NOT_FEASIBLE',
    humanLabel: 'Not Feasible for Site',
    description:
      'Disqualified by hard subsurface utility conflict, insufficient right-of-way width, or structural load constraint.',
    className: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    Icon: XCircle,
  },
};

/**
 * Derives an honest engineering feasibility status code for a corridor or intervention.
 */
export function deriveCorridorFeasibilityStatus(corridor, mekoEnabled = true) {
  if (!corridor) return 'FIELD_VERIFICATION_REQUIRED';
  const code = String(corridor.code || '');
  if (mekoEnabled && code === 'C-14') {
    return 'CONSTRAINT_IDENTIFIED';
  }
  const feas = Number(corridor.feasibility_score ?? 0.72);
  if (feas < 0.45) {
    return 'NOT_FEASIBLE';
  }
  if (feas < 0.76) {
    return 'FIELD_VERIFICATION_REQUIRED';
  }
  return 'FEASIBLE_ESTIMATE';
}

export function deriveInterventionFeasibilityStatus(
  intervention,
  corridor,
  mekoEnabled = true
) {
  if (!intervention) return 'FIELD_VERIFICATION_REQUIRED';
  const code = String(corridor?.code || '');
  const intId = String(intervention.id || intervention.intervention_id || '');
  if (
    mekoEnabled &&
    code === 'C-14' &&
    (intId === 'linear_street_trees' || intId === 'roadside_bioswales')
  ) {
    return 'NOT_FEASIBLE';
  }
  const suit = Number(intervention.suitability_score ?? 0.75);
  if (suit < 0.45) return 'NOT_FEASIBLE';
  if (suit < 0.78) return 'FIELD_VERIFICATION_REQUIRED';
  return 'FEASIBLE_ESTIMATE';
}

export function FeasibilityStatusBadge({ status = 'FIELD_VERIFICATION_REQUIRED', compact = false }) {
  const meta =
    FEASIBILITY_STATUS_META[status] || FEASIBILITY_STATUS_META.FIELD_VERIFICATION_REQUIRED;
  const IconComp = meta.Icon;

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono rounded border px-1.5 py-0.5 text-[10px] font-semibold ${meta.className}`}
      title={`${meta.humanLabel}: ${meta.description}`}
      aria-label={`Feasibility status: ${meta.label} — ${meta.humanLabel}`}
    >
      <IconComp className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{compact ? meta.label : `${meta.label}`}</span>
    </span>
  );
}

/**
 * Temporal Data Classification Badge (Section 11)
 * Distinguishes LIVE DATA, HISTORICAL DATA, and SIMULATED DATA
 */
export function TemporalDataBadge({ isSimulated = true, isLive = false }) {
  if (isLive && !isSimulated) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
        title="Live telemetry ingested from active CPCB / WAQI sensor feed"
      >
        <Activity className="w-3 h-3" aria-hidden="true" />
        LIVE DATA
      </span>
    );
  }
  if (!isSimulated) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40"
        title="Verified historical satellite composite or reference station baseline"
      >
        <Layers className="w-3 h-3" aria-hidden="true" />
        HISTORICAL DATA
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
      title="Phenology-calibrated daily time-series anchored to real Sentinel-2/MODIS raster baselines (is_simulated=true)"
    >
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
      SIMULATED DATA
    </span>
  );
}

/**
 * Synthetic Demonstration Scenario Disclosure Badge (Section 9)
 */
export function SyntheticScenarioBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40"
      title="Controlled demonstration record seeded to prove Meko ON vs. OFF constraint enforcement; not an official municipal survey filing."
    >
      <Info className="w-3 h-3 shrink-0" aria-hidden="true" />
      SYNTHETIC DEMONSTRATION SCENARIO
    </span>
  );
}

/**
 * Research-Backed 3-Tier Thermal & Human Heat Stress Separation Card (Section 6A)
 * Separates:
 * 1. Surface Heat Indicator (Satellite Land Surface Temperature - LST)
 * 2. Environmental Heat Exposure Evidence (NDVI, AQI, Pedestrian Proxy)
 * 3. Human Heat Stress Assessment (UTCI / WBGT - Not available without 2m meteorological sensors)
 */
export function ThermalSeparationCard({ corridor }) {
  if (!corridor) return null;
  const pedestrianProxy = corridor.calculation_breakdown?.normalized_inputs?.pedestrian;

  return (
    <div
      className="bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2.5"
      role="region"
      aria-label="Scientific Separation of Surface Temperature and Human Heat Stress"
    >
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
          <Thermometer className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
          Thermal Evidence Architecture: Surface LST vs. Human Heat Stress
        </span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
          Scientific Disambiguation
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 text-[11px]">
        {/* Tier 1: Surface Heat Indicator */}
        <div className="bg-slate-900/90 border border-orange-500/30 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-orange-300 text-[11px]">
              1. Surface Heat Indicator (Satellite Land Surface Temperature — LST)
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300 border border-orange-500/30">
              MEASURED SATELLITE SKIN TEMP
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3 font-mono text-xs pt-0.5">
            <span>
              Native 1,000m Pixel:{' '}
              <strong className="text-orange-400">{corridor.lst_native_mean}°C</strong>
            </span>
            <span>
              10m Display Grid:{' '}
              <strong className="text-amber-300">
                {corridor.lst_mean}°C (Max {corridor.lst_max}°C)
              </strong>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            MODIS Terra MOD11A2 measures radiometric surface skin temperature of roofs, tree canopy, and asphalt at 1km native resolution. It does <strong>not</strong> directly measure street-level air temperature or pedestrian physiological heat strain.
          </p>
        </div>

        {/* Tier 2: Environmental Heat Exposure Evidence */}
        <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 text-[11px]">
              2. Environmental Heat Exposure Evidence (Canopy, Air Quality &amp; Footfall Proxy)
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              10m NDVI + CPCB + OSM PROXY
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3 font-mono text-xs pt-0.5">
            <span>
              Sentinel-2 NDVI (10m):{' '}
              <strong className="text-emerald-400">{corridor.ndvi_mean}</strong> (Deficit:{' '}
              {corridor.green_deficit})
            </span>
            <span>
              AQI:{' '}
              <strong className="text-yellow-400">
                {corridor.aqi} ({corridor.aqi_distance_km} km)
              </strong>
            </span>
            <span>
              Pedestrian Exposure Proxy:{' '}
              <strong className="text-sky-300">
                {pedestrianProxy !== null && pedestrianProxy !== undefined
                  ? `${(pedestrianProxy * 100).toFixed(0)}/100`
                  : 'Missing'}
              </strong>
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Combines true 10m Sentinel-2 vegetation reflectance, nearest CPCB station particulate burden, and OSM road-hierarchy/transit proximity as an exposure proxy.
          </p>
        </div>

        {/* Tier 3: Human Heat Stress Assessment (UTCI / WBGT) */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 text-[11px] flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-sky-400" aria-hidden="true" />
              3. Human Heat Stress Assessment (UTCI / WBGT Physiological Index)
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30 font-semibold">
              Not available
            </span>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            <strong>Status: Not available</strong> in current satellite-only baseline. Computing Universal Thermal Climate Index (UTCI) or Wet-Bulb Globe Temperature (WBGT) requires street-level meteorological telemetry not present in satellite rasters:{' '}
            <span className="font-mono text-amber-200">
              2m air temperature (Ta), relative humidity (RH%), 10m wind speed (Va), and mean radiant temperature (Tmrt)
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
