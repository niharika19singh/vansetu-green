import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Polyline,
  CircleMarker,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import {
  Layers,
  Thermometer,
  Trees,
  Wind,
  Crosshair,
  ShieldAlert,
  Eye,
  Compass,
} from 'lucide-react';
import { getTileUrl, api } from '../api/client';
import districtsGeoJson from '../data/delhi_districts.json';

const DELHI_CENTER = [28.6289, 77.2195];

const BASEMAPS = {
  dark: {
    id: 'dark',
    label: 'Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
  },
  streets: {
    id: 'streets',
    label: 'Street Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
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

function MapViewportController({ selectedCorridor }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (selectedCorridor && selectedCorridor.centroid) {
      const [lat, lng] = selectedCorridor.centroid;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { duration: 0.8 });
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

export default function InteractiveMap({
  corridors,
  selectedCorridor,
  onSelectCorridor,
  selectedDistrict,
  onSelectDistrict,
  aqiStations,
  rasterZones,
}) {
  const [basemap, setBasemap] = useState('dark');
  const [activeRaster, setActiveRaster] = useState('gdi');
  const [rasterOpacity, setRasterOpacity] = useState(0.72);
  const [showCorridors, setShowCorridors] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [showAqiStations, setShowAqiStations] = useState(true);
  const [showRasterZones, setShowRasterZones] = useState(false);
  const [inspectMode, setInspectMode] = useState(true);
  const [inspectedPoint, setInspectedPoint] = useState(null);

  const currentRasterMeta = RASTER_LAYERS.find((r) => r.id === activeRaster);

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none">
      <MapContainer
        center={DELHI_CENTER}
        zoom={11}
        minZoom={9}
        maxZoom={17}
        className="w-full h-full z-0"
      >
        <MapViewportController selectedCorridor={selectedCorridor} />
        <PointClickInspector
          enabled={inspectMode}
          onPointInspected={(data) => setInspectedPoint(data)}
        />

        {/* Basemap Layer */}
        <TileLayer
          key={basemap}
          url={BASEMAPS[basemap].url}
          attribution={BASEMAPS[basemap].attribution}
        />

        {/* Geospatial Raster Tile Overlay (NDVI, LST, or GDI) */}
        {activeRaster !== 'none' && (
          <TileLayer
            key={`raster-${activeRaster}`}
            url={getTileUrl(activeRaster)}
            opacity={rasterOpacity}
            zIndex={10}
          />
        )}

        {/* NCT Delhi District Boundaries */}
        {showDistricts && districtsGeoJson && (
          <GeoJSON
            key={`districts-${selectedDistrict}`}
            data={districtsGeoJson}
            style={(feature) => {
              const dName = feature?.properties?.district || feature?.properties?.NAME || '';
              const isSelected =
                selectedDistrict &&
                selectedDistrict !== 'All Districts' &&
                dName.toLowerCase() === selectedDistrict.toLowerCase();
              return {
                color: isSelected ? '#10b981' : '#64748b',
                weight: isSelected ? 2.5 : 1.2,
                dashArray: isSelected ? '' : '4 4',
                fillColor: isSelected ? '#10b981' : '#0f172a',
                fillOpacity: isSelected ? 0.12 : 0.02,
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

        {/* Raster Connected-Component Hotspot Polygons */}
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

        {/* 44 Walkable Urban Corridors */}
        {showCorridors &&
          corridors.map((corr) => {
            const coords = corr.geometry?.coordinates || [];
            if (!coords.length) return null;
            const latLngs = coords.map(([lng, lat]) => [lat, lng]);
            const isSelected = selectedCorridor?.id === corr.id;

            return (
              <React.Fragment key={corr.id}>
                {isSelected && (
                  <Polyline
                    positions={latLngs}
                    pathOptions={{
                      color: '#34d399',
                      weight: 11,
                      opacity: 0.45,
                    }}
                  />
                )}
                <Polyline
                  positions={latLngs}
                  pathOptions={{
                    color: isSelected ? '#10b981' : corr.severity_color || '#f97316',
                    weight: isSelected ? 6 : 4,
                    opacity: isSelected ? 1.0 : 0.88,
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
                        #{corr.rank} {corr.name}
                      </div>
                      <div className="text-slate-700">
                        District: {corr.district} | Score: {corr.priority_score?.toFixed(3)}
                      </div>
                      <div className="text-slate-600">
                        LST: {corr.lst_mean}°C (1km native: {corr.lst_native_mean}°C) | NDVI:{' '}
                        {corr.ndvi_mean} | AQI: {corr.aqi}
                      </div>
                    </div>
                  </Tooltip>
                </Polyline>
              </React.Fragment>
            );
          })}

        {/* CPCB Air Quality Monitoring Stations */}
        {showAqiStations &&
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

        {/* Point Inspection Marker & Resolution Comparison Popup */}
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
      </MapContainer>

      {/* Top-Left Layer & Raster Control Bar */}
      <div className="absolute top-3 left-12 z-[400] flex flex-wrap items-center gap-2 max-w-[calc(100%-3.5rem)]">
        {/* Raster Layer Selector */}
        <div className="flex items-center bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl">
          <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Raster:
          </span>
          {RASTER_LAYERS.map((layer) => (
            <button
              key={layer.id}
              onClick={() => setActiveRaster(layer.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                activeRaster === layer.id
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {layer.shortLabel}
            </button>
          ))}
          <button
            onClick={() => setActiveRaster('none')}
            className={`px-2 py-1 rounded text-xs font-medium transition ${
              activeRaster === 'none'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            Off
          </button>
        </div>

        {/* Vector Overlays & Basemap Toggles */}
        <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl">
          <button
            onClick={() => setShowCorridors((v) => !v)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
              showCorridors
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Trees className="w-3.5 h-3.5" /> Corridors (44)
          </button>
          <button
            onClick={() => setShowAqiStations((v) => !v)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
              showAqiStations
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" /> CPCB AQI (8)
          </button>
          <button
            onClick={() => setShowRasterZones((v) => !v)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
              showRasterZones
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" /> Raster Hotspots
          </button>
          <button
            onClick={() => setShowDistricts((v) => !v)}
            className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition ${
              showDistricts
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> Districts (11)
          </button>
        </div>

        {/* Basemap Switcher */}
        <div className="flex items-center bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl">
          {Object.values(BASEMAPS).map((bm) => (
            <button
              key={bm.id}
              onClick={() => setBasemap(bm.id)}
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                basemap === bm.id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {bm.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom-Left Scientific Resolution & Legend Card */}
      {currentRasterMeta && (
        <div className="absolute bottom-4 left-4 z-[400] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 shadow-2xl max-w-xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-100">{currentRasterMeta.label}</span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
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

          <div className="grid grid-cols-2 gap-1.5 text-[10px] bg-slate-950/90 p-1.5 rounded border border-slate-800">
            <div>
              <span className="text-slate-400 block">Native Resolution</span>
              <span className="font-mono font-semibold text-emerald-400">
                {currentRasterMeta.nativeRes}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">Display Grid</span>
              <span className="font-mono font-semibold text-amber-300">
                {currentRasterMeta.displayRes}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 pt-0.5">
            {currentRasterMeta.stops.map((st, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[10px] text-slate-300">
                <span
                  className="w-3 h-3 rounded-sm shrink-0 border border-slate-700"
                  style={{ backgroundColor: st.color }}
                />
                <span className="truncate">{st.label}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-1 border-t border-slate-800">
            <Crosshair className="w-3 h-3 text-sky-400 shrink-0" />
            <span>Click any map pixel to inspect native 1km LST vs 10m NDVI</span>
          </div>
        </div>
      )}
    </div>
  );
}
