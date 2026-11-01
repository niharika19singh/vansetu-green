# VanSetu GreenTech — Corridor Map Highlighting & Selection Visualization Report

**Document Version:** 1.0.0  
**Repository:** `https://github.com/niharika19singh/vansetu-green`  
**Target Staging URL:** `https://vansetu-green-staging.vercel.app/?view=map`  
**Git Head Commit:** `412803f`  
**Active Branches:** `feature/legacy-parity-overlays-and-features`, `integration/kunal-frontend-v2`  
**Date:** November 1, 2026  

---

## 1. Executive Summary

This engineering implementation delivers the **Corridor Map Highlighting and Selection Visualization** requirement for the VanSetu Green platform, directly matching the design aesthetic of the provided reference screenshot (`step_736_media_0.png`).

The implementation replaces basic green outline lines with a high-fidelity, dual-pane vector rendering pipeline featuring:
1. **Luminous Cyan/Turquoise Core Line (`#00f5d4`)**: Rendered at 6.5px stroke width with smooth rounded line caps and joins (`lineCap: 'round'`, `lineJoin: 'round'`).
2. **High-Contrast Dark Casing Outline (`#021811`)**: Rendered at 11px stroke width beneath the cyan core, ensuring the selected corridor remains sharp and readable over dark basemaps, high-stress thermal heat maps (LST), Green Deficit Index (GDI) rasters, and satellite imagery.
3. **Dedicated High Stacking Panes**: Uses custom Leaflet panes (`selectedCorridorCasingPane` z-index 610, `selectedCorridorHighlightPane` z-index 620, `selectedCorridorLabelPane` z-index 650) to guarantee the selected corridor and its label float strictly above all rasters (tilePane 200) and unselected vector overlays (overlayPane 400).
4. **Floating Midpoint Corridor Label**: Positioned precisely along the corridor's Euclidean cumulative midpoint. Features a compact dark background (`#071c16`), pulsing cyan status dot, corridor name, formatted priority score, and amber rank badge (`data-testid="selected-corridor-floating-label"`).
5. **Differentiated Unselected Corridors**: Categorically styled by priority tier (Critical red `#ef4444`, High orange `#f97316`, Moderate amber `#f59e0b`, Low green `#10b981`). When a corridor is selected, unselected corridors dim to 0.70 opacity at 3.5px width so the cyan highlight visually commands the viewport.
6. **Two-Way Synchronized Interaction**: Selecting a corridor from the ranking list immediately fits bounds (`map.fitBounds`) and renders the highlight; clicking a corridor on the map synchronizes the active list item and right-side inspection drawer; switching districts or scenarios safely updates/preserves selection without state corruption.
7. **Strict Absence of Rectangular Bounding Boxes**: Zero rectangular selection boxes, zero dashed bounding boxes, and zero square grid-cell markers.

---

## 2. Visual Reference Analysis (`step_736_media_0.png`)

Inspection of the reference screenshot revealed the target visual hierarchy:
- **Basemap**: Dark canvas with subtle road hierarchy.
- **Unselected Corridors**: Solid vector lines colored by severity/priority (amber `#f59e0b` and orange `#f97316`) with rounded ends.
- **Selected Corridor**: An electric cyan/sea-green line (`#00f5d4`) that visibly dominates the viewport, framed by a dark casing to separate it from underlying urban textures.
- **No Rectangular Artifacts**: Clean organic geometry following the actual road curvature without artificial bounding rectangles.

---

## 3. Architecture & Multi-Layer Stacking Specification

### 3.1 Custom Leaflet Map Panes
To prevent raster layers (MODIS LST, Sentinel-2 NDVI, GDI) or OpenStreetMap roads/parks vectors from occluding the selected corridor, custom panes were initialized inside `MapViewportController`:

```javascript
// Custom Stacking Panes in InteractiveMap.jsx
if (!map.getPane('selectedCorridorCasingPane')) {
  const casing = map.createPane('selectedCorridorCasingPane');
  casing.style.zIndex = '610';
  casing.style.pointerEvents = 'none';
}
if (!map.getPane('selectedCorridorHighlightPane')) {
  const line = map.createPane('selectedCorridorHighlightPane');
  line.style.zIndex = '620';
}
if (!map.getPane('selectedCorridorLabelPane')) {
  const label = map.createPane('selectedCorridorLabelPane');
  label.style.zIndex = '650';
  label.style.pointerEvents = 'none';
}
```

### 3.2 Visual Stacking Order
| Layer Description | Leaflet Pane | Z-Index | Line Width | Color | Opacity | Line Cap / Join |
|---|---|---|---|---|---|---|
| Basemap (Dark Canvas / Satellite) | `tilePane` | 200 | N/A | Tiles | 1.0 | N/A |
| Rasters (LST, NDVI, GDI) | `overlayPane` | 400 | N/A | Heatmaps | 0.85 | N/A |
| OSM Roads / Parks / Residential | `overlayPane` | 400 | 1.5 - 3.0px | Palette | 0.35 - 0.75 | round |
| Unselected Corridors | `overlayPane` | 400 | 3.5px | Tier Color | 0.70 | round |
| Selected Corridor Halo (Bloom) | `selectedCorridorCasingPane` | 610 | 16px | `#00f5d4` | 0.22 | round |
| Selected Corridor Contrast Casing | `selectedCorridorCasingPane` | 610 | 11px | `#021811` | 0.96 | round |
| Selected Corridor Vibrant Core | `selectedCorridorHighlightPane` | 620 | 6.5px | `#00f5d4` | 1.00 | round |
| Floating Corridor Midpoint Label | `selectedCorridorLabelPane` | 650 | N/A | Dark Cyan | 0.98 | N/A |

---

## 4. Corridor Midpoint & Geometry Calculation

Pure geospatial calculations were decoupled into `frontend/src/utils/corridorGeometry.js`:

### 4.1 Path Coordinate Extraction
Handles both standard `LineString` (`[[lng, lat], ...]`) and complex `MultiLineString` (`[[[lng, lat], ...], ...]`) structures:
```javascript
export function parseGeometryToLatLngs(geometry) {
  if (!geometry || !geometry.coordinates) return [];
  const { type, coordinates } = geometry;
  if (type === 'MultiLineString') {
    return coordinates.map((line) => line.map(([lng, lat]) => [lat, lng]));
  }
  if (Array.isArray(coordinates[0]) && typeof coordinates[0][0] === 'number') {
    return coordinates.map(([lng, lat]) => [lat, lng]);
  }
  if (Array.isArray(coordinates[0]) && Array.isArray(coordinates[0][0])) {
    return coordinates[0].map(([lng, lat]) => [lat, lng]);
  }
  return [];
}
```

### 4.2 Cumulative Distance Midpoint Interpolation
Finds the 50% cumulative path distance rather than naively selecting an index:
```javascript
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
    totalDist += Math.sqrt(dLat * dLat + dLng * dLng);
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
```

---

## 5. Floating Corridor Label Design

The floating label is rendered as a Leaflet `Marker` with a custom `L.divIcon` at the corridor midpoint:
- **Test ID:** `data-testid="selected-corridor-floating-label"`
- **Markup Structure:**
  ```html
  <div class="pointer-events-none select-none inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#071c16]/95 backdrop-blur-md border border-[#00f5d4]/80 shadow-[0_4px_20px_rgba(0,0,0,0.65)] text-xs text-white transform -translate-x-1/2 -translate-y-full mb-3 whitespace-nowrap">
    <span class="w-2.5 h-2.5 rounded-full bg-[#00f5d4] shadow-[0_0_8px_#00f5d4] animate-pulse"></span>
    <span class="font-bold text-white tracking-wide">{corridor.name}</span>
    <span class="text-slate-400">|</span>
    <span class="text-[#00f5d4] font-mono font-bold">{scoreFormatted} Score</span>
    <span class="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 text-[10px] font-mono">#{rank}</span>
  </div>
  ```
- **Interactivity:** Configured with `pointer-events-none` so it never intercepts map pan, zoom, or click events.

---

## 6. Two-Way Synchronized Interaction

1. **Ranking List to Map**:
   - In `MapExplorerView.jsx`, clicking an item in the corridor list sets `selectedCorridor`.
   - `InteractiveMap.jsx` executes `map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true })`.
   - The selected corridor immediately shifts to the high-contrast casing and bright cyan highlight line, and the floating label appears at the midpoint.
   - The ranking list item highlights in cyan (`bg-[#00f5d4]/10 border-[#00f5d4] ring-1 ring-[#00f5d4]/50`).
2. **Map to Ranking List**:
   - Clicking any corridor polyline directly on the map triggers `onSelectCorridor(corr)`.
   - In `MapExplorerView.jsx`, the right-side inspection drawer opens with full analytics and the intervention planner.
   - The left ranking drawer automatically reflects the active item.
3. **Scenario & District Transitions**:
   - In `App.jsx`, when the user toggles scenarios (e.g. `baseline` to `heat_resilience`) or changes districts, the selection preserves the currently active corridor ID without deselecting or crashing.

---

## 7. Verification Evidence & Automated Tests

### 7.1 Frontend Automated Test Results
Run command: `npm --prefix frontend test`

```
> vansetu-green-frontend@2.0.0 test
> node --test tests/*.test.mjs

✔ SeasonalHeatIntelligenceView implements genuine Retry button, error diagnostics, and zero-hotspots state (1.196084ms)
✔ Landing page uses exact background image asset with reliable local fallback (0.534667ms)
✔ App.jsx provides top-level global retry wired to metadata, corridor data, and view synchronization (0.476417ms)
✔ Complete feature inventory: all 28 registered application views exist and export defaults (7.964041ms)
✔ Delhi roads GeoJSON FeatureCollection contains exactly 44 validated LineString corridors (0.495625ms)
✔ Legacy feature parity: LocationSearch, Corridor3DViewer, and 10-layer InteractiveMap overlays are verified (1.181125ms)
✔ Root cause diagnosis fixes: Failures A, B, and C verified (0.509458ms)
✔ PART D: Right-Side Dismissible OVERLAYS Panel, 9 overlays, and dynamic count verified (0.352583ms)
✔ Role-Based Experience & Personas: Persona consistency, sidebar labels, and role navigation verified (0.637708ms)
✔ Corridor Map Highlighting & Selection Visualization: Parity, Cyan Highlight, Casing, Floating Label, and Geometry Integrity (1.272917ms)
✔ package.json includes required stack (React, Vite, Tailwind CSS, Leaflet, Recharts) (0.859333ms)
✔ Delhi districts GeoJSON is valid EPSG:4326 FeatureCollection (0.310084ms)
✔ Frontend implements all 5 policy scenarios, native resolution disclosures, and 10-view navigation (1.354542ms)
✔ All HackCBS 9.0 specialized view components exist and wire to API client (0.2085ms)
✔ All Government, Pro Professional, and Public View Components exist (8.354167ms)
✔ RoleHeader implements 3-role persona switcher and institutional badges (0.1105ms)
✔ App.jsx integrates RoleHeader, persona switching, and AccessDenied route guarding (0.135958ms)
✔ REST API client provides all B2G tenders, allocations, cost optimization, and health endpoints (1.174542ms)
✔ UI embeds strict single-party exclusivity and sealed competitive bid disclosures (0.1535ms)
✔ Hospital and ABDM views enforce truthful reporting and zero PII disclosures (0.11675ms)
✔ Pro Workspace components integrate dedicated /me endpoints (0.109459ms)
ℹ tests 21
ℹ suites 0
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 98.576
```

### 7.2 Backend Automated Test Results
Run command: `PYTHONPATH=backend backend/venv/bin/python -m pytest backend/tests`
```
============================= 132 passed in 12.56s =============================
```

### 7.3 Frontend Production Build
Run command: `npm --prefix frontend run build`
```
✓ 2258 modules transformed.
dist/index.html                                           1.11 kB │ gzip:   0.58 kB
dist/assets/index-0VDSBm1V.css                           60.88 kB │ gzip:  10.62 kB
dist/assets/MapExplorerView-BXFuPSn-.js                  42.34 kB │ gzip:  11.68 kB
✓ built in 3.16s
```

### 7.4 Live Vercel Staging Deployment Verification
- **Staging URL:** `https://vansetu-green-staging.vercel.app/?view=map`
- **HTTP Status:** `HTTP/2 200 OK`
- **Asset Verification on Staging:**
  - Deployed `MapExplorerView` chunk verified with 12 occurrences of `#00f5d4` cyan highlight.
  - Deployed chunk contains `selectedCorridorHighlightPane` and `selectedCorridorCasingPane`.
  - Deployed chunk contains `selected-corridor-floating-label`.
  - Deployed chunk contains `#021811` high-contrast casing stroke.

---

## 8. Summary Checklist of Requirements

| Requirement | Implementation Detail | Status |
|---|---|---|
| **Render Actual Geographic Geometry** | `parseGeometryToLatLngs` processes real LineString/MultiLineString coordinates from `delhi_roads.geojson` | **PASS** |
| **Bright Cyan / Turquoise Colour** | Rendered with `#00f5d4` (matches visual reference screenshot) | **PASS** |
| **Sufficiently Thick Line** | 6.5px core line width with smooth rounded end caps and joins | **PASS** |
| **Subtle Contrasting Casing** | 11px `#021811` outline beneath core line; visible on thermal & satellite layers | **PASS** |
| **Smooth Rounded Caps & Joins** | `lineCap: 'round'`, `lineJoin: 'round'` on all casing and highlight polylines | **PASS** |
| **Top of Stacking Order** | Custom panes `selectedCorridorCasingPane` (z-610) & `selectedCorridorHighlightPane` (z-620) | **PASS** |
| **Floating Corridor Label** | Positioned at exact cumulative distance midpoint with name, score, rank, and pulsing cyan dot | **PASS** |
| **Unselected Corridors Styling** | Categorically colored by priority (red/orange/amber/green); 3.5px width, 0.70 opacity when selected | **PASS** |
| **Synchronized Interaction** | Two-way list/map sync with automatic `map.fitBounds` and drawer opening | **PASS** |
| **Zero Square / Bounding Boxes** | Strictly zero `<Rectangle>`, zero dashed boxes, and zero grid markers | **PASS** |
| **Live Staging Deployment** | Deployed to Vercel production alias `https://vansetu-green-staging.vercel.app/?view=map` | **PASS** |
