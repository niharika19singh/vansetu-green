/**
 * VanSetu — Urban Climate Action Intelligence REST API Client
 * Connects the React + Vite frontend to the FastAPI geospatial, MILP optimizer,
 * Meko memory, Gemini 3.8 Flash agent, Tiger Data, Social Equity, and IOMETE Procurement backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860';

async function requestJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const response = await fetch(url, {
    ...options,
    headers,
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

async function requestUpload(path, formData, token = null) {
  const url = `${API_BASE}${path}`;
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      detail = errJson.detail || detail;
    } catch {}
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
  deleteMekoMemory: (memoryId, agentId = 'climate_planner_agent') =>
    requestJson(`/api/meko/memories/${encodeURIComponent(memoryId)}?agent_id=${encodeURIComponent(agentId)}`, {
      method: 'DELETE',
    }),
  updateMekoMemory: (memoryId, payload) =>
    requestJson(`/api/meko/memories/${encodeURIComponent(memoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
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

  // Advanced Research-Backed Features (Features 1 - 8)
  // Feature 1: Corridor Evidence Passport
  getEvidencePassport: (corridorId) => requestJson(`/api/evidence/passport/${encodeURIComponent(corridorId)}`),
  getEvidencePassportsSummary: () => requestJson('/api/evidence/passports'),

  // Feature 2: Right Tree, Right Place (Segment Suitability & Species)
  getSegmentSuitability: (corridorId) =>
    requestJson(`/api/suitability/corridor/${encodeURIComponent(corridorId)}/segments`),
  getSingleSegment: (segmentId) => requestJson(`/api/suitability/segment/${encodeURIComponent(segmentId)}`),
  getTreeSpeciesCatalog: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return requestJson(`/api/suitability/species-catalog${q ? `?${q}` : ''}`);
  },

  // Feature 3: Pareto Portfolio Lab
  runParetoOptimizer: (payload) =>
    requestJson('/api/optimizer/pareto', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getParetoPresets: () => requestJson('/api/optimizer/pareto/presets'),

  // Feature 4: Pedestrian Shade Continuity Analyser
  getShadeContinuity: (corridorId) =>
    requestJson(`/api/shade-continuity/${encodeURIComponent(corridorId)}`),
  getShadeNetworkGaps: () => requestJson('/api/shade-continuity/network-gaps'),

  // Feature 5: Seasonal Urban Heat Intelligence
  getSeasonalHeatProfile: (corridorId) =>
    requestJson(`/api/seasonal/corridor/${encodeURIComponent(corridorId)}`),
  getSeasonalHotspots: () => requestJson('/api/seasonal/hotspots'),
  getSeasonalBaselines: () => requestJson('/api/seasonal/baselines'),

  // Feature 6: Climate Intervention Impact Monitoring
  getImpactRegistry: () => requestJson('/api/impact/registry'),
  getImpactDeployment: (deploymentId) =>
    requestJson(`/api/impact/deployment/${encodeURIComponent(deploymentId)}`),
  createImpactDeployment: (payload) =>
    requestJson('/api/impact/deployments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateImpactStatus: (deploymentId, payload) =>
    requestJson(`/api/impact/deployment/${encodeURIComponent(deploymentId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Feature 7: Spatial Institutional Memory Map
  getSpatialMemoryPins: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return requestJson(`/api/meko/spatial/pins${q ? `?${q}` : ''}`);
  },
  executeSpatialMemoryAction: (payload) =>
    requestJson('/api/meko/spatial/action', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getSpatialMemoryCorridorComparison: (corridorId) =>
    requestJson(`/api/meko/spatial/corridor/${encodeURIComponent(corridorId)}/comparison`),

  // Feature 8: Climate Project Implementation & Readiness Planner
  getReadinessProjects: () => requestJson('/api/readiness/projects'),
  createReadinessProject: (payload) =>
    requestJson('/api/readiness/projects/from-portfolio', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getReadinessProjectPlan: (projectId) =>
    requestJson(`/api/readiness/projects/${encodeURIComponent(projectId)}`),
  advanceReadinessPackageGate: (packageId, payload) =>
    requestJson(`/api/readiness/package/${encodeURIComponent(packageId)}/gate`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Phase 11: Machine Learning Intervention Intelligence Engine
  getMlModelStatus: () => requestJson('/api/ml/model-status'),
  getMlDataStatus: () => requestJson('/api/ml/data-status'),
  getSegmentFeatures: (segmentId) =>
    requestJson(`/api/ml/features/${encodeURIComponent(segmentId)}`),
  recommendInterventions: (payload) =>
    requestJson('/api/ml/interventions/recommend', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  uploadEvidenceDocument: (formData, token) =>
    requestUpload('/api/ml/evidence/upload', formData, token),
  verifyEvidenceDocument: (evidenceId, payload, token) =>
    requestJson(`/api/ml/evidence/${encodeURIComponent(evidenceId)}/verify`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  listEvidenceDocuments: (params = {}, token) => {
    const q = new URLSearchParams(params).toString();
    return requestJson(`/api/ml/evidence${q ? `?${q}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  submitSiteAssessment: (payload, token) =>
    requestJson('/api/ml/site-assessments', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  reviewSiteAssessment: (assessmentId, payload, token) =>
    requestJson(`/api/ml/site-assessments/${encodeURIComponent(assessmentId)}`, {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  listSiteAssessments: (params = {}, token) => {
    const q = new URLSearchParams(params).toString();
    return requestJson(`/api/ml/site-assessments${q ? `?${q}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
  submitOutcomeObservation: (payload, token) =>
    requestJson('/api/ml/outcome-observations', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  promoteModel: (payload, token) =>
    requestJson('/api/ml/model/promote', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),
  rollbackModel: (payload, token) =>
    requestJson('/api/ml/model/rollback', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify(payload),
    }),

  // Phase 12: RBAC, Government Administration, Tender Allocation & Hospital Health
  getCurrentUser: (token) =>
    requestJson('/api/auth/me', { token }),
  getPermissions: (token) =>
    requestJson('/api/auth/permissions', { token }),
  demoSwitchRole: (role) =>
    requestJson(`/api/auth/demo-switch-role?role=${encodeURIComponent(role)}`, {
      method: 'POST',
    }),

  // Tenders & Procurement Marketplace
  listTenders: (params = {}, token) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.corridor_id) q.set('corridor_id', params.corridor_id);
    const qs = q.toString();
    return requestJson(`/api/tenders${qs ? `?${qs}` : ''}`, { token });
  },
  createTender: (payload, token) =>
    requestJson('/api/tenders', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  getTender: (tenderId, token) =>
    requestJson(`/api/tenders/${encodeURIComponent(tenderId)}`, { token }),
  submitTenderProposal: (tenderId, payload, token) =>
    requestJson(`/api/tenders/${encodeURIComponent(tenderId)}/proposals`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  awardTender: (tenderId, payload, token) =>
    requestJson(`/api/tenders/${encodeURIComponent(tenderId)}/award`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  getCorridorAvailability: (corridorId, token) =>
    requestJson(`/api/corridors/${encodeURIComponent(corridorId)}/availability`, { token }),
  getMyCorridorAssignments: (token) =>
    requestJson('/api/me/corridor-assignments', { token }),
  getMyProposals: (token) =>
    requestJson('/api/me/proposals', { token }),
  listCorridorAssignments: (params = {}, token) => {
    const q = new URLSearchParams();
    if (params.corridor_id) q.set('corridor_id', params.corridor_id);
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return requestJson(`/api/admin/corridor-assignments${qs ? `?${qs}` : ''}`, { token });
  },
  directAllocateCorridor: (payload, token) =>
    requestJson('/api/admin/corridor-assignments', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  listProfessionals: (token) =>
    requestJson('/api/admin/professionals', { token }),
  verifyProfessional: (payload, token) =>
    requestJson('/api/admin/professionals/verify', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  listAuditLogs: (params = {}, token) => {
    const q = new URLSearchParams();
    if (params.corridor_id) q.set('corridor_id', params.corridor_id);
    if (params.action) q.set('action', params.action);
    if (params.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return requestJson(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`, { token });
  },

  // Corridor Cost Optimization & Government Budget Approval
  getCorridorCostBaseline: (corridorId, token) =>
    requestJson(`/api/corridors/${encodeURIComponent(corridorId)}/cost-optimisation`, { token }),
  optimizeCorridorCost: (corridorId, payload, token) =>
    requestJson(`/api/corridors/${encodeURIComponent(corridorId)}/cost-optimisation`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  approveCorridorBudget: (corridorId, payload, token) =>
    requestJson(`/api/corridors/${encodeURIComponent(corridorId)}/budget-approval`, {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  // Hospital & Regional Heat Health Intelligence
  getRegionalHealthIndicators: (params = {}, token) => {
    const q = new URLSearchParams();
    if (params.district) q.set('district', params.district);
    if (params.year) q.set('year', String(params.year));
    const qs = q.toString();
    return requestJson(`/api/health/regional-indicators${qs ? `?${qs}` : ''}`, { token });
  },
  getCorridorHealthFactor: (district, token) =>
    requestJson(`/api/health/corridors/${encodeURIComponent(district)}/health-factor`, { token }),
  getAbhaStatus: () =>
    requestJson('/api/health/abha-status'),
  listHospitalSources: (token) =>
    requestJson('/api/admin/health-data/sources', { token }),
  createHospitalSource: (payload, token) =>
    requestJson('/api/admin/health-data/sources', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  uploadHospitalDataset: (payload, token) =>
    requestJson('/api/admin/health-data/uploads', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  // Phase 9: Official Prize & Track Acceptance Matrix (7-Gate Verification)
  getAcceptanceMatrix: () => requestJson('/api/acceptance-matrix'),
};
