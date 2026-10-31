/**
 * Mathematical & Spline Utilities for "Veins of Life" 3D Cinematic Engine.
 */
import * as THREE from 'three';

export function clamp(val, min = 0, max = 1) {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function remap(val, inMin, inMax, outMin, outMax) {
  const t = clamp((val - inMin) / (inMax - inMin), 0, 1);
  return outMin + (outMax - outMin) * t;
}

/**
 * Geographic coordinates (WGS84 EPSG:4326) to 3D world space (X, Y=0, Z).
 * Center: Delhi Center (~77.22, ~28.61, near India Gate / Pragati Maidan)
 */
export const DELHI_CENTER = {
  lng: 77.2285,
  lat: 28.6139,
};

// Latitude distortion factor at ~28.6 degrees north: cos(28.6 * pi / 180) ~ 0.878
const LAT_SCALE = 111.0;
const LNG_SCALE = 111.0 * Math.cos((28.6139 * Math.PI) / 180);

export function geoToWorld(lng, lat, worldScale = 1.6) {
  const dx = (lng - DELHI_CENTER.lng) * LNG_SCALE * worldScale;
  const dz = -(lat - DELHI_CENTER.lat) * LAT_SCALE * worldScale;
  return new THREE.Vector3(dx, 0, dz);
}

/**
 * Creates a CatmullRomCurve3 from an array of Vector3 objects
 */
export function createSpline(points, closed = false) {
  return new THREE.CatmullRomCurve3(points, closed, 'catmullrom', 0.5);
}
