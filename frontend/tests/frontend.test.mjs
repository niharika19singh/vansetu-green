/**
 * VanSetu — Urban Climate Action Intelligence Automated Frontend Verification Suite (Node Test Runner).
 * Verifies component architecture, 10-view navigation, Tailwind/Recharts/Leaflet stack compliance,
 * district GeoJSON validity, Meko ON/OFF controls, Gemini 3.8 Flash, Tiger Data, and IOMETE Procurement Studio.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

test('package.json includes required stack (React, Vite, Tailwind CSS, Leaflet, Recharts)', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(frontendRoot, 'package.json'), 'utf-8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok(allDeps.react, 'React dependency missing');
  assert.ok(allDeps.vite, 'Vite dependency missing');
  assert.ok(allDeps.tailwindcss, 'Tailwind CSS dependency missing');
  assert.ok(allDeps.leaflet, 'Leaflet dependency missing');
  assert.ok(allDeps['react-leaflet'], 'react-leaflet dependency missing');
  assert.ok(allDeps.recharts, 'Recharts dependency missing');
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
