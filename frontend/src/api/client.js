/**
 * VanSetu — Urban Climate Action Intelligence REST API Client
 * Connects the React + Vite frontend to the FastAPI geospatial, MILP optimizer,
 * Meko memory, Gemini 3.8 Flash agent, Tiger Data, Social Equity, and IOMETE Procurement backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860';

async function requestJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      detail = errJson.detail || detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }
  return response.json();
}

export function getTileUrl(layer, z = '{z}', x = '{x}', y = '{y}') {
  return `${API_BASE}/api/tiles/${layer}/${z}/${x}/${y}.png`;
}

export const api = {
  getHealth: () => requestJson('/api/health'),
  getProvenance: () => requestJson('/api/provenance'),
  getLayers: () => requestJson('/api/layers'),
  getTileLegend: (layer) => requestJson(`/api/tiles/${layer}/legend`),
  getStatsSummary: () => requestJson('/api/stats/summary'),
  inspectPoint: (lat, lng) =>
    requestJson(`/api/stats/point?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`),

  getCorridors: ({ district, scenario = 'baseline', heatWeight = null } = {}) => {
    const params = new URLSearchParams();
    if (district && district !== 'All Districts') params.set('district', district);
    if (scenario) params.set('scenario', scenario);
    if (heatWeight !== null && heatWeight !== undefined) {
      params.set('heat_weight', String(heatWeight));
    }
    return requestJson(`/api/corridors?${params.toString()}`);
  },

  getCorridorDetail: (corridorId, scenario = 'baseline') =>
    requestJson(`/api/corridors/${encodeURIComponent(corridorId)}?scenario=${encodeURIComponent(scenario)}`),

  getScenarios: () => requestJson('/api/corridors/scenarios'),

  getSensitivityAnalysis: (scenario = 'baseline', district = null) => {
    const params = new URLSearchParams({ scenario });
    if (district && district !== 'All Districts') params.set('district', district);
    return requestJson(`/api/corridors/sensitivity?${params.toString()}`);
  },

  getDistrictsSummary: (scenario = 'baseline') =>
    requestJson(`/api/corridors/districts?scenario=${encodeURIComponent(scenario)}`),

  getRasterZones: (percentile = 85.0) =>
    requestJson(`/api/corridors/raster-zones?percentile=${encodeURIComponent(percentile)}`),

  getInterventionsCatalog: () => requestJson('/api/interventions/catalog'),

  getAqiStations: () => requestJson('/api/aqi/stations'),
  getAqiSummary: () => requestJson('/api/aqi/summary'),

  // Phase 2.4: MILP Budget Optimizer
  getOptimizerPresets: () => requestJson('/api/optimizer/presets'),
  runOptimizer: (payload) =>
    requestJson('/api/optimizer/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Phase 3: YugabyteDB / Meko Institutional Memory
  getMekoDatapacks: () => requestJson('/api/meko/datapacks'),
  getMekoMemories: ({ agentId = 'climate_planner_agent', datapackId = '', corridorId = '', wardId = '', onlyVerified = false } = {}) => {
    const params = new URLSearchParams({ agent_id: agentId });
    if (datapackId) params.set('datapack_id', datapackId);
    if (corridorId) params.set('corridor_id', corridorId);
    if (wardId) params.set('ward_id', wardId);
    if (onlyVerified) params.set('only_verified', 'true');
    return requestJson(`/api/meko/memories?${params.toString()}`);
  },
  addMekoMemory: (payload) =>
    requestJson('/api/meko/memories/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  promoteMekoMemory: (memoryId, payload) =>
    requestJson(`/api/meko/memories/${encodeURIComponent(memoryId)}/promote`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMekoMemory: (memoryId, payload) =>
    requestJson(`/api/meko/memories/${encodeURIComponent(memoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  deleteMekoMemory: (memoryId, agentId = 'climate_planner_agent') =>
    requestJson(`/api/meko/memories/${encodeURIComponent(memoryId)}?agent_id=${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
    }),
  runMekoWorkflow: (payload) =>
    requestJson('/api/meko/workflow', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  compareMekoOnOff: ({ corridorId = 'C-14', wardId = 'ward-12', budgetLakh = 8.0 } = {}) =>
    requestJson(
      `/api/meko/compare-on-off?corridor_id=${encodeURIComponent(corridorId)}&ward_id=${encodeURIComponent(wardId)}&budget_lakh=${encodeURIComponent(budgetLakh)}`
    ),
  getMekoActivity: (limit = 35) => requestJson(`/api/meko/activity?limit=${limit}`),
  getMekoCheckT: () => requestJson('/api/meko/check-t'),

  // Phase 4: Google Gemini 3.8 Flash Multi-Tool Agent
  getAgentTools: () => requestJson('/api/agent/tools'),
  runAgentPlan: (payload) =>
    requestJson('/api/agent/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  invokeAgentTool: (toolName, args = {}) =>
    requestJson('/api/agent/invoke-tool', {
      method: 'POST',
      body: JSON.stringify({ tool_name: toolName, arguments: args }),
    }),

  // Phase 5: Tiger Data (TimescaleDB) Temporal Intelligence
  getTemporalSchema: () => requestJson('/api/temporal/schema'),
  getTemporalTrends: (corridorId = 'C-14') =>
    requestJson(`/api/temporal/trends/${encodeURIComponent(corridorId)}`),
  getTemporalDailySummary: (corridorId = 'C-14', metric = 'lst_celsius', days = 30) =>
    requestJson(
      `/api/temporal/daily-summary?corridor_id=${encodeURIComponent(corridorId)}&metric=${encodeURIComponent(metric)}&days=${days}`
    ),
  getTemporalComparison: (corridorId = 'C-14', metric = 'lst_celsius') =>
    requestJson(
      `/api/temporal/comparison?corridor_id=${encodeURIComponent(corridorId)}&metric=${encodeURIComponent(metric)}`
    ),
  getTemporalMonitoring: (corridorId = '') => {
    const q = corridorId ? `?corridor_id=${encodeURIComponent(corridorId)}` : '';
    return requestJson(`/api/temporal/intervention-monitoring${q}`);
  },
  ingestTemporalObservation: (payload) =>
    requestJson('/api/temporal/observations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Phase 7: IOMETE Climate Technology Procurement Studio
  getProcurementCatalog: (category = '') => {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return requestJson(`/api/procurement/catalog${q}`);
  },
  compareProcurementEquipment: (payload) =>
    requestJson('/api/procurement/compare', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generateProcurementRfp: (payload) =>
    requestJson('/api/procurement/generate-rfp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Phase 8: Social Equity & Community Observations
  getEquitySummary: () => requestJson('/api/equity/summary'),
  submitEquityObservation: (payload) =>
    requestJson('/api/equity/observations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyEquityObservation: (observationId, payload) =>
    requestJson(`/api/equity/observations/${encodeURIComponent(observationId)}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Phase 9: Official Prize & Track Acceptance Matrix (7-Gate Verification)
  getAcceptanceMatrix: () => requestJson('/api/acceptance-matrix'),
};
