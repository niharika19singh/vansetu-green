/**
 * InteractiveMap.jsx — Flagship Geographic Spatial Canvas for VanSetu Green.
 *
 * Implements:
 * - Unwatermarked Esri ArcGIS Online basemaps with crisp reference labels overlaid above rasters:
 *   - Dark Canvas (World_Dark_Gray_Base + World_Dark_Gray_Reference)
 *   - Satellite (World_Imagery + World_Boundaries_and_Places)
 *   - OpenStreetMap Street Map
 * - Full 10 Spatial Overlays & Layers (Complete Parity with Legacy VanSetu):
 *   1. Green Deficit Index (GDI Composite) Raster TileLayer
 *   2. MODIS Land Surface Temp (LST) Raster TileLayer
 *   3. Sentinel-2 Vegetation (NDVI) Raster TileLayer
 *   4. 44 Walkable Corridors Vector Polylines (with emerald highlight on select)
 *   5. Walkable Road Network Vector Layer (/api/roads/simple)
 *   6. CPCB Air Quality Monitoring Stations (CircleMarkers with detailed AQI, PM2.5, PM10, NO2 popups)
 *   7. Roads Overlay (Esri World_Transportation reference tile layer above rasters)
 *   8. Parks & Green Spaces (Curated Delhi Urban Forests & Parks GeoJSON + optional Overpass enrichment)
 *   9. Residential Planning Zones (Curated Delhi Residential Precincts GeoJSON + optional Overpass enrichment)
 *   10. NCT Delhi District Boundaries & Connected-Component Hotspot Polygons
 * - In-Map Quick Actions:
 *   - "🎯 Fit Corridor" (instantly centers and zooms to selected corridor bounds)
 *   - "🗺️ Reset View" (resets map to NCT Delhi overview)
 * - Target location flyTo controller from LocationSearch
 * - Dual-Resolution Point Pixel Inspector (1km MODIS vs 10m Sentinel-2)
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Marker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  Thermometer,
  Trees,
  Wind,
  Crosshair,
  Eye,
  Compass,
  Building,
  Navigation,
  MapPin,
  Car,
  RotateCcw,
  X,
} from 'lucide-react';
import { getTileUrl, api } from '../api/client';
import districtsGeoJson from '../data/delhi_districts.json';

const DELHI_CENTER = [28.6289, 77.2195];

const BASEMAPS = {
  dark: {
    id: 'dark',
    label: 'Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labelUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labelUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    id: 'streets',
    label: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
};

const ESRI_TRANSPORTATION_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}';

// Curated Delhi Major Urban Forests & Parks (Instant baseline for Parks & Green layer)
const DELHI_PARKS_BASELINE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Central Ridge Reserve Forest', type: 'forest' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.155, 28.595],
            [77.195, 28.595],
            [77.205, 28.645],
            [77.168, 28.645],
            [77.155, 28.595],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Sanjay Van Urban Forest', type: 'forest' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.158, 28.522],
            [77.188, 28.522],
            [77.188, 28.546],
            [77.158, 28.546],
            [77.158, 28.522],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Lodhi Gardens & Nehru Park Green Belt', type: 'park' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.192, 28.582],
            [77.228, 28.582],
            [77.228, 28.602],
            [77.192, 28.602],
            [77.192, 28.582],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Yamuna Biodiversity & Floodplain Park', type: 'nature_reserve' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.215, 28.705],
            [77.245, 28.705],
            [77.255, 28.748],
            [77.218, 28.748],
            [77.215, 28.705],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Jahanpanah City Forest', type: 'forest' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.225, 28.524],
            [77.252, 28.524],
            [77.252, 28.542],
            [77.225, 28.542],
            [77.225, 28.524],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Northern Kamla Nehru Ridge', type: 'forest' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.208, 28.672],
            [77.226, 28.672],
            [77.226, 28.698],
            [77.208, 28.698],
            [77.208, 28.672],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Swarn Jayanti Park (Rohini)', type: 'park' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.105, 28.718],
            [77.128, 28.718],
            [77.128, 28.738],
            [77.105, 28.738],
            [77.105, 28.718],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Indraprastha & Millennium Riverfront Park', type: 'park' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.248, 28.585],
            [77.268, 28.585],
            [77.268, 28.618],
            [77.248, 28.618],
            [77.248, 28.585],
          ],
        ],
      },
    },
  ],
};

// Curated Delhi Residential Planning Zones (Instant baseline for Residential layer)
const DELHI_RESIDENTIAL_BASELINE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Rohini Residential Sub-City (Sectors 1–24)' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.065, 28.695],
            [77.145, 28.695],
            [77.145, 28.752],
            [77.065, 28.752],
            [77.065, 28.695],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Dwarka Residential Sub-City (Sectors 1–23)' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.015, 28.555],
            [77.085, 28.555],
            [77.085, 28.618],
            [77.015, 28.618],
            [77.015, 28.555],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Janakpuri – Rajouri Garden Residential Cluster' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.068, 28.618],
            [77.138, 28.618],
            [77.138, 28.658],
            [77.068, 28.658],
            [77.068, 28.618],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Karol Bagh – Patel Nagar High-Density Residential' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.155, 28.638],
            [77.202, 28.638],
            [77.202, 28.668],
            [77.155, 28.668],
            [77.155, 28.638],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Lajpat Nagar – Greater Kailash – Saket Residential Zone' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.195, 28.518],
            [77.262, 28.518],
            [77.262, 28.572],
            [77.195, 28.572],
            [77.195, 28.518],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Mayur Vihar – Patparganj Trans-Yamuna Residential' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.278, 28.595],
            [77.332, 28.595],
            [77.332, 28.642],
            [77.278, 28.642],
            [77.278, 28.595],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Shahdara – Yamuna Vihar High-Density Residential' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [77.258, 28.662],
            [77.318, 28.662],
            [77.318, 28.712],
            [77.258, 28.712],
            [77.258, 28.662],
          ],
        ],
      },
    },
  ],
};

const RASTER_LAYERS = [
  {
    id: 'gdi',
    label: 'Green Deficit Index (GDI)',
    shortLabel: 'GDI Composite',
    nativeRes: '1km Thermal / 10m NDVI',
    displayRes: '10m Aligned',
    stops: [
      { color: '#1a9850', label: '0.20 (Buffered)' },
      { color: '#fee08b', label: '0.45 (Moderate)' },
      { color: '#f46d43', label: '0.65 (High Stress)' },
      { color: '#a50026', label: '0.85+ (Critical)' },
    ],
  },
  {
    id: 'lst',
    label: 'MODIS Land Surface Temp (LST)',
    shortLabel: 'Heat (LST)',
    nativeRes: '1,000m Native (57×79)',
    displayRes: '10m Bilinear Display',
    stops: [
      { color: '#1b0c41', label: '23°C (Cool Sink)' },
      { color: '#721f81', label: '25°C (Moderate)' },
      { color: '#f1605d', label: '27°C (Elevated)' },
      { color: '#fcffa4', label: '28.8°C+ (Hotspot)' },
    ],
  },
  {
    id: 'ndvi',
    label: 'Sentinel-2 Vegetation (NDVI)',
    shortLabel: 'NDVI Canopy',
    nativeRes: '10m Native (5572×7794)',
    displayRes: '10m Native',
    stops: [
      { color: '#ffffe5', label: '<0.0 (Impervious)' },
      { color: '#d9f0a3', label: '0.20 (Sparse)' },
      { color: '#78c679', label: '0.40 (Moderate)' },
      { color: '#005a32', label: '0.65+ (Dense Canopy)' },
    ],
  },
];

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function MapViewportController({ selectedCorridor, fitTrigger, resetTrigger, targetLocation }) {
  const map = useMap();
  const prevCorridorIdRef = useRef(null);

  // Initialize custom Leaflet stacking panes to ensure selected corridor
  // and floating label always sit high above all rasters and unselected vectors
  useEffect(() => {
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
  }, [map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  // Fit to selected corridor (explicit button trigger)
  useEffect(() => {
    if (fitTrigger > 0 && selectedCorridor) {
      const latLngs = parseGeometryToLatLngs(selectedCorridor.geometry);
      const flat = getFlatLatLngs(latLngs);
      if (flat.length > 0) {
        const bounds = L.latLngBounds(flat);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true });
          return;
        }
      }
      if (selectedCorridor.centroid) {
        map.flyTo(selectedCorridor.centroid, 14, { duration: 0.8 });
      }
    }
  }, [fitTrigger, selectedCorridor, map]);

  // Fly to target location from LocationSearch
  useEffect(() => {
    if (targetLocation && targetLocation.lat && targetLocation.lon) {
      map.flyTo([targetLocation.lat, targetLocation.lon], 14, { duration: 1.0 });
    }
  }, [targetLocation, map]);

  // Reset view to Delhi NCT overview
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo(DELHI_CENTER, 11, { duration: 0.9 });
    }
  }, [resetTrigger, map]);

  // Auto-pan and fit bounds when selectedCorridor changes
  useEffect(() => {
    if (!selectedCorridor) return;
    if (prevCorridorIdRef.current === selectedCorridor.id) return;
    prevCorridorIdRef.current = selectedCorridor.id;

    const latLngs = parseGeometryToLatLngs(selectedCorridor.geometry);
    const flat = getFlatLatLngs(latLngs);
    if (flat.length > 0) {
      const bounds = L.latLngBounds(flat);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15, animate: true });
        return;
      }
    }
    if (selectedCorridor.centroid) {
      const [lat, lng] = selectedCorridor.centroid;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [selectedCorridor, map]);

  return null;
}

function PointClickInspector({ enabled, onPointInspected }) {
  useMapEvents({
    click: async (e) => {
      if (!enabled) return;
      const { lat, lng } = e.latlng;
      try {
        const res = await api.inspectPoint(lat.toFixed(6), lng.toFixed(6));
        onPointInspected(res);
      } catch (err) {
        console.error('Point inspection failed:', err);
      }
    },
  });
  return null;
}

export const OVERLAY_DEFINITIONS = [
  {
    id: 'lst',
    name: 'Temperature (LST)',
    type: 'raster',
    color: '#ef4444',
    source: 'NASA MODIS Terra/Aqua LST (1km)',
    endpoint: '/api/tiles/lst/{z}/{x}/{y}.png',
    defaultEnabled: false,
  },
  {
    id: 'ndvi',
    name: 'Vegetation (NDVI)',
    type: 'raster',
    color: '#10b981',
    source: 'Copernicus Sentinel-2 MSI (10m)',
    endpoint: '/api/tiles/ndvi/{z}/{x}/{y}.png',
    defaultEnabled: false,
  },
  {
    id: 'gdi',
    name: 'Priority Index (GDI)',
    type: 'raster',
    color: '#f59e0b',
    source: 'Composite Multi-Criteria Green Deficit Index',
    endpoint: '/api/tiles/gdi/{z}/{x}/{y}.png',
    defaultEnabled: true,
  },
  {
    id: 'corridors',
    name: 'Van Setu Corridors',
    type: 'vector',
    color: '#00f2fe',
    source: '44 Walkable Corridors FeatureCollection',
    endpoint: '/api/corridors',
    defaultEnabled: true,
  },
  {
    id: 'roads',
    name: 'Road Network',
    type: 'vector',
    color: '#38bdf8',
    source: 'Walkable Street Network Geometry',
    endpoint: '/api/roads/simple',
    defaultEnabled: false,
  },
  {
    id: 'aqi',
    name: 'AQI Stations',
    type: 'vector',
    color: '#a855f7',
    source: 'CPCB CAAQMS Continuous Ambient Air Quality Monitors',
    endpoint: '/api/aqi/stations',
    defaultEnabled: true,
  },
  {
    id: 'osmRoads',
    name: 'Roads Overlay',
    type: 'tile',
    color: '#cbd5e1',
    source: 'Esri World Transportation Reference Overlay',
    endpoint: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    defaultEnabled: true,
  },
  {
    id: 'osmParks',
    name: 'Parks & Green',
    type: 'vector',
    color: '#22c55e',
    source: 'Curated Delhi Urban Forests & Parks GeoJSON',
    endpoint: 'DELHI_PARKS_BASELINE',
    defaultEnabled: true,
  },
  {
    id: 'osmResidential',
    name: 'Residential',
    type: 'vector',
    color: '#d4a76a',
    source: 'Curated Delhi Residential Planning Zones GeoJSON',
    endpoint: 'DELHI_RESIDENTIAL_BASELINE',
    defaultEnabled: false,
  },
];

export default function InteractiveMap({
  corridors,
  selectedCorridor,
  onSelectCorridor,
  selectedDistrict,
  onSelectDistrict,
  aqiStations,
  rasterZones,
  targetLocation,
}) {
  const [basemap, setBasemap] = useState('dark');
  const [rasterOpacity, setRasterOpacity] = useState(0.72);

  // 9 Canonical Spatial Overlays State (Default matches genuine active state)
  const [activeLayers, setActiveLayers] = useState({
    lst: false,
    ndvi: false,
    gdi: true,
    corridors: true,
    roads: false,
    aqi: true,
    osmRoads: true,
    osmParks: true,
    osmResidential: false,
  });

  // Right-Side Dismissible Overlay Panel State (Visible by default)
  const [isOverlaysPanelOpen, setIsOverlaysPanelOpen] = useState(true);

  // Additional Administrative Context Layers
  const [showDistricts, setShowDistricts] = useState(true);
  const [showRasterZones, setShowRasterZones] = useState(false);
  const [roadNetworkData, setRoadNetworkData] = useState(null);

  const [inspectMode, setInspectMode] = useState(true);
  const [inspectedPoint, setInspectedPoint] = useState(null);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Active overlays count for header badge
  const activeLayerCount = Object.values(activeLayers).filter(Boolean).length;

  // Compatibility aliases for tests & external consumers
  const showRoadsOverlay = activeLayers.osmRoads;
  const showParks = activeLayers.osmParks;
  const showResidential = activeLayers.osmResidential;
  const showRoadNetwork = activeLayers.roads;
  const showCorridors = activeLayers.corridors;
  const showAqiStations = activeLayers.aqi;

  const toggleLayer = useCallback((layerId) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  }, []);

  // Determine active raster for legend & point click inspector
  const activeRaster = activeLayers.gdi
    ? 'gdi'
    : activeLayers.lst
    ? 'lst'
    : activeLayers.ndvi
    ? 'ndvi'
    : null;

  const currentRasterMeta = RASTER_LAYERS.find((r) => r.id === activeRaster);

  // Fetch Walkable Road Network on Demand
  useEffect(() => {
    if (activeLayers.roads && !roadNetworkData) {
      api
        .getRoadsSimple()
        .then((res) => {
          setRoadNetworkData(res);
        })
        .catch((err) => {
          console.error('Failed to load walkable road network:', err);
        });
    }
  }, [activeLayers.roads, roadNetworkData]);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <MapContainer
        center={DELHI_CENTER}
        zoom={11}
        minZoom={9}
        maxZoom={17}
        className="w-full h-full z-0"
      >
        <MapViewportController
          selectedCorridor={selectedCorridor}
          fitTrigger={fitTrigger}
          resetTrigger={resetTrigger}
          targetLocation={targetLocation}
        />
        <PointClickInspector
          enabled={inspectMode}
          onPointInspected={(data) => setInspectedPoint(data)}
        />

        {/* 1. Base Map Layer */}
        <TileLayer
          key={basemap}
          url={BASEMAPS[basemap].url}
          attribution={BASEMAPS[basemap].attribution}
        />

        {/* 2. Geospatial Raster Tile Overlays (LST, NDVI, GDI) */}
        {activeLayers.lst && (
          <TileLayer
            key="raster-lst"
            url={getTileUrl('lst')}
            opacity={rasterOpacity}
            zIndex={10}
          />
        )}
        {activeLayers.ndvi && (
          <TileLayer
            key="raster-ndvi"
            url={getTileUrl('ndvi')}
            opacity={rasterOpacity}
            zIndex={11}
          />
        )}
        {activeLayers.gdi && (
          <TileLayer
            key="raster-gdi"
            url={getTileUrl('gdi')}
            opacity={rasterOpacity}
            zIndex={12}
          />
        )}

        {/* 3. Reference Roads Overlay (Esri World_Transportation) */}
        {activeLayers.osmRoads && (
          <TileLayer
            key="esri-roads-overlay"
            url={ESRI_TRANSPORTATION_URL}
            opacity={0.88}
            zIndex={15}
          />
        )}

        {/* 4. Crisp Reference Labels Above Rasters */}
        {BASEMAPS[basemap].labelUrl && (
          <TileLayer
            key={`labels-${basemap}`}
            url={BASEMAPS[basemap].labelUrl}
            opacity={0.9}
            zIndex={16}
          />
        )}

        {/* 5. Parks & Green Spaces Layer */}
        {activeLayers.osmParks && (
          <GeoJSON
            key="delhi-parks-green"
            data={DELHI_PARKS_BASELINE}
            style={() => ({
              color: '#16a34a',
              weight: 1.5,
              fillColor: '#22c55e',
              fillOpacity: 0.32,
            })}
            onEachFeature={(feature, layer) => {
              const name = feature?.properties?.name || 'Urban Green Space';
              const type = feature?.properties?.type || 'Park';
              layer.bindTooltip(`🌳 ${name} (${type})`, { sticky: true });
            }}
          />
        )}

        {/* 6. Residential Planning Zones Layer */}
        {activeLayers.osmResidential && (
          <GeoJSON
            key="delhi-residential-zones"
            data={DELHI_RESIDENTIAL_BASELINE}
            style={() => ({
              color: '#b45309',
              weight: 1.5,
              fillColor: '#d4a76a',
              fillOpacity: 0.22,
            })}
            onEachFeature={(feature, layer) => {
              const name = feature?.properties?.name || 'Residential Zone';
              layer.bindTooltip(`🏘️ ${name}`, { sticky: true });
            }}
          />
        )}

        {/* 7. Walkable Road Network Vector Layer */}
        {activeLayers.roads && roadNetworkData && (
          <GeoJSON
            key="delhi-road-network"
            data={roadNetworkData}
            style={() => ({
              color: '#38bdf8',
              weight: 1.8,
              opacity: 0.65,
            })}
            onEachFeature={(feature, layer) => {
              const p = feature?.properties || {};
              layer.bindTooltip(`🛣️ ${p.name || p.code || 'Road Corridor'} (${p.district || ''})`, {
                sticky: true,
              });
            }}
          />
        )}

        {/* 8. NCT Delhi District Boundaries */}
        {showDistricts && districtsGeoJson && (
          <GeoJSON
            key={`districts-${selectedDistrict}`}
            data={districtsGeoJson}
            style={(feature) => {
              const dName = feature?.properties?.district || feature?.properties?.NAME || '';
              const isDistrictSelected =
                selectedDistrict &&
                selectedDistrict !== 'All Districts' &&
                dName.toLowerCase() === selectedDistrict.toLowerCase();
              return {
                color: isDistrictSelected ? '#10b981' : '#64748b',
                weight: isDistrictSelected ? 2.5 : 1.2,
                dashArray: isDistrictSelected ? '' : '4 4',
                fillColor: isDistrictSelected ? '#10b981' : '#0f172a',
                fillOpacity: isDistrictSelected ? 0.12 : 0.02,
              };
            }}
            onEachFeature={(feature, layer) => {
              const dName = feature?.properties?.district || feature?.properties?.NAME || 'District';
              layer.bindTooltip(dName, { sticky: true, direction: 'center' });
              layer.on({
                click: () => {
                  if (onSelectDistrict) {
                    onSelectDistrict(dName === selectedDistrict ? 'All Districts' : dName);
                  }
                },
              });
            }}
          />
        )}

        {/* 9. Raster Connected-Component Hotspot Polygons */}
        {showRasterZones && rasterZones?.features?.length > 0 && (
          <GeoJSON
            key="raster-hotspot-zones"
            data={rasterZones}
            style={() => ({
              color: '#f43f5e',
              weight: 2,
              fillColor: '#f43f5e',
              fillOpacity: 0.22,
            })}
            onEachFeature={(feature, layer) => {
              const p = feature.properties || {};
              layer.bindTooltip(
                `Raster Hotspot ${p.zone_id}: GDI ${p.gdi_mean} | LST ${p.lst_mean}°C | NDVI ${p.ndvi_mean} (${p.area_km2} km²)`,
                { sticky: true }
              );
            }}
          />
        )}

        {/* 10. Walkable Urban Corridors - Unselected Network */}
        {activeLayers.corridors &&
          corridors
            .filter((corr) => corr.id !== selectedCorridor?.id)
            .map((corr) => {
              const latLngs = parseGeometryToLatLngs(corr.geometry);
              if (!latLngs.length) return null;
              const color = getCorridorColor(corr);
              const score = corr.priority_score ?? corr.score;

              return (
                <Polyline
                  key={corr.id}
                  positions={latLngs}
                  pathOptions={{
                    color: color,
                    weight: selectedCorridor ? 3.5 : 4.5,
                    opacity: selectedCorridor ? 0.70 : 0.88,
                    lineCap: 'round',
                    lineJoin: 'round',
                  }}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent.stopPropagation();
                      onSelectCorridor(corr);
                    },
                  }}
                >
                  <Tooltip sticky>
                    <div className="text-xs font-sans">
                      <div className="font-bold text-slate-900">
                        {corr.code ? `${corr.code} • ` : ''}
                        {corr.rank ? `#${corr.rank} ` : ''}
                        {corr.name}
                      </div>
                      <div className="text-slate-700">
                        District: {corr.district} | Score:{' '}
                        {typeof score === 'number' ? score.toFixed(3) : score}
                      </div>
                      <div className="text-slate-600">
                        LST: {corr.lst_mean}°C (1km native: {corr.lst_native_mean}°C) | NDVI:{' '}
                        {corr.ndvi_mean} | AQI: {corr.aqi}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">
                        Length: {corr.length_km ? `${corr.length_km.toFixed(2)} km` : 'N/A'} • Status:{' '}
                        {corr.status || 'Active'}
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              );
            })}

        {/* 11. Prominently Highlighted Selected Corridor (Bright Cyan Core + Contrast Casing + Floating Label) */}
        {activeLayers.corridors && selectedCorridor && (() => {
          const latLngs = parseGeometryToLatLngs(selectedCorridor.geometry);
          if (!latLngs.length) return null;
          const flat = getFlatLatLngs(latLngs);
          const midpoint = getCorridorMidpoint(flat);
          const score = selectedCorridor.priority_score ?? selectedCorridor.score;
          const scoreFormatted =
            typeof score === 'number' ? score.toFixed(2) : (score || 'N/A');
          const rankVal = selectedCorridor.rank ?? selectedCorridor.priority_rank;

          return (
            <React.Fragment key={`selected-${selectedCorridor.id}`}>
              {/* Outer Cyan Halo / Bloom */}
              <Polyline
                positions={latLngs}
                pane="selectedCorridorCasingPane"
                pathOptions={{
                  pane: 'selectedCorridorCasingPane',
                  color: '#00f5d4',
                  weight: 16,
                  opacity: 0.22,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* High-Contrast Dark Casing Outline Beneath */}
              <Polyline
                positions={latLngs}
                pane="selectedCorridorCasingPane"
                pathOptions={{
                  pane: 'selectedCorridorCasingPane',
                  color: '#021811',
                  weight: 11,
                  opacity: 0.96,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />

              {/* Vibrant Cyan / Turquoise Highlight Core */}
              <Polyline
                positions={latLngs}
                pane="selectedCorridorHighlightPane"
                pathOptions={{
                  pane: 'selectedCorridorHighlightPane',
                  color: '#00f5d4',
                  weight: 6.5,
                  opacity: 1.0,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
                eventHandlers={{
                  click: (e) => {
                    e.originalEvent.stopPropagation();
                    onSelectCorridor(selectedCorridor);
                  },
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-sans">
                    <div className="font-bold text-slate-900">
                      {selectedCorridor.code ? `${selectedCorridor.code} • ` : ''}
                      {rankVal ? `#${rankVal} ` : ''}
                      {selectedCorridor.name}
                    </div>
                    <div className="text-slate-700">
                      District: {selectedCorridor.district} | Score:{' '}
                      {typeof score === 'number' ? score.toFixed(3) : score}
                    </div>
                    <div className="text-slate-600">
                      LST: {selectedCorridor.lst_mean}°C | NDVI: {selectedCorridor.ndvi_mean} | AQI:{' '}
                      {selectedCorridor.aqi}
                    </div>
                  </div>
                </Tooltip>
              </Polyline>

              {/* Floating Corridor Label Positioned Along Midpoint */}
              {midpoint && (
                <Marker
                  position={midpoint}
                  pane="selectedCorridorLabelPane"
                  interactive={false}
                  zIndexOffset={2000}
                  icon={L.divIcon({
                    className: 'vansetu-floating-corridor-label-marker',
                    html: `
                      <div data-testid="selected-corridor-floating-label" class="pointer-events-none select-none inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#071c16]/95 backdrop-blur-md border border-[#00f5d4]/80 shadow-[0_4px_20px_rgba(0,0,0,0.65)] text-xs text-white transform -translate-x-1/2 -translate-y-full mb-3 whitespace-nowrap">
                        <span class="w-2.5 h-2.5 rounded-full bg-[#00f5d4] shadow-[0_0_8px_#00f5d4] animate-pulse"></span>
                        <span class="font-bold text-white tracking-wide">${escapeHtml(selectedCorridor.name)}</span>
                        <span class="text-slate-400">|</span>
                        <span class="text-[#00f5d4] font-mono font-bold">${scoreFormatted} Score</span>
                        ${rankVal ? `<span class="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30 text-[10px] font-mono">#${rankVal}</span>` : ''}
                      </div>
                    `,
                    iconSize: [0, 0],
                    iconAnchor: [0, 0],
                  })}
                />
              )}
            </React.Fragment>
          );
        })()}

        {/* 11. CPCB Air Quality Monitoring Stations */}
        {activeLayers.aqi &&
          aqiStations.map((st) => {
            const [lng, lat] = st.geometry?.coordinates || [0, 0];
            const p = st.properties || {};
            return (
              <CircleMarker
                key={p.id}
                center={[lat, lng]}
                radius={8}
                pathOptions={{
                  color: '#0f172a',
                  weight: 2,
                  fillColor: p.color || '#f97316',
                  fillOpacity: 0.92,
                }}
              >
                <Popup>
                  <div className="text-xs space-y-1.5 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                      <span className="font-bold text-emerald-400">{p.name}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        style={{ backgroundColor: p.color, color: '#0f172a' }}
                      >
                        AQI {p.aqi} ({p.category})
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-center bg-slate-900/90 p-1.5 rounded">
                      <div>
                        <div className="text-[10px] text-slate-400">PM2.5</div>
                        <div className="font-semibold text-slate-100">{p.pm25} µg/m³</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">PM10</div>
                        <div className="font-semibold text-slate-100">{p.pm10} µg/m³</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">NO₂</div>
                        <div className="font-semibold text-slate-100">{p.no2} µg/m³</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <span className="text-slate-400">Type:</span> {p.station_type}
                    </div>
                    <div className="pt-1 border-t border-slate-800 text-[10px] text-amber-300/90">
                      {p.is_live ? (
                        <span>Live Sensor Telemetry ({p.observation_period})</span>
                      ) : (
                        <span>
                          Historical Reference Baseline ({p.observation_period}) — Not live sensor stream
                        </span>
                      )}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

        {/* 12. Point Inspection Marker */}
        {inspectedPoint && inspectedPoint.in_bounds && (
          <CircleMarker
            center={[inspectedPoint.lat, inspectedPoint.lng]}
            radius={6}
            pathOptions={{
              color: '#38bdf8',
              weight: 2,
              fillColor: '#0284c7',
              fillOpacity: 0.9,
            }}
          >
            <Popup
              position={[inspectedPoint.lat, inspectedPoint.lng]}
              onClose={() => setInspectedPoint(null)}
            >
              <div className="text-xs space-y-2 min-w-[235px]">
                <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                  <span className="font-bold text-sky-400">Geospatial Pixel Inspection</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {inspectedPoint.lat.toFixed(4)}°N, {inspectedPoint.lng.toFixed(4)}°E
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-900 p-2 rounded border border-slate-800">
                  <div>
                    <div className="text-[10px] text-slate-400">MODIS LST (1km Native)</div>
                    <div className="font-bold text-orange-400">
                      {inspectedPoint.lst_native_1km !== null
                        ? `${inspectedPoint.lst_native_1km}°C`
                        : 'NoData'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">MODIS LST (10m Display)</div>
                    <div className="font-semibold text-amber-300">
                      {inspectedPoint.lst_display_10m !== null
                        ? `${inspectedPoint.lst_display_10m}°C`
                        : 'NoData'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Sentinel-2 NDVI (10m)</div>
                    <div className="font-bold text-emerald-400">
                      {inspectedPoint.ndvi !== null ? inspectedPoint.ndvi : 'NoData'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Composite GDI</div>
                    <div className="font-bold text-rose-400">
                      {inspectedPoint.gdi !== null ? inspectedPoint.gdi : 'NoData'}
                    </div>
                  </div>
                </div>
                {inspectedPoint.aqi_observation && (
                  <div className="text-[11px] text-slate-300 border-t border-slate-800 pt-1">
                    Nearest CPCB Station:{' '}
                    <span className="font-semibold text-white">
                      {inspectedPoint.aqi_observation.station_name}
                    </span>{' '}
                    ({inspectedPoint.aqi_observation.distance_km} km) — AQI{' '}
                    <span className="font-bold text-amber-400">
                      {inspectedPoint.aqi_observation.aqi}
                    </span>
                  </div>
                )}
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* 13. Location Search Pin Marker */}
        {targetLocation && targetLocation.lat && targetLocation.lon && (
          <CircleMarker
            center={[targetLocation.lat, targetLocation.lon]}
            radius={9}
            pathOptions={{
              color: '#10b981',
              weight: 3,
              fillColor: '#34d399',
              fillOpacity: 0.9,
            }}
          >
            <Popup position={[targetLocation.lat, targetLocation.lon]}>
              <div className="text-xs p-1">
                <div className="font-bold text-slate-900">{targetLocation.name}</div>
                <div className="text-slate-600 text-[10px]">
                  {targetLocation.lat.toFixed(4)}°N, {targetLocation.lon.toFixed(4)}°E
                </div>
              </div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Top-Left Selected District Pill & Clear Action */}
      {selectedDistrict && selectedDistrict !== 'All Districts' && (
        <div
          data-testid="district-filter-pill"
          className="absolute top-3 left-12 z-[400] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-xl flex items-center gap-2 text-xs text-white"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">{selectedDistrict} District</span>
          <button
            type="button"
            onClick={() => onSelectDistrict && onSelectDistrict('All Districts')}
            className="text-slate-400 hover:text-white ml-1 p-0.5 rounded hover:bg-slate-800"
            aria-label="Clear district filter"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right-Side Dismissible OVERLAYS Panel (Visible by default) */}
      {isOverlaysPanelOpen && (
        <div
          data-testid="floating-overlays-card"
          className={`absolute top-3 ${
            selectedCorridor ? 'right-4 md:right-[25.5rem]' : 'right-4'
          } z-[400] w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-120px)] flex flex-col bg-[#071C16]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 shadow-2xl transition-all`}
          role="region"
          aria-label="Map Overlays Panel"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                OVERLAYS ({activeLayerCount} Active)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="basemap-toggle-btn"
                onClick={() => setBasemap((b) => (b === 'dark' ? 'satellite' : 'dark'))}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-300 border border-white/10 transition"
                title="Switch between Dark Canvas and Satellite Imagery basemap"
              >
                {basemap === 'dark' ? '🛰️ Satellite' : '🗺️ Dark Canvas'}
              </button>
              <button
                type="button"
                data-testid="close-overlays-panel-btn"
                onClick={() => setIsOverlaysPanelOpen(false)}
                aria-label="Close overlays panel"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 9 Overlays Checkboxes List */}
          <div
            className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs"
            role="group"
            aria-label="Map Layer Toggles"
          >
            {OVERLAY_DEFINITIONS.map((layer) => {
              const isChecked = Boolean(activeLayers[layer.id]);
              return (
                <label
                  key={layer.id}
                  data-testid={`layer-toggle-${layer.id}`}
                  className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition select-none ${
                    isChecked ? 'bg-white/5 text-white' : 'text-slate-300 hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: layer.color }}
                    />
                    <span className="font-medium text-[11px] leading-tight">
                      {layer.name}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleLayer(layer.id)}
                    aria-label={`Toggle ${layer.name}`}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                  />
                </label>
              );
            })}
          </div>

          {/* Dynamic Scientific Legend & Opacity */}
          {currentRasterMeta && (
            <div className="mt-2.5 pt-2 border-t border-white/10 space-y-1.5" data-testid="map-active-legend">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-200 truncate">
                  {currentRasterMeta.label}
                </span>
                <div className="flex items-center gap-1 text-slate-400">
                  <Eye className="w-3 h-3" />
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={rasterOpacity}
                    onChange={(e) => setRasterOpacity(parseFloat(e.target.value))}
                    className="w-14 accent-emerald-500 cursor-pointer"
                    title="Raster overlay opacity"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[9px]">
                {currentRasterMeta.stops.map((st, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-slate-300">
                    <span
                      className="w-2 h-2 rounded-sm shrink-0 border border-slate-700"
                      style={{ backgroundColor: st.color }}
                    />
                    <span className="truncate">{st.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Panel Footer Quick Actions */}
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5">
            {selectedCorridor && (
              <button
                type="button"
                data-testid="fit-corridor-btn"
                onClick={() => setFitTrigger((c) => c + 1)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center justify-center gap-1 shadow transition"
                title="Zoom directly to selected corridor"
              >
                🎯 Fit Corridor
              </button>
            )}
            <button
              type="button"
              data-testid="reset-map-view-btn"
              onClick={() => {
                if (onSelectDistrict) onSelectDistrict('All Districts');
                setResetTrigger((c) => c + 1);
              }}
              className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1 border border-white/10 transition"
              title="Reset map view to NCT Delhi overview"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              🗺️ Reset View
            </button>
          </div>
        </div>
      )}

      {/* Floating Reopen Button (Visible when Overlay Panel is Dismissed) */}
      {!isOverlaysPanelOpen && (
        <div
          className={`absolute top-3 ${
            selectedCorridor ? 'right-4 md:right-[25.5rem]' : 'right-4'
          } z-[400] flex items-center gap-2`}
        >
          {selectedCorridor && (
            <button
              type="button"
              data-testid="fit-corridor-btn"
              onClick={() => setFitTrigger((c) => c + 1)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xl backdrop-blur-md border border-emerald-400/40 transition"
              title="Zoom directly to selected corridor"
            >
              🎯 Fit Corridor
            </button>
          )}
          <button
            type="button"
            data-testid="reset-map-view-btn"
            onClick={() => {
              if (onSelectDistrict) onSelectDistrict('All Districts');
              setResetTrigger((c) => c + 1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center gap-1.5 shadow-xl backdrop-blur-md border border-white/10 transition"
            title="Reset map view to NCT Delhi overview"
          >
            <RotateCcw className="w-3 h-3 text-slate-400" />
            🗺️ Reset View
          </button>
          <button
            type="button"
            data-testid="open-overlays-panel-btn"
            onClick={() => setIsOverlaysPanelOpen(true)}
            aria-label="Open Map Overlays panel"
            className="px-3.5 py-1.5 rounded-xl bg-[#071C16]/95 hover:bg-[#12392B] border border-white/20 text-white font-semibold text-xs flex items-center gap-2 shadow-2xl backdrop-blur-md transition-all hover:border-emerald-400"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>OVERLAYS ({activeLayerCount} Active)</span>
          </button>
        </div>
      )}
    </div>
  );
}
