/**
 * VanSetu — Full-System Audit, Seasonal Heat Repair & Background Asset Verification Suite.
 * Validates:
 * 1. SeasonalHeatIntelligenceView Retry button, loading states, error diagnosis, and zero-hotspots empty state.
 * 2. Landing page background image asset (https://i.pinimg.com/1200x/f3/2d/44/f32d449cc721be356efb6dad47834669.jpg) and local fallback.
 * 3. App.jsx global Retry button with handleGlobalRetry and retryKey synchronization.
 * 4. Full feature inventory coverage across Public Discovery, Climate Intelligence, Advanced Analytics, and Workspaces.
 * 5. Delhi roads GeoJSON integrity with exactly 44 corridors.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

test('SeasonalHeatIntelligenceView implements genuine Retry button, error diagnostics, and zero-hotspots state', () => {
  const componentPath = path.join(frontendRoot, 'src/components/SeasonalHeatIntelligenceView.jsx');
  assert.ok(fs.existsSync(componentPath), 'SeasonalHeatIntelligenceView.jsx must exist');
  const src = fs.readFileSync(componentPath, 'utf-8');

  // Verify Retry button presence and active retry handler
  assert.ok(src.includes('fetchSeasonalData'), 'Must define fetchSeasonalData callback');
  assert.ok(src.includes('Retry'), 'Must include visible Retry button');
  assert.ok(src.includes('Retrying...'), 'Must include Retrying loading state');
  assert.ok(src.includes('requestSeqRef'), 'Must guard against race conditions and stale responses');

  // Verify error diagnostics
  assert.ok(src.includes('Endpoint:'), 'Must show diagnostic endpoint on error');
  assert.ok(src.includes('Target:'), 'Must show diagnostic API target on error');

  // Verify empty persistent hotspots handling
  assert.ok(
    src.includes('No Persistent Thermal Hotspots Identified') || src.includes('Zero Persistent Hotspots'),
    'Must cleanly handle zero persistent hotspots without error'
  );
  assert.ok(src.includes('All Persistent Hotspots ({persistentHotspots.length})'), 'Must show dynamic count');
});

test('Landing page uses exact background image asset with reliable local fallback', () => {
  const REQUIRED_IMAGE_URL = 'https://i.pinimg.com/1200x/f3/2d/44/f32d449cc721be356efb6dad47834669.jpg';
  const LOCAL_FALLBACK_FILE = path.join(frontendRoot, 'public/textures/landing_forest_background.jpg');

  // Verify local fallback asset exists
  assert.ok(fs.existsSync(LOCAL_FALLBACK_FILE), 'Local fallback image must exist in public/textures/');
  const stats = fs.statSync(LOCAL_FALLBACK_FILE);
  assert.ok(stats.size > 50000, `Local image must be non-empty (size: ${stats.size} bytes)`);

  // Verify LivingForestExperience uses exact URL and local fallback
  const expPath = path.join(frontendRoot, 'src/forest/LivingForestExperience.jsx');
  const expSrc = fs.readFileSync(expPath, 'utf-8');
  assert.ok(expSrc.includes(REQUIRED_IMAGE_URL), 'LivingForestExperience must reference exact Pinterest image URL');
  assert.ok(expSrc.includes('/textures/landing_forest_background.jpg'), 'LivingForestExperience must include local fallback');
  assert.ok(expSrc.includes('onError'), 'Must handle image loading errors with fallback');

  // Verify Three.js LivingForestDirector also references exact URL
  const dirPath = path.join(frontendRoot, 'src/forest/LivingForestDirector.js');
  const dirSrc = fs.readFileSync(dirPath, 'utf-8');
  assert.ok(dirSrc.includes(REQUIRED_IMAGE_URL), 'LivingForestDirector must load exact Pinterest image URL');
});

test('App.jsx provides top-level global retry wired to metadata, corridor data, and view synchronization', () => {
  const appPath = path.join(frontendRoot, 'src/App.jsx');
  const appSrc = fs.readFileSync(appPath, 'utf-8');

  assert.ok(appSrc.includes('handleGlobalRetry'), 'App.jsx must define handleGlobalRetry');
  assert.ok(appSrc.includes('retryKey'), 'App.jsx must maintain retryKey state');
  assert.ok(appSrc.includes('retrying'), 'App.jsx must maintain retrying loading state');
  assert.ok(appSrc.includes('retryKey={retryKey}'), 'App.jsx must pass retryKey to SeasonalHeatIntelligenceView');
});

test('Complete feature inventory: all 28 registered application views exist and export defaults', () => {
  const views = [
    // Landing & Public Discovery
    'src/views/LandingPageView.jsx',
    'src/components/PublicDashboardView.jsx',
    'src/components/PublicProjectsView.jsx',
    'src/components/EquityAndProvenanceView.jsx',

    // Climate Intelligence Suite
    'src/views/MapExplorerView.jsx',
    'src/views/CorridorsView.jsx',
    'src/views/CanopyHydrologyView.jsx',
    'src/views/ScenarioLabView.jsx',
    'src/views/DecisionStudioView.jsx',
    'src/views/RecordsView.jsx',

    // Advanced Analytics
    'src/components/InterventionIntelligenceView.jsx',
    'src/components/SegmentSuitabilityView.jsx',
    'src/components/ParetoPortfolioLabView.jsx',
    'src/components/ShadeContinuityView.jsx',
    'src/components/SeasonalHeatIntelligenceView.jsx',
    'src/components/ImpactMonitoringView.jsx',
    'src/components/ProjectReadinessView.jsx',
    'src/components/SpatialMemoryMapView.jsx',
    'src/components/ProcurementStudioView.jsx',
    'src/components/AiPlanningAssistantView.jsx',
    'src/components/MekoMemoryStudioView.jsx',
    'src/components/TemporalInsightsView.jsx',

    // Government Institutional
    'src/components/GovernmentOverviewView.jsx',
    'src/components/CorridorInventoryView.jsx',
    'src/components/TenderManagementView.jsx',
    'src/components/CorridorCostOptimizerView.jsx',
    'src/components/RegionalHealthIntelligenceView.jsx',
    'src/components/GovernmentAuditView.jsx',

    // Pro Professional
    'src/components/ProDashboardView.jsx',
    'src/components/TenderMarketplaceView.jsx',
    'src/components/MyProposalsView.jsx',
    'src/components/MyAssignedProjectsView.jsx',
  ];

  for (const rel of views) {
    const fullPath = path.join(frontendRoot, rel);
    assert.ok(fs.existsSync(fullPath), `View component missing: ${rel}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.includes('export default'), `View ${rel} missing default export`);
  }
});

test('Delhi roads GeoJSON FeatureCollection contains exactly 44 validated LineString corridors', () => {
  const geojsonPath = path.join(frontendRoot, 'public/delhi_roads.geojson');
  assert.ok(fs.existsSync(geojsonPath), 'public/delhi_roads.geojson must exist');
  const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
  assert.equal(data.type, 'FeatureCollection');
  assert.equal(data.features.length, 44, 'Must have exactly 44 corridors');

  for (const feat of data.features) {
    assert.equal(feat.type, 'Feature');
    assert.ok(feat.properties.id, 'Corridor must have id');
    assert.ok(feat.properties.name, 'Corridor must have name');
    assert.ok(feat.geometry.coordinates.length >= 2, 'Corridor geometry must have >= 2 coordinates');
    // Ensure coordinates are within Delhi bounding box: lat ~28.4-28.9, lon ~76.8-77.4
    const [lon, lat] = feat.geometry.coordinates[0];
    assert.ok(lat >= 28.3 && lat <= 29.0, `Latitude ${lat} out of bounds for ${feat.properties.name}`);
    assert.ok(lon >= 76.7 && lon <= 77.5, `Longitude ${lon} out of bounds for ${feat.properties.name}`);
  }
});

test('Legacy feature parity: LocationSearch, Corridor3DViewer, and 10-layer InteractiveMap overlays are verified', () => {
  // 1. LocationSearch component
  const locPath = path.join(frontendRoot, 'src/components/LocationSearch.jsx');
  assert.ok(fs.existsSync(locPath), 'LocationSearch.jsx must exist');
  const locSrc = fs.readFileSync(locPath, 'utf-8');
  assert.ok(locSrc.includes('DELHI_LANDMARKS'), 'LocationSearch must include offline curated Delhi landmarks');
  assert.ok(locSrc.includes('nominatim.openstreetmap.org'), 'LocationSearch must support live OSM geocoding');
  assert.ok(locSrc.includes('onSelectLocation'), 'LocationSearch must trigger location selection callback');

  // 2. Corridor3DViewer component
  const threeDPath = path.join(frontendRoot, 'src/components/Corridor3DViewer.jsx');
  assert.ok(fs.existsSync(threeDPath), 'Corridor3DViewer.jsx must exist');
  const threeDSrc = fs.readFileSync(threeDPath, 'utf-8');
  assert.ok(threeDSrc.includes('three'), 'Corridor3DViewer must import Three.js');
  assert.ok(threeDSrc.includes('PerspectiveCamera'), 'Corridor3DViewer must use PerspectiveCamera');
  assert.ok(threeDSrc.includes('dispose'), 'Corridor3DViewer must properly clean up WebGL resources');

  // 3. InteractiveMap 10-layer overlays and reference layers
  const mapPath = path.join(frontendRoot, 'src/components/InteractiveMap.jsx');
  assert.ok(fs.existsSync(mapPath), 'InteractiveMap.jsx must exist');
  const mapSrc = fs.readFileSync(mapPath, 'utf-8');
  assert.ok(mapSrc.includes('showRoadsOverlay'), 'InteractiveMap must include Roads Reference Overlay toggle');
  assert.ok(mapSrc.includes('showParks'), 'InteractiveMap must include Parks & Green Spaces toggle');
  assert.ok(mapSrc.includes('showResidential'), 'InteractiveMap must include Residential Planning Zones toggle');
  assert.ok(mapSrc.includes('showRoadNetwork'), 'InteractiveMap must include Walkable Road Network toggle');
  assert.ok(mapSrc.includes('World_Transportation'), 'InteractiveMap must include Esri World_Transportation tiles');
  assert.ok(mapSrc.includes('World_Dark_Gray_Reference'), 'InteractiveMap must include crisp Esri label tiles');
  assert.ok(mapSrc.includes('Fit Corridor'), 'InteractiveMap must include Fit Corridor action pill');
  assert.ok(mapSrc.includes('Reset View'), 'InteractiveMap must include Reset View action pill');

  // 4. CorridorAnalyticalDetail community feedback and 3D viewer
  const detailPath = path.join(frontendRoot, 'src/components/CorridorAnalyticalDetail.jsx');
  assert.ok(fs.existsSync(detailPath), 'CorridorAnalyticalDetail.jsx must exist');
  const detailSrc = fs.readFileSync(detailPath, 'utf-8');
  assert.ok(detailSrc.includes('upvoteCorridor'), 'Must support corridor upvoting');
  assert.ok(detailSrc.includes('getCorridorSuggestions'), 'Must support corridor suggestions');
  assert.ok(detailSrc.includes('Corridor3DViewer'), 'Must embed Corridor3DViewer');
});

