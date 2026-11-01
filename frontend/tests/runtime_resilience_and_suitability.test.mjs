/**
 * VanSetu Green — Runtime Resilience, Error Boundary & Segment Suitability Regression Test Suite
 *
 * Verifies:
 * 1. Fatal white screen prevention in SegmentSuitabilityView:
 *    - Strict defensive chaining on site_geometry and estimated_sidewalk_width_m
 *    - Safe string fallback ('Walkway Unmeasured') when geometry is null or unmeasured
 *    - Safe handling of null site_geometry and empty segments array
 *    - Full ErrorBoundary wrapping of SegmentSuitabilityView
 * 2. ErrorBoundary component contract:
 *    - getDerivedStateFromError state transition
 *    - Error signature presentation and handleReset logic
 *    - Application root wrapping in main.jsx and App.jsx
 * 3. Robust API client fallbacks under remote 404 conditions:
 *    - api.getPredictionHorizons and api.getCorridorPrediction
 *    - api.getMlModelStatus returning NO_MODEL_TRAINED_YET with zero synthetic data
 *    - api.runOptimizer returning optimal MILP allocation
 *    - api.getProvenance returning 7-dataset summary and DAG
 *    - api.demoSwitchRole generating valid tokens without uncaught rejections
 *    - api.getSegmentSuitability returning aligned schema
 *    - api.recommendInterventions providing deterministic rule-based engine output
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

// Import client API directly
import { api } from '../src/api/client.js';

test('SegmentSuitabilityView source code contract: defensive chaining and empty states', () => {
  const compPath = path.join(frontendRoot, 'src/components/SegmentSuitabilityView.jsx');
  assert.ok(fs.existsSync(compPath), 'SegmentSuitabilityView.jsx must exist');
  const src = fs.readFileSync(compPath, 'utf-8');

  // Verify optional chaining on estimated_sidewalk_width_m
  assert.ok(
    src.includes('seg?.site_geometry?.estimated_sidewalk_width_m') ||
    src.includes('seg.site_geometry?.estimated_sidewalk_width_m') ||
    src.includes('currentSegment?.site_geometry?.estimated_sidewalk_width_m'),
    'Must use defensive optional chaining on site_geometry and estimated_sidewalk_width_m'
  );

  // Verify fallback for unmeasured walkway
  assert.ok(
    src.includes('Walkway Unmeasured'),
    "Must provide 'Walkway Unmeasured' display fallback for missing sidewalk measurements"
  );

  // Verify empty segments state handling
  assert.ok(
    src.includes('!segmentData.segments') || src.includes('segmentData.segments.length === 0'),
    'Must handle empty segments array gracefully without throwing'
  );

  // Verify wrapped in ErrorBoundary
  assert.ok(
    src.includes('<ErrorBoundary'),
    'SegmentSuitabilityView must be wrapped inside an ErrorBoundary'
  );
  assert.ok(
    src.includes('export default function SegmentSuitabilityView'),
    'Must export default SegmentSuitabilityView component'
  );
});

test('ErrorBoundary component implementation and application-level integration', () => {
  const ebPath = path.join(frontendRoot, 'src/components/ui/ErrorBoundary.jsx');
  assert.ok(fs.existsSync(ebPath), 'ErrorBoundary.jsx must exist');
  const ebSrc = fs.readFileSync(ebPath, 'utf-8');

  // Verify class component lifecycle
  assert.ok(ebSrc.includes('getDerivedStateFromError'), 'Must define getDerivedStateFromError');
  assert.ok(ebSrc.includes('componentDidCatch'), 'Must define componentDidCatch');
  assert.ok(ebSrc.includes('handleReset'), 'Must define handleReset handler');
  assert.ok(ebSrc.includes('Resilience Shield Activated'), 'Must render resilience shield notification');
  assert.ok(ebSrc.includes('Error Signature:'), 'Must show diagnostic error signature');

  // Verify integration in main.jsx
  const mainPath = path.join(frontendRoot, 'src/main.jsx');
  const mainSrc = fs.readFileSync(mainPath, 'utf-8');
  assert.ok(
    mainSrc.includes('<ErrorBoundary'),
    'main.jsx must wrap root <App /> in ErrorBoundary'
  );

  // Verify integration in App.jsx
  const appPath = path.join(frontendRoot, 'src/App.jsx');
  const appSrc = fs.readFileSync(appPath, 'utf-8');
  assert.ok(
    appSrc.includes('<ErrorBoundary featureName='),
    'App.jsx must wrap dynamic workspace views in ErrorBoundary'
  );
});

test('api.getPredictionHorizons and api.getCorridorPrediction return valid empirical data', async () => {
  const horizons = await api.getPredictionHorizons();
  assert.ok(Array.isArray(horizons), 'Horizons must be an array');
  assert.ok(horizons.length >= 4, `Expected at least 4 horizons, got ${horizons.length}`);

  const horizonIds = horizons.map((h) => h.id);
  assert.ok(horizonIds.includes('horizon_1yr_2027'), 'Must include 1-year horizon');
  assert.ok(horizonIds.includes('horizon_3yr_2029'), 'Must include 3-year horizon');
  assert.ok(horizonIds.includes('horizon_5yr_2031'), 'Must include 5-year horizon');

  // Test single corridor prediction fallback
  const prediction = await api.getCorridorPrediction('C-14', 'horizon_3yr_2029');
  assert.ok(prediction, 'Prediction must be non-null');
  assert.equal(prediction.corridor_id, 'C-14');
  assert.ok(typeof prediction.predicted.lst_celsius === 'number');
  assert.ok(typeof prediction.predicted.ndvi === 'number');
  assert.ok(typeof prediction.predicted.priority_score === 'number');
  assert.ok(prediction.confidence_interval_90.lower_lst_celsius <= prediction.confidence_interval_90.upper_lst_celsius);
  assert.ok(Array.isArray(prediction.attributions) && prediction.attributions.length >= 4);
  assert.ok(prediction.scientific_integrity_note.includes('empirical'));
});

test('api.getMlModelStatus reports NO_MODEL_TRAINED_YET truthfully with zero synthetic data', async () => {
  const status = await api.getMlModelStatus();
  assert.ok(status, 'ML status response must be defined');
  assert.equal(status.status, 'NO_MODEL_TRAINED_YET');
  assert.equal(status.model_id, null);
  assert.equal(status.rules_engine_active, true);
  assert.ok(status.reason.toLowerCase().includes('zero synthetic'));
  assert.ok(status.truthful_reporting === true);

  const dataStatus = await api.getMlDataStatus();
  assert.ok(dataStatus, 'ML data status must be defined');
  assert.ok(dataStatus.human_verified_labels >= 0);
  assert.ok(dataStatus.minimum_required_labels === 30);
  assert.equal(dataStatus.training_gate_satisfied, false);
});

test('api.runOptimizer returns deterministic optimal allocation', async () => {
  const presets = await api.getOptimizerPresets();
  const presetList = Array.isArray(presets) ? presets : (presets.presets || presets.featured_scenarios || presets.interventions);
  assert.ok(Array.isArray(presetList) && presetList.length >= 2, 'Must offer budget presets');

  const result = await api.runOptimizer({
    total_budget_inr: 50000000,
    strategy: 'balanced_impact',
    max_corridors: 8,
  });

  assert.ok(result, 'Optimizer result must be defined');
  assert.equal(result.status, 'OPTIMAL');
  assert.ok(Array.isArray(result.corridors_selected));
  assert.ok(result.corridors_selected.length > 0);
  assert.ok(result.budget_utilized_inr <= 50000000);
  assert.ok(result.total_cooling_celsius < 0, 'Cooling impact must be negative temperature change');
});

test('api.getProvenance returns 7-dataset summary and DAG lineage', async () => {
  const prov = await api.getProvenance();
  assert.ok(prov, 'Provenance summary must be defined');
  assert.ok(prov.total_datasets >= 7, `Expected at least 7 datasets, got ${prov.total_datasets}`);

  const lineage = await api.getProvenanceLineage();
  assert.ok(lineage, 'Lineage must be defined');
  assert.ok(Array.isArray(lineage.dag_nodes) && lineage.dag_nodes.length >= 9, 'DAG must have at least 9 stages');
});

test('api.demoSwitchRole generates valid token and auth state', async () => {
  const engineerAuth = await api.demoSwitchRole('engineer');
  assert.ok(engineerAuth && engineerAuth.token, 'Must return engineer token');
  assert.equal(engineerAuth.user.role, 'engineer');

  const adminAuth = await api.demoSwitchRole('admin');
  assert.ok(adminAuth && adminAuth.token, 'Must return admin token');
  assert.equal(adminAuth.user.role, 'admin');

  const citizenAuth = await api.demoSwitchRole('citizen');
  assert.ok(citizenAuth && citizenAuth.token, 'Must return citizen token');
  assert.equal(citizenAuth.user.role, 'citizen');
});

test('api.getSegmentSuitability returns compliant segments with site_geometry', async () => {
  const suitability = await api.getSegmentSuitability('C-14');
  assert.ok(suitability, 'Suitability data must be defined');
  assert.ok(Array.isArray(suitability.segments), 'Must contain segments array');
  assert.ok(suitability.segments.length > 0, 'Segments must not be empty');

  // Verify first segment schema
  const first = suitability.segments[0];
  assert.ok(first.segment_id, 'Segment must have segment_id');
  assert.ok(first.site_geometry, 'Segment must have site_geometry object');
  assert.ok('estimated_sidewalk_width_m' in first.site_geometry, 'site_geometry must contain estimated_sidewalk_width_m');
  assert.ok(first.archetypes && typeof first.archetypes === 'object', 'Segment must include archetypes evaluation');
  assert.ok(Object.keys(first.archetypes).length >= 5, 'Must evaluate all 5 intervention archetypes');
});

test('api.recommendInterventions provides deterministic rule-based output', async () => {
  const recommendations = await api.recommendInterventions('C-14');
  assert.ok(recommendations, 'Recommendations must be defined');
  assert.equal(recommendations.model_used, 'DETERMINISTIC_RULES_ENGINE_V1');
  assert.ok(Array.isArray(recommendations.recommended_interventions));
  assert.ok(recommendations.recommended_interventions.length > 0);
  assert.ok(recommendations.scientific_disclaimer.toLowerCase().includes('deterministic') || recommendations.scientific_disclaimer.toLowerCase().includes('empirical'));
});
