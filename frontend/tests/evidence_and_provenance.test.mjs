import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

test('Evidence Passport & Data Provenance: Dedicated Views exist and export defaults', () => {
  const views = [
    'src/views/EvidencePassportView.jsx',
    'src/views/ProvenanceView.jsx',
  ];

  for (const rel of views) {
    const fullPath = path.join(frontendRoot, rel);
    assert.ok(fs.existsSync(fullPath), `View missing: ${rel}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.includes('export default'), `View ${rel} missing default export`);
  }
});

test('App.jsx top navigation wires Evidence Passport and Provenance to dedicated full-page views', () => {
  const appPath = path.join(frontendRoot, 'src/App.jsx');
  assert.ok(fs.existsSync(appPath), 'App.jsx must exist');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  // Top nav buttons wired to dedicated full views
  assert.ok(
    appContent.includes("setActiveView('evidence_passport')"),
    "Top navigation must wire Evidence Passport button to setActiveView('evidence_passport')"
  );
  assert.ok(
    appContent.includes("setActiveView('provenance')"),
    "Top navigation must wire Provenance button to setActiveView('provenance')"
  );

  // Dedicated full-page view components rendered in workspace switch block
  assert.ok(
    appContent.includes('<EvidencePassportView'),
    'App.jsx must render <EvidencePassportView />'
  );
  assert.ok(
    appContent.includes('<ProvenanceView'),
    'App.jsx must render <ProvenanceView />'
  );

  // Role permissions check
  assert.ok(
    appContent.includes('evidence_passport:'),
    "ROLE_PERMISSIONS_VIEW must include 'evidence_passport'"
  );
  assert.ok(
    appContent.includes('provenance:'),
    "ROLE_PERMISSIONS_VIEW must include 'provenance'"
  );
});

test('AppSidebar.jsx includes Evidence Passport and Data Provenance navigation entries', () => {
  const sidebarPath = path.join(frontendRoot, 'src/components/AppSidebar.jsx');
  assert.ok(fs.existsSync(sidebarPath), 'AppSidebar.jsx must exist');
  const content = fs.readFileSync(sidebarPath, 'utf-8');

  assert.ok(
    content.includes("id: 'evidence_passport'"),
    "AppSidebar must include 'evidence_passport' navigation item"
  );
  assert.ok(
    content.includes("id: 'provenance'"),
    "AppSidebar must include 'provenance' navigation item"
  );
});

test('api/client.js provides comprehensive Evidence Passport and Provenance methods', () => {
  const clientPath = path.join(frontendRoot, 'src/api/client.js');
  assert.ok(fs.existsSync(clientPath), 'client.js must exist');
  const content = fs.readFileSync(clientPath, 'utf-8');

  // Evidence Passport methods
  assert.ok(content.includes('getEvidenceCatalogue:'), 'client.js must provide getEvidenceCatalogue');
  assert.ok(content.includes('getEvidencePassport:'), 'client.js must provide getEvidencePassport');
  assert.ok(content.includes('verifyEvidencePassport:'), 'client.js must provide verifyEvidencePassport');
  assert.ok(content.includes('getEvidenceHistory:'), 'client.js must provide getEvidenceHistory');

  // Provenance methods
  assert.ok(content.includes('getProvenanceSummary:'), 'client.js must provide getProvenanceSummary');
  assert.ok(content.includes('getProvenanceDatasets:'), 'client.js must provide getProvenanceDatasets');
  assert.ok(content.includes('getProvenanceLineage:'), 'client.js must provide getProvenanceLineage');
  assert.ok(content.includes('getProvenanceHealth:'), 'client.js must provide getProvenanceHealth');
  assert.ok(content.includes('getProvenanceAudit:'), 'client.js must provide getProvenanceAudit');
  assert.ok(content.includes('exportProvenanceManifest:'), 'client.js must provide exportProvenanceManifest');
});

test('EvidencePassportView.jsx implements 8 required dossier sections and interactive filtering', () => {
  const epPath = path.join(frontendRoot, 'src/views/EvidencePassportView.jsx');
  const content = fs.readFileSync(epPath, 'utf-8');

  // Directory features
  assert.ok(content.includes('selectedDistrict'), 'Must implement district filter');
  assert.ok(content.includes('selectedStatus'), 'Must implement status filter');
  assert.ok(content.includes('searchQuery'), 'Must implement search query');
  assert.ok(content.includes('All 11 Districts') || content.includes('canonical_districts'), 'Must support all 11 districts');

  // Section A: Corridor Identity
  assert.ok(content.includes('Section A: Geographic'), 'Must contain Section A');
  assert.ok(content.includes('LineString'), 'Must display LineString geometry');

  // Section B: Thermal Evidence — MODIS LST
  assert.ok(content.includes('Section B: Radiometric Surface Thermal Evidence'), 'Must contain Section B');
  assert.ok(content.includes('1km Native Pixel'), 'Must disclose 1km native pixel resolution');
  assert.ok(content.includes('Bilinear 10m Display'), 'Must disclose bilinear 10m display alignment');

  // Section C: Vegetation Evidence — Sentinel-2
  assert.ok(content.includes('Section C: Canopy Density'), 'Must contain Section C');
  assert.ok(content.includes('10m True Native Resolution'), 'Must disclose 10m true native resolution');
  assert.ok(content.includes('NDVI = (B08 - B04) / (B08 + B04)'), 'Must display Sentinel-2 NDVI formula');

  // Section D: Air Quality Evidence — CPCB
  assert.ok(content.includes('Section D: Ambient Air Quality Telemetry'), 'Must contain Section D');
  assert.ok(content.includes('HONEST PROXIMITY LIMITATION') || content.includes('proximity_disclaimer'), 'Must provide honest proximity disclaimer');

  // Section E: Infrastructure Evidence
  assert.ok(content.includes('Section E: Civil Infrastructure'), 'Must contain Section E');
  assert.ok(content.includes('IRC:103') || content.includes('IRC:SP:73'), 'Must reference IRC standards');

  // Section F: 6-Dimension Quality Assessment
  assert.ok(content.includes('Section F: 6-Dimension Scientific Data Quality Assessment'), 'Must contain Section F');
  assert.ok(content.includes('1. Source Authenticity'), 'Must assess Source Authenticity');
  assert.ok(content.includes('2. Spatial Resolution'), 'Must assess Spatial Resolution');
  assert.ok(content.includes('3. Temporal Freshness'), 'Must assess Temporal Freshness');
  assert.ok(content.includes('4. Data Completeness'), 'Must assess Data Completeness');
  assert.ok(content.includes('5. Geographic Relevance'), 'Must assess Geographic Relevance');
  assert.ok(content.includes('6. Field Verification'), 'Must assess Field Verification');

  // Section G: Field Verification Workflow
  assert.ok(content.includes('Section G: Field Verification'), 'Must contain Section G');
  assert.ok(content.includes('handleAdminVerify') || content.includes('Admin Signoff'), 'Must implement Gov Admin verification workflow');

  // Section H: Evidence Export
  assert.ok(content.includes('Section H: Cryptographic Audit Hash'), 'Must contain Section H');
  assert.ok(content.includes('handleDownloadJSON'), 'Must implement structured JSON download');
  assert.ok(content.includes('handlePrint'), 'Must implement print / PDF export');
});

test('ProvenanceView.jsx implements 9-Stage Lineage DAG, dataset catalogue, formula transparency, and health checks', () => {
  const provPath = path.join(frontendRoot, 'src/views/ProvenanceView.jsx');
  const content = fs.readFileSync(provPath, 'utf-8');

  // 9-Stage DAG
  assert.ok(content.includes('9-Stage Lineage DAG'), 'Must implement 9-Stage Lineage DAG');
  assert.ok(content.includes('selectedNodeId'), 'Must support interactive node selection');

  // Searchable Dataset Catalogue
  assert.ok(content.includes('Dataset Catalogue (7)'), 'Must include 7-dataset catalogue');
  assert.ok(content.includes('Sentinel-2') || content.includes('sentinel2'), 'Must include Sentinel-2');
  assert.ok(content.includes('MODIS') || content.includes('modis'), 'Must include MODIS');
  assert.ok(content.includes('CPCB') || content.includes('cpcb'), 'Must include CPCB');

  // Formulas & Transparency
  assert.ok(content.includes('Processing Transparency & Formulas'), 'Must explain processing formulas');
  assert.ok(content.includes('NDVI = (B08 - B04) / (B08 + B04)'), 'Must display NDVI formula');
  assert.ok(content.includes('LST_Celsius = (DN * 0.02) - 273.15'), 'Must display MODIS formula');
  assert.ok(content.includes('w_heat·LST_norm') || content.includes('Tri-Vector'), 'Must display Tri-Vector formula');
  assert.ok(content.includes('Missing-Data Proportional Weight Re-normalization'), 'Must display weight re-normalization formula');

  // Real Asset Freshness & Health Checks
  assert.ok(content.includes('Asset Freshness & Health Checks'), 'Must include health checks panel');
  assert.ok(content.includes('delhi_ndvi_10m.tif') || content.includes('size_bytes'), 'Must inspect real assets on disk');

  // Audit Ledger & Manifest Export
  assert.ok(content.includes('Institutional Audit Ledger'), 'Must include audit ledger');
  assert.ok(content.includes('handleExportManifest'), 'Must implement manifest export');
});
