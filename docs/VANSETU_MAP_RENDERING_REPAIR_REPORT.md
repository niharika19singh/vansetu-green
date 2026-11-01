# VanSetu Map Rendering Repair Report

**Interactive Geographic Canvas Forensic Audit & Clean Map Restoration**  
**Repository:** `https://github.com/niharika19singh/vansetu-green`  
**Component:** `frontend/src/components/InteractiveMap.jsx` & `frontend/src/views/MapExplorerView.jsx`  
**Date:** November 1, 2026  
**Auditor:** Senior Geospatial UI Engineer & Full-Stack Architect  

---

## 1. Executive Summary

The primary map interface is the core visual anchor ("The Map is the Hero") of VanSetu Green. Prior testing reported visual degradation caused by:
1. Dashed bounding rectangles framing administrative districts across Delhi.
2. Rough rectangular green polygon boxes representing parks and reserves cluttering the urban grid.
3. A broken 11-district dropdown selector in the top bar that fragmented user exploration.
4. Pin markers remaining stranded on the map when clearing search input.
5. Incomplete corridor lines due to missing array guards and 7-corridor hardcoding.

This report documents the architectural repairs that eliminated all extraneous geometric boxes, restored clean vector LineString rendering, enhanced Delhi landmark search, and brought all 44 verified walkable corridors into sharp, prominent focus.

---

## 2. Geometric Cleanup & Squares/Rectangles Removal

### Problem A: Dashed District Bounding Outlines
- **Root Cause:** In `InteractiveMap.jsx`, state `showDistricts` was initialized to `true`. When rendered, `GeoJSON` with `districtsGeoJson` drew dashed rectangular borders (`dashArray: '4 4'`) around all 11 Delhi revenue districts, creating visually distracting square boxes.
- **Repair:**
  - Initialized `const [showDistricts, setShowDistricts] = useState(false);`.
  - Removed dashed boundaries from initial canvas rendering.
  - Retained district metadata within individual corridor properties, datasets, and administrative tables.

### Problem B: Rough Park & Reserve Polygon Rectangles
- **Root Cause:** `DELHI_PARKS_BASELINE` (a curated GeoJSON FeatureCollection of urban forests) had `defaultEnabled: true` in `OVERLAY_DEFINITIONS` and `activeLayers.osmParks: true`. When loaded, it drew translucent green polygons with bounding boxes over Central Ridge, Sanjay Van, and Rohini.
- **Repair:**
  - Set `osmParks` to `defaultEnabled: false` in `OVERLAY_DEFINITIONS` and `activeLayers`.
  - The layer remains available in the right-side Overlays panel for users who explicitly want park overlays, but loads in an un-cluttered state by default.

### Problem C: Removal of Broken 11-District Map Filter
- **Root Cause:** `MapExplorerView.jsx` contained a `<select>` dropdown in its top header that attempted to filter the map view by district. This conflicted with the full-city exploration paradigm and created inconsistent clipping when corridors crossed district lines.
- **Repair:**
  - Removed the district selector dropdown from the primary map header bar in `MapExplorerView.jsx`.
  - Users explore all 44 walkable corridors across all 11 districts seamlessly.
  - Search by corridor name, code (e.g. `C-14`), or district remains fully operational in the search bar.

---

## 3. Location Search & Pin Marker Overhaul

### Landmark Index Expansion
In `frontend/src/components/LocationSearch.jsx`, the offline curated landmark index was expanded to guarantee instant, 0ms autocomplete for all required Delhi hubs:
- **Kashmere Gate:** `Kashmere Gate ISBT & Heritage Hub` (lat: `28.6675`, lon: `77.2285`, North Delhi)
- **Connaught Place:** `Connaught Place (Rajiv Chowk)` (lat: `28.6315`, lon: `77.2167`, Central Delhi)
- **Rajiv Chowk:** `Rajiv Chowk Metro & Central Business District` (lat: `28.6328`, lon: `77.2195`, Central Delhi)
- **Chandni Chowk:** `Chandni Chowk & Old Delhi Heritage Corridor` (lat: `28.6506`, lon: `77.2303`, North Delhi)
- **Anand Vihar:** `Anand Vihar ISBT & Terminal` (lat: `28.6469`, lon: `77.3164`, East Delhi)
- **India Gate:** `India Gate & Central Vista` (lat: `28.6129`, lon: `77.2295`, New Delhi)
- **Saket:** `Saket District Centre & Select Citywalk` (lat: `28.5245`, lon: `77.2167`, South Delhi)
- **Dwarka:** `Dwarka Sub-City & Sector 21 Transit Hub` (lat: `28.5524`, lon: `77.0583`, South West Delhi)
- **Rohini:** `Rohini Sub-City & District Centre` (lat: `28.7325`, lon: `77.1199`, North West Delhi)

### Real-Time Geocoding with Bounding Box
- Debounced (300ms) query to OpenStreetMap Nominatim biased to Delhi NCT (`viewbox=76.73,28.87,77.35,28.40`).
- Offline fallback matches are displayed instantly while network requests resolve.

### Pin Synchronization & Clearing Action
- Previously, `handleClear` reset the text input without informing the map parent, leaving the pin marker stranded.
- **Fix:** In `LocationSearch.jsx`:
  ```javascript
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    if (handleSelect) {
      handleSelect(null);
    }
  };
  ```
- In `InteractiveMap.jsx`: The pin marker is only rendered when `targetLocation && targetLocation.lat && targetLocation.lon`. Clearing the input immediately removes the pin from the canvas.
- When active, the pin is rendered as a prominent custom marker with:
  - An animated outer cyan pulse halo (`animate-ping`).
  - An inner dark emerald badge with a bright cyan border (`border-[#00f5d4]`).
  - A permanent top-mounted tooltip displaying the landmark name.

---

## 4. Corridor Highlighting & Selection Visualization

When a corridor is selected from the list or directly clicked on the map canvas:

1. **Custom Leaflet Stacking Panes:**
   - `selectedCorridorCasingPane` (z-index 610): Renders the outer glow and dark casing outline beneath the highlight.
   - `selectedCorridorHighlightPane` (z-index 620): Renders the bright cyan core line.
   - `selectedCorridorLabelPane` (z-index 650): Renders the floating tooltip badge above all vector and raster layers.
2. **Tri-Layer Polyline Geometry:**
   - **Outer Halo:** Weight `16px`, color `#00f5d4`, opacity `0.22`, rounded caps.
   - **Dark Casing:** Weight `11px`, color `#021811`, opacity `0.96`, high contrast against bright satellite or dark basemap.
   - **Cyan Core:** Weight `6.5px`, color `#00f5d4`, opacity `1.0`.
3. **Midpoint Geographic Calculation:**
   - Evaluated via cumulative Euclidean polyline segment interpolation (`getCorridorMidpoint()`).
   - Floats an interactive badge: `[Pulsing Dot] Name | Score | #Rank`.
4. **Auto-Fit Viewport (`fitBounds`):**
   - Automatically computes bounding box of polyline coordinates and pans/zooms with `padding: [80, 80]` and `maxZoom: 15`.

---

## 5. Verification Checklist

- [x] Zero dashed bounding boxes appear on map load.
- [x] Zero rough rectangular green park polygons appear on map load.
- [x] Primary map header contains no broken 11-district dropdown.
- [x] Searching for "Kashmere Gate" immediately suggests the landmark and flies to coordinate `(28.6675, 77.2285)`.
- [x] Clearing the search bar immediately removes the pin marker.
- [x] Selecting corridor C-14 draws prominent cyan line with dark casing and floating label.
- [x] Clicking "🎯 Fit Corridor" smoothly zooms to corridor bounds.
- [x] Clicking "🗺️ Reset View" resets canvas to Delhi NCT overview `(28.6289, 77.2195, z=11)`.
- [x] All 44 corridors load and render across NCT Delhi.
