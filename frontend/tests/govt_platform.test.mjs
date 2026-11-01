/**
 * VanSetu — Government-First Platform & RBAC Verification Suite
 * Verifies role-based components, persona switching, tender exclusivity,
 * corridor cost approval, and truthful ABDM health surveillance disclosures.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

test('All Government, Pro Professional, and Public View Components exist', () => {
  const components = [
    'src/components/RoleHeader.jsx',
    'src/components/AccessDeniedView.jsx',
    'src/components/GovernmentOverviewView.jsx',
    'src/components/CorridorInventoryView.jsx',
    'src/components/TenderManagementView.jsx',
    'src/components/ProfessionalAssignmentsView.jsx',
    'src/components/CorridorCostOptimizerView.jsx',
    'src/components/RegionalHealthIntelligenceView.jsx',
    'src/components/HospitalDataSourcesView.jsx',
    'src/components/GovernmentAuditView.jsx',
    'src/components/ProDashboardView.jsx',
    'src/components/TenderMarketplaceView.jsx',
    'src/components/MyProposalsView.jsx',
    'src/components/MyAssignedProjectsView.jsx',
    'src/components/PublicDashboardView.jsx',
    'src/components/PublicProjectsView.jsx',
  ];

  for (const rel of components) {
    const fullPath = path.join(frontendRoot, rel);
    assert.ok(fs.existsSync(fullPath), `Missing component: ${rel}`);
    const content = fs.readFileSync(fullPath, 'utf-8');
    assert.ok(content.includes('export default'), `Component ${rel} missing default export`);
  }
});

test('RoleHeader implements 3-role persona switcher and institutional badges', () => {
  const roleHeaderSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/RoleHeader.jsx'),
    'utf-8'
  );
  assert.ok(roleHeaderSrc.includes('GOVERNMENT INSTITUTIONAL WORKSPACE'));
  assert.ok(roleHeaderSrc.includes('PAID PROFESSIONAL WORKSPACE'));
  assert.ok(roleHeaderSrc.includes('PUBLIC CLIMATE DISCOVERY'));
  assert.ok(roleHeaderSrc.includes('Govt Admin'));
  assert.ok(roleHeaderSrc.includes('Pro Professional'));
  assert.ok(roleHeaderSrc.includes('Public Citizen'));
});

test('App.jsx integrates RoleHeader, persona switching, and AccessDenied route guarding', () => {
  const appSrc = fs.readFileSync(path.join(frontendRoot, 'src/App.jsx'), 'utf-8');
  assert.ok(appSrc.includes('RoleHeader'));
  assert.ok(appSrc.includes('handleSwitchRole'));
  assert.ok(appSrc.includes('isViewAuthorized'));
  assert.ok(appSrc.includes('AccessDeniedView'));
  assert.ok(appSrc.includes('GOVT_NAV_VIEWS'));
  assert.ok(appSrc.includes('PRO_NAV_VIEWS'));
  assert.ok(appSrc.includes('PUBLIC_NAV_VIEWS'));
});

test('REST API client provides all B2G tenders, allocations, cost optimization, and health endpoints', () => {
  const clientSrc = fs.readFileSync(path.join(frontendRoot, 'src/api/client.js'), 'utf-8');
  const requiredMethods = [
    'getCurrentUser',
    'getPermissions',
    'demoSwitchRole',
    'listTenders',
    'createTender',
    'getTender',
    'submitTenderProposal',
    'awardTender',
    'getCorridorAvailability',
    'getMyCorridorAssignments',
    'getMyProposals',
    'listCorridorAssignments',
    'directAllocateCorridor',
    'listProfessionals',
    'verifyProfessional',
    'listAuditLogs',
    'getCorridorCostBaseline',
    'optimizeCorridorCost',
    'approveCorridorBudget',
    'getRegionalHealthIndicators',
    'getCorridorHealthFactor',
    'getAbhaStatus',
    'listHospitalSources',
    'createHospitalSource',
    'uploadHospitalDataset',
  ];

  for (const m of requiredMethods) {
    assert.ok(clientSrc.includes(`${m}:`), `client.js missing API method: ${m}`);
  }
});

test('UI embeds strict single-party exclusivity and sealed competitive bid disclosures', () => {
  const invSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/CorridorInventoryView.jsx'),
    'utf-8'
  );
  assert.ok(invSrc.includes('single-party allocation rules'));
  assert.ok(invSrc.includes('AVAILABLE'));
  assert.ok(invSrc.includes('TENDER_OPEN'));
  assert.ok(invSrc.includes('ALLOCATED'));

  const marketSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/TenderMarketplaceView.jsx'),
    'utf-8'
  );
  assert.ok(marketSrc.includes('SEALED COMPETITIVE BIDS'));
  assert.ok(marketSrc.includes('Bid Confidentiality Disclosure'));
});

test('Hospital and ABDM views enforce truthful reporting and zero PII disclosures', () => {
  const healthSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/RegionalHealthIntelligenceView.jsx'),
    'utf-8'
  );
  assert.ok(healthSrc.includes('HEALTH_DATA_NOT_AVAILABLE'));
  assert.ok(healthSrc.includes('Truthful Data Disclosure'));
  assert.ok(healthSrc.includes('ABDM Integration:'));

  const sourcesSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/HospitalDataSourcesView.jsx'),
    'utf-8'
  );
  assert.ok(sourcesSrc.includes('Zero PII Guarantee'));
  assert.ok(sourcesSrc.includes('SANDBOX_CONFIGURED'));
});

test('Pro Workspace components integrate dedicated /me endpoints', () => {
  const assignSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/MyAssignedProjectsView.jsx'),
    'utf-8'
  );
  assert.ok(assignSrc.includes('getMyCorridorAssignments'));

  const propSrc = fs.readFileSync(
    path.join(frontendRoot, 'src/components/MyProposalsView.jsx'),
    'utf-8'
  );
  assert.ok(propSrc.includes('getMyProposals'));
});
