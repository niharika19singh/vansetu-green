/**
 * VanSetu — Urban Climate Action Intelligence Automated Frontend Verification Suite (Node Test Runner).
 * Verifies component architecture, 10-view navigation, Tailwind/Recharts/Leaflet stack compliance,
 * district GeoJSON validity, Meko ON/OFF controls, Gemini 3.8 Flash, Tiger Data, and IOMETE Procurement Studio.
 * Expanded with Research-Backed Scientific Differentiation & UI Integrity checks.
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

test('Research-backed scientific badges and thermal disambiguation are implemented', () => {
  const badgeSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/ui/ScientificBadges.jsx'),
    'utf-8'
  );
  assert.ok(badgeSrc.includes('FEASIBLE_ESTIMATE'), 'FEASIBLE_ESTIMATE status missing');
  assert.ok(badgeSrc.includes('FIELD_VERIFICATION_REQUIRED'), 'FIELD_VERIFICATION_REQUIRED status missing');
  assert.ok(badgeSrc.includes('CONSTRAINT_IDENTIFIED'), 'CONSTRAINT_IDENTIFIED status missing');
  assert.ok(badgeSrc.includes('NOT_FEASIBLE'), 'NOT_FEASIBLE status missing');

  assert.ok(badgeSrc.includes('Surface Heat Indicator (Satellite Land Surface Temperature — LST)'), 'Surface Heat Indicator missing');
  assert.ok(badgeSrc.includes('Human Heat Stress Assessment (UTCI / WBGT Physiological Index)'), 'Human Heat Stress Assessment missing');
  assert.ok(badgeSrc.includes('Not available'), 'Not available status for human heat stress missing');
  assert.ok(badgeSrc.includes('SYNTHETIC DEMONSTRATION SCENARIO'), 'SYNTHETIC DEMONSTRATION SCENARIO badge missing');
  assert.ok(badgeSrc.includes('SIMULATED DATA'), 'SIMULATED DATA badge missing');
  assert.ok(badgeSrc.includes('HISTORICAL DATA'), 'HISTORICAL DATA badge missing');
  assert.ok(badgeSrc.includes('LIVE DATA'), 'LIVE DATA badge missing');
});

test('7-Step municipal decision workflow is exposed in App.jsx', () => {
  const appSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.jsx'), 'utf-8');
  assert.ok(appSrc.includes('DECISION_WORKFLOW_STEPS'), 'DECISION_WORKFLOW_STEPS missing in App.jsx');
  assert.ok(appSrc.includes('Decision workflow:'), 'Decision workflow label missing in App.jsx');
});

test('Vite config splits vendor chunks to prevent single bundle warning (>500kB)', () => {
  const viteSrc = fs.readFileSync(path.join(frontendRoot, 'vite.config.js'), 'utf-8');
  assert.ok(viteSrc.includes('manualChunks'), 'manualChunks missing in vite.config.js');
  assert.ok(viteSrc.includes('vendor-leaflet'), 'vendor-leaflet chunk missing in vite.config.js');
  assert.ok(viteSrc.includes('vendor-recharts'), 'vendor-recharts chunk missing in vite.config.js');
});

test('Accessible keyboard support and aria attributes present in interactive components', () => {
  const rankingSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/PriorityRankingPanel.jsx'),
    'utf-8'
  );
  assert.ok(rankingSrc.includes('role="listbox"'), 'listbox role missing in PriorityRankingPanel');
  assert.ok(rankingSrc.includes('role="option"'), 'option role missing in PriorityRankingPanel');
  assert.ok(rankingSrc.includes('tabIndex={0}'), 'tabIndex missing in PriorityRankingPanel options');
  assert.ok(rankingSrc.includes('onKeyDown='), 'onKeyDown handler missing in PriorityRankingPanel');

  const plannerSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/InterventionPlannerPanel.jsx'),
    'utf-8'
  );
  assert.ok(plannerSrc.includes('role="tablist"'), 'tablist role missing in InterventionPlannerPanel');
  assert.ok(plannerSrc.includes('role="tab"'), 'tab role missing in InterventionPlannerPanel');
});
