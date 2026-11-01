// =========================================================================
// CORRIDOR GEOMETRY & MIDPOINT CALCULATION UTILITIES
// =========================================================================

export function parseGeometryToLatLngs(geometry) {
  if (!geometry || !geometry.coordinates) return [];
  const { type, coordinates } = geometry;
  if (type === 'MultiLineString') {
    return coordinates.map((line) => line.map(([lng, lat]) => [lat, lng]));
  }
  // LineString: [[lng, lat], ...]
  if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === 'number') {
    return coordinates.map(([lng, lat]) => [lat, lng]);
  }
  // Nested LineString array: [[[lng, lat], ...]]
  if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    return coordinates[0].map(([lng, lat]) => [lat, lng]);
  }
  return [];
}

export function getFlatLatLngs(latLngs) {
  if (!latLngs || !latLngs.length) return [];
  if (typeof latLngs[0][0] === 'number') {
    return latLngs;
  }
  return latLngs.flat();
}

/**
 * Calculates the exact geographic midpoint along the polyline path
 * via cumulative Euclidean distance interpolation.
 */
export function getCorridorMidpoint(flatLatLngs) {
  if (!flatLatLngs || flatLatLngs.length === 0) return null;
  if (flatLatLngs.length === 1) return flatLatLngs[0];
  if (flatLatLngs.length === 2) {
    return [
      (flatLatLngs[0][0] + flatLatLngs[1][0]) / 2,
      (flatLatLngs[0][1] + flatLatLngs[1][1]) / 2,
    ];
  }

  let totalDist = 0;
  const dists = [0];
  for (let i = 0; i < flatLatLngs.length - 1; i++) {
    const dLat = flatLatLngs[i + 1][0] - flatLatLngs[i][0];
    const dLng = flatLatLngs[i + 1][1] - flatLatLngs[i][1];
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    totalDist += dist;
    dists.push(totalDist);
  }

  const halfDist = totalDist / 2;
  for (let i = 0; i < dists.length - 1; i++) {
    if (dists[i + 1] >= halfDist) {
      const segLen = dists[i + 1] - dists[i];
      const t = segLen > 0 ? (halfDist - dists[i]) / segLen : 0;
      return [
        flatLatLngs[i][0] + t * (flatLatLngs[i + 1][0] - flatLatLngs[i][0]),
        flatLatLngs[i][1] + t * (flatLatLngs[i + 1][1] - flatLatLngs[i][1]),
      ];
    }
  }

  return flatLatLngs[Math.floor(flatLatLngs.length / 2)];
}

export function getCorridorColor(corr) {
  if (corr.severity_color) return corr.severity_color;
  const score = corr.priority_score ?? corr.score;
  if (typeof score === 'number') {
    if (score >= 0.72) return '#ef4444'; // Critical Priority
    if (score >= 0.58) return '#f97316'; // High Priority
    if (score >= 0.45) return '#f59e0b'; // Moderate Priority (warm amber)
    return '#10b981'; // Low Priority (buffered)
  }
  return '#f97316';
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
