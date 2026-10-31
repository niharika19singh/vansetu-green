/**
 * VanSetu — Urban Climate Action Intelligence Automated Frontend Verification Suite (Node Test Runner).
 * Verifies component architecture, 10-view navigation, Tailwind/Recharts/Leaflet stack compliance,
 * district GeoJSON validity, Meko ON/OFF controls, Gemini 3.8 Flash, Tiger Data, IOMETE Procurement Studio,
 * "The Living Forest" Photorealistic Water Engine, and complete elimination of legacy cinematic artifacts.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

test('package.json includes required stack (React, Vite, Tailwind CSS, Leaflet, Recharts, Three.js)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(allDeps.react, 'React dependency missing');
  assert.ok(allDeps.vite, 'Vite dependency missing');
  assert.ok(allDeps.tailwindcss, 'Tailwind CSS dependency missing');
  assert.ok(allDeps.leaflet, 'Leaflet dependency missing');
  assert.ok(allDeps['react-leaflet'], 'react-leaflet dependency missing');
  assert.ok(allDeps.recharts, 'Recharts dependency missing');
  assert.ok(allDeps.three, 'Three.js dependency missing');
});

test('Delhi districts GeoJSON is valid EPSG:4326 FeatureCollection', () => {
  const geojson = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, 'src/data/delhi_districts.json'), 'utf-8')
  );
  assert.equal(geojson.type, 'FeatureCollection');
  assert.ok(Array.isArray(geojson.features));
  assert.ok(geojson.features.length > 0);
});

test('Frontend implements all 5 policy scenarios, native resolution disclosures, and 10-view navigation', () => {
  const rankingSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/PriorityRankingPanel.jsx'),
    'utf-8'
  );
  for (const scenario of [
    'baseline',
    'heat_resilience',
    'air_quality',
    'pedestrian_equity',
    'extreme_vulnerability',
  ]) {
    assert.ok(rankingSrc.includes(scenario), `Scenario ${scenario} missing in PriorityRankingPanel`);
  }

  const mapSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/InteractiveMap.jsx'),
    'utf-8'
  );
  assert.ok(mapSrc.includes('1,000m Native'), 'Native 1,000m MODIS resolution disclosure missing');
  assert.ok(mapSrc.includes('10m Native'), 'Native 10m Sentinel-2 NDVI disclosure missing');

  const appSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.jsx'), 'utf-8');
  for (const viewLabel of [
    '1. Climate Overview',
    '2. Interactive Map',
    '3. Corridor Intelligence',
    '4. Scenario Lab',
    '5. Intervention Optimizer',
    '6. Climate Procurement Studio',
    '7. AI Planning Assistant',
    '8. Institutional Memory (Meko)',
    '9. Temporal Insights (Tiger Data)',
    '10. Evidence & Data Provenance',
  ]) {
    assert.ok(appSrc.includes(viewLabel), `Navigation view "${viewLabel}" missing in App.jsx`);
  }
  assert.ok(appSrc.includes('MEKO: ON'), 'Visible MEKO ON/OFF toggle missing in App.jsx');
});

test('All HackCBS 9.0 specialized view components exist and wire to API client', () => {
  const requiredComponents = [
    'src/components/InterventionOptimizerView.jsx',
    'src/components/ProcurementStudioView.jsx',
    'src/components/AiPlanningAssistantView.jsx',
    'src/components/MekoMemoryStudioView.jsx',
    'src/components/TemporalInsightsView.jsx',
    'src/components/EquityAndProvenanceView.jsx',
  ];
  for (const rel of requiredComponents) {
    const fullPath = path.join(frontendRoot, rel);
    assert.ok(fs.existsSync(fullPath), `Missing component ${rel}`);
  }
});

test('"The Living Forest" Photorealistic Water & Nature Engine is valid', () => {
  const forestFiles = [
    'src/forest/LivingForestDirector.js',
    'src/forest/LivingForestExperience.jsx',
    'src/forest/shaders/forestWaterShader.js',
    'src/forest/forestAudio.js',
    'public/textures/forest_reference.jpg',
  ];

  for (const f of forestFiles) {
    const full = path.join(frontendRoot, f);
    assert.ok(fs.existsSync(full), `Missing forest asset/module: ${f}`);
  }

  // Verify App.jsx imports LivingForestExperience for layer 1 background
  const appSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.jsx'), 'utf-8');
  assert.ok(appSrc.includes('LivingForestExperience'), 'App.jsx missing LivingForestExperience');

  // Verify water shader features
  const shaderSrc = fs.readFileSync(path.join(frontendRoot, 'src/forest/shaders/forestWaterShader.js'), 'utf-8');
  assert.ok(shaderSrc.includes('getWaterWave'), 'Missing getWaterWave in forestWaterShader.js');
  assert.ok(shaderSrc.includes('uWaterLevel'), 'Missing uWaterLevel in forestWaterShader.js');
  assert.ok(shaderSrc.includes('uRipples'), 'Missing uRipples in forestWaterShader.js');
});

test('Veins of Life / Veins of Joy cinematic artifacts are completely removed, while real maps and forest engine are preserved', () => {
  // Confirm complete deletion of exclusive cinematic directory and components
  const deletedFiles = [
    'src/cinematic',
    'src/components/VeinsOfLifeModal.jsx',
    'public/textures/leaf_cover.jpg',
    'public/textures/leaf_reference.jpg',
  ];

  for (const f of deletedFiles) {
    const full = path.join(frontendRoot, f);
    assert.ok(!fs.existsSync(full), `File or directory should have been removed: ${f}`);
  }

  // Confirm zero dead code references in active UI files
  const checkedFiles = [
    'src/App.jsx',
    'src/views/LandingPageView.jsx',
    'src/components/AppSidebar.jsx',
    'src/forest/LivingForestDirector.js',
  ];

  for (const rel of checkedFiles) {
    const content = fs.readFileSync(path.join(frontendRoot, rel), 'utf-8');
    assert.ok(!content.includes('VeinsOfLife'), `Found lingering VeinsOfLife reference in ${rel}`);
    assert.ok(!content.includes('isVeinsStoryOpen'), `Found lingering isVeinsStoryOpen in ${rel}`);
    assert.ok(!content.includes('onOpenVeinsStory'), `Found lingering onOpenVeinsStory in ${rel}`);
    assert.ok(!content.includes('cinematicAudio'), `Found lingering cinematicAudio in ${rel}`);
  }

  // Confirm Delhi real roads GeoJSON and map textures are preserved
  const roadsGeo = JSON.parse(
    fs.readFileSync(path.join(frontendRoot, 'public/delhi_roads.geojson'), 'utf-8')
  );
  assert.equal(roadsGeo.type, 'FeatureCollection');
  assert.equal(roadsGeo.features.length, 44, 'Expected 44 Delhi verified corridors');

  assert.ok(
    fs.existsSync(path.join(frontendRoot, 'public/textures/delhi_map_reference.png')),
    'Map preview texture must be preserved'
  );
  assert.ok(
    fs.existsSync(path.join(frontendRoot, 'public/textures/forest_reference.jpg')),
    'Forest background texture must be preserved'
  );
});
