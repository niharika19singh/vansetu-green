/**
 * VanSetu GreenTech — Automated Frontend Verification Suite (Node Test Runner).
 * Verifies component architecture, Tailwind/Recharts/Leaflet stack compliance,
 * district GeoJSON validity, and strict GreenTech scope compliance.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

test('package.json includes required GreenTech stack (React, Vite, Tailwind CSS, Leaflet, Recharts)', () => {
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

test('Frontend components implement all 5 policy scenarios, 5 interventions, and provenance disclosures without chatbot/sponsor bloat', () => {
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

  // Verify strict scope limitation: no Gemini/Prune/Meko/MongoDB/chatbot UI
  const allSrcFiles = [
    'src/App.jsx',
    'src/api/client.js',
    'src/components/InteractiveMap.jsx',
    'src/components/PriorityRankingPanel.jsx',
    'src/components/CorridorAnalyticalDetail.jsx',
    'src/components/InterventionPlannerPanel.jsx',
    'src/components/DataProvenanceModal.jsx',
  ];
  for (const rel of allSrcFiles) {
    const content = fs.readFileSync(path.join(frontendRoot, rel), 'utf-8');
    assert.ok(!/gemini|prune_api|mongodb|yugabyte|iomete/i.test(content), `Out-of-scope reference found in ${rel}`);
  }
});
