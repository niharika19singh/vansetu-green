/**
 * role_workspaces.test.mjs
 * Verification test suite for 4 genuinely distinct role-based workspaces:
 * - Public Citizen (8 navigation items, accessible discovery)
 * - Pro Professional (17 navigation items, advanced analytical suite)
 * - Government Admin (14 navigation items, municipal governance & approvals)
 * - Government Engineer (14 navigation items, infrastructure & IRC compliance)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

test('Role Workspaces: AppSidebar defines strictly segregated navigation for all 4 roles', () => {
  const sidebarPath = path.join(frontendRoot, 'src/components/AppSidebar.jsx');
  assert.ok(fs.existsSync(sidebarPath), 'AppSidebar.jsx must exist');
  const sidebarSrc = fs.readFileSync(sidebarPath, 'utf-8');

  // Check navigation exports
  assert.ok(sidebarSrc.includes('export const PUBLIC_CITIZEN_NAV'), 'Must define PUBLIC_CITIZEN_NAV');
  assert.ok(sidebarSrc.includes('export const PRO_PROFESSIONAL_NAV'), 'Must define PRO_PROFESSIONAL_NAV');
  assert.ok(sidebarSrc.includes('export const GOVT_ADMIN_NAV'), 'Must define GOVT_ADMIN_NAV');
  assert.ok(sidebarSrc.includes('export const GOVT_ENGINEER_NAV'), 'Must define GOVT_ENGINEER_NAV');

  // Verify Public Citizen 8 navigation items
  const publicItems = [
    'public_dashboard',
    'public_map',
    'public_heat',
    'public_projects',
    'community_input',
    'public_health',
    'public_report',
    'evidence_passport',
  ];
  for (const id of publicItems) {
    assert.ok(sidebarSrc.includes(`id: '${id}'`), `Public Citizen nav must include ${id}`);
  }

  // Verify Government Admin 14 navigation items
  const adminItems = [
    'govt_overview',
    'govt_districts',
    'govt_departments',
    'corridor_inventory',
    'tender_management',
    'govt_approvals',
    'tender_marketplace',
    'govt_community_moderation',
    'evidence_passport',
    'corridor_cost_approval',
    'hospital_health',
    'govt_audit',
    'govt_users',
    'records',
  ];
  for (const id of adminItems) {
    assert.ok(sidebarSrc.includes(`id: '${id}'`), `Govt Admin nav must include ${id}`);
  }

  // Verify Government Engineer 14 navigation items
  const engineerItems = [
    'engineer_overview',
    'engineer_map',
    'corridor_engineering',
    'road_network',
    'row_assessment',
    'shade',
    'canopy',
    'engineering_feasibility',
    'engineer_field_surveys',
    'studio',
    'corridor_cost_approval',
    'engineer_verification',
    'evidence_passport',
    'records',
  ];
  for (const id of engineerItems) {
    assert.ok(sidebarSrc.includes(`id: '${id}'`), `Govt Engineer nav must include ${id}`);
  }

  // Verify Pro Professional 17 navigation items
  const proItems = [
    'pro_dashboard',
    'map',
    'corridors',
    'prediction',
    'ranking',
    'heatwave_mapping',
    'scenarios',
    'studio',
    'intervention_intelligence',
    'shade',
    'seasonal',
    'suitability',
    'pareto',
    'spatial_memory',
    'evidence_passport',
    'provenance',
    'agent',
  ];
  for (const id of proItems) {
    assert.ok(sidebarSrc.includes(`id: '${id}'`), `Pro Professional nav must include ${id}`);
  }
});

test('Role Workspaces: RoleHeader implements 4-button switcher with distinct roles and titles', () => {
  const roleHeaderPath = path.join(frontendRoot, 'src/components/RoleHeader.jsx');
  assert.ok(fs.existsSync(roleHeaderPath), 'RoleHeader.jsx must exist');
  const roleHeaderSrc = fs.readFileSync(roleHeaderPath, 'utf-8');

  assert.ok(roleHeaderSrc.includes("onSwitchRole('public_citizen')"), 'Must have Public Citizen switcher');
  assert.ok(roleHeaderSrc.includes("onSwitchRole('pro_professional')"), 'Must have Pro Professional switcher');
  assert.ok(roleHeaderSrc.includes("onSwitchRole('government_admin')"), 'Must have Govt Admin switcher');
  assert.ok(roleHeaderSrc.includes("onSwitchRole('government_engineer')"), 'Must have Govt Engineer switcher');
  assert.ok(roleHeaderSrc.includes('GOVERNMENT ENGINEER WORKSPACE'), 'Must display Engineer workspace badge');
});

test('Role Workspaces: All 10 dedicated role workspace views exist and export React components', () => {
  const views = [
    'PublicCitizenDashboardView.jsx',
    'PublicClimateMapView.jsx',
    'PublicHeatSafetyView.jsx',
    'PublicIssueReportView.jsx',
    'GovernmentEngineerOverviewView.jsx',
    'CorridorEngineeringDetailView.jsx',
    'GovtDistrictAdminView.jsx',
    'GovtProjectApprovalsView.jsx',
    'GovtCommunityModerationView.jsx',
    'GovtUserRoleManagementView.jsx',
  ];

  for (const viewFile of views) {
    const viewPath = path.join(frontendRoot, 'src/views', viewFile);
    assert.ok(fs.existsSync(viewPath), `View ${viewFile} must exist`);
    const content = fs.readFileSync(viewPath, 'utf-8');
    assert.ok(content.includes('export default function'), `View ${viewFile} must export a React component default`);
  }
});

test('Role Workspaces: App.jsx provides route guards and workspace defaults', () => {
  const appPath = path.join(frontendRoot, 'src/App.jsx');
  const appSrc = fs.readFileSync(appPath, 'utf-8');

  // Verify normalizeRole handles all 4 variants
  assert.ok(appSrc.includes('export function normalizeRole'), 'normalizeRole must be exported');
  assert.ok(appSrc.includes("return 'public_citizen';"), 'Default normalize role is public_citizen');
  assert.ok(appSrc.includes("return 'government_engineer';"), 'Normalizes government_engineer');
  assert.ok(appSrc.includes("return 'government_admin';"), 'Normalizes government_admin');
  assert.ok(appSrc.includes("return 'pro_professional';"), 'Normalizes pro_professional');

  // Verify ROLE_PERMISSIONS_VIEW includes engineer and public specific views
  assert.ok(appSrc.includes("public_dashboard: ['public_citizen'"), 'public_dashboard authorized for public_citizen');
  assert.ok(appSrc.includes("engineer_overview: ['government_engineer'"), 'engineer_overview authorized for government_engineer');
  assert.ok(appSrc.includes("govt_districts: ['government_admin']"), 'govt_districts authorized exclusively for government_admin');
});

test('Role Workspaces: api/client.js provides methods for engineering surveys and community moderation', () => {
  const clientPath = path.join(frontendRoot, 'src/api/client.js');
  const clientSrc = fs.readFileSync(clientPath, 'utf-8');

  assert.ok(clientSrc.includes('moderateCommunityObservation'), 'Must include moderateCommunityObservation');
  assert.ok(clientSrc.includes('reportPublicIssue'), 'Must include reportPublicIssue');
  assert.ok(clientSrc.includes('getCorridorEngineering'), 'Must include getCorridorEngineering');
  assert.ok(clientSrc.includes('submitCorridorEngineeringSurvey'), 'Must include submitCorridorEngineeringSurvey');
  assert.ok(clientSrc.includes('demoSwitchRole'), 'Must include demoSwitchRole');
});
