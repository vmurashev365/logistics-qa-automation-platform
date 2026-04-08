/**
 * Test Data Cleanup Script
 *
 * Removes all test fixtures created by db:seed:
 *   - fleet.vehicle  where license_plate  starts with 'MD-TEST' or 'MD-TEMP'
 *   - res.partner    where email          ends with  '@test-logistics.local'
 *   - fleet.vehicle.model  named 'TestTruck'  under brand 'MD-TestFleet'
 *   - fleet.vehicle.model.brand  named 'MD-TestFleet'
 *
 * Vehicles are unlinked before drivers to satisfy FK constraints.
 *
 * Usage:
 *   npm run db:clean
 */

import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';
import { getEnvConfig } from '../src/support/env';

async function cleanTestData() {
  console.log('🧹 Starting test data cleanup...\n');

  const env = getEnvConfig();
  const odooApi = new OdooJsonRpcClient(env.baseUrl);

  console.log('🔐 Authenticating with Odoo...');
  await odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  console.log('✅ Authentication successful\n');

  // ── 1. Delete test vehicles ──────────────────────────────────────────────
  // Unlink vehicles first; driver (res.partner) records may be referenced by
  // other models so must be removed after the vehicles that reference them.
  const vehicleIds = await odooApi.search('fleet.vehicle', [
    '|',
    ['license_plate', 'like', 'MD-TEST%'],
    ['license_plate', 'like', 'MD-TEMP%'],
  ]);
  if (vehicleIds.length > 0) {
    await odooApi.unlink('fleet.vehicle', vehicleIds);
    console.log(`✅ Deleted ${vehicleIds.length} test vehicle(s)`);
  } else {
    console.log('ℹ️  No test vehicles found');
  }

  // ── 2. Delete test drivers ────────────────────────────────────────────────
  const driverIds = await odooApi.search('res.partner', [
    ['email', 'like', '%@test-logistics.local'],
  ]);
  if (driverIds.length > 0) {
    await odooApi.unlink('res.partner', driverIds);
    console.log(`✅ Deleted ${driverIds.length} test driver(s)`);
  } else {
    console.log('ℹ️  No test drivers found');
  }

  // ── 3. Delete test vehicle model ─────────────────────────────────────────
  const modelIds = await odooApi.search('fleet.vehicle.model', [
    ['name', '=', 'TestTruck'],
  ]);
  if (modelIds.length > 0) {
    await odooApi.unlink('fleet.vehicle.model', modelIds);
    console.log(`✅ Deleted ${modelIds.length} test vehicle model(s)`);
  }

  // ── 4. Delete test vehicle brand ─────────────────────────────────────────
  const brandIds = await odooApi.search('fleet.vehicle.model.brand', [
    ['name', '=', 'MD-TestFleet'],
  ]);
  if (brandIds.length > 0) {
    await odooApi.unlink('fleet.vehicle.model.brand', brandIds);
    console.log(`✅ Deleted ${brandIds.length} test brand(s)`);
  }

  console.log('\n✨ Cleanup complete');
}

cleanTestData().catch((error) => {
  console.error('❌ Cleanup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
