/**
 * VanSetu GreenTech — REST API Client
 * Connects the React + Vite frontend to the FastAPI geospatial backend.
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
};
