/**
 * Delhi Geographic Road Network & Landmark Data for "Veins of Life".
 * Uses real WGS84 GeoJSON data matching Reference Image 2 (New Delhi & Pragati Maidan).
 */
import * as THREE from 'three';
import { geoToWorld, DELHI_CENTER } from './mathUtils';

export const DELHI_LANDMARKS = [
  {
    id: 'pragati_maidan',
    name: 'Pragati Maidan',
    subtitle: 'IECC • Bharat Mandapam',
    lng: 77.242,
    lat: 28.618,
    type: 'major',
    description: 'Premier transit & exhibition hub along Mathura Road with integrated EV green corridors',
  },
  {
    id: 'new_delhi',
    name: 'New Delhi',
    subtitle: 'National Capital Territory',
    lng: 77.218,
    lat: 28.632,
    type: 'capital',
    description: 'Central urban core featuring historic radial boulevards and high-density mobility',
  },
  {
    id: 'rajpath',
    name: 'Kartavya Path (Rajpath)',
    subtitle: 'Ceremonial Green Spine',
    lng: 77.218,
    lat: 28.6129,
    type: 'corridor',
    description: 'Iconic 3.2km green boulevard with low urban heat island index (LST 24.2°C)',
  },
  {
    id: 'lodhi_road',
    name: 'Lodhi Road',
    subtitle: 'Heritage Green Corridor',
    lng: 77.228,
    lat: 28.591,
    type: 'heritage',
    description: 'Historic heritage corridor connecting Lodhi Gardens to Nizamuddin',
  },
  {
    id: 'mathura_road',
    name: 'Mathura Road',
    subtitle: 'Arterial Corridor (C-14)',
    lng: 77.244,
    lat: 28.608,
    type: 'arterial',
    description: 'High-vulnerability arterial prioritized for urban forestry & cool pavement intervention',
  },
  {
    id: 'connaught_place',
    name: 'Connaught Place',
    subtitle: 'Radial Commercial Core',
    lng: 77.219,
    lat: 28.6315,
    type: 'commercial',
    description: 'Historic circular radial geometry connecting Delhi inner arterial arteries',
  },
];

/**
 * Builds 3D roadway line segments and curves from GeoJSON features.
 */
export function buildDelhiRoad3DData(geojson, worldScale = 0.45) {
  if (!geojson || !geojson.features) return { segments: [], corridors: [] };

  const segments = [];
  const corridors = [];

  geojson.features.forEach((f, idx) => {
    const coords = f.geometry?.coordinates;
    if (!coords || coords.length < 2) return;

    const points3D = coords.map(([lng, lat]) => geoToWorld(lng, lat, worldScale));
    const corridorId = f.properties?.id || `corridor_${idx + 1}`;
    const corridorName = f.properties?.name || `Delhi Corridor ${idx + 1}`;
    const highwayType = f.properties?.highway || 'primary';

    // Store corridor 3D points
    corridors.push({
      id: corridorId,
      name: corridorName,
      code: `C-${String(idx + 1).padStart(2, '0')}`,
      highway: highwayType,
      district: f.properties?.district || 'Central Delhi',
      points: points3D,
      severity: f.properties?.severity || (idx % 3 === 0 ? 'Critical' : idx % 3 === 1 ? 'High' : 'Moderate'),
      color:
        f.properties?.severity_color ||
        (idx % 3 === 0 ? '#ef4444' : idx % 3 === 1 ? '#f97316' : '#eab308'),
    });

    // Pairwise line segments for efficient line buffer rendering
    for (let i = 0; i < points3D.length - 1; i++) {
      segments.push({
        p1: points3D[i],
        p2: points3D[i + 1],
        type: highwayType,
        corridorId,
      });
    }
  });

  return { segments, corridors };
}
