/**
 * Test Data Cleanup Script
 *
 * Removes the test data this framework creates in Odoo, from db:seed and from scenarios:
 *   - fleet.vehicle  with license plate "MD-..." (scenarios, db:seed) or "TRUCK-..." (fuel and
 *                    inspection scenarios), archived ones included, with the history that blocks
 *                    unlink (driver history, odometer readings, service logs, contracts)
 *   - res.partner    from db:seed (email ending in @test-logistics.local), the drivers scenarios
 *                    create by name, and partners renamed "ANONYMIZED_..." by an earlier version
 *                    of the GDPR scenario
 *   - fleet.vehicle.model "TestTruck" and fleet.vehicle.model.brand "MD-TestFleet" (db:seed)
 *
 * Scenarios delete what they create themselves; this script is for leftovers of interrupted
 * runs and of earlier framework versions. It does not touch the user qa.fleet.user, which the
 * security scenarios keep as a fixture.
 *
 * Usage:
 *   npm run db:clean                 delete
 *   npm run db:clean -- --dry-run    only list what would be deleted
 */

import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';
import { FleetEndpoints } from '../src/api/endpoints/FleetEndpoints';
import { getEnvConfig } from '../src/support/env';

/** Drivers that scenarios create by name (see features/**). */
const SCENARIO_DRIVER_NAMES = [
  'Ion Popescu',
  'Maria Rusu',
  'First Driver',
  'Second Driver',
  'John Doe',
  'Jane Smith',
  'Test Driver GDPR',
  'Test Driver Export',
];
const TEST_PLATE_PREFIXES = ['MD-', 'TRUCK-'];

async function cleanTestData(dryRun: boolean): Promise<void> {
  console.log(`🧹 Starting test data cleanup${dryRun ? ' (dry run: nothing is deleted)' : ''}...\n`);

  const env = getEnvConfig();
  const odooApi = new OdooJsonRpcClient(env.baseUrl);
  const fleet = new FleetEndpoints(odooApi);

  console.log('🔐 Authenticating with Odoo...');
  await odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  console.log('✅ Authentication successful\n');

  let failures = 0;

  // ── 1. Vehicles, before the drivers their history references ─────────────
  for (const prefix of TEST_PLATE_PREFIXES) {
    const vehicles = await fleet.findVehiclesByPlatePrefixIncludingArchived(prefix);
    for (const vehicle of vehicles) {
      const label = `vehicle ${vehicle.license_plate} (id ${vehicle.id}${vehicle.active === false ? ', archived' : ''})`;
      if (dryRun || vehicle.id === undefined) {
        console.log(`  would delete ${label}`);
        continue;
      }
      try {
        await fleet.deleteVehicleAndHistory(vehicle.id);
        console.log(`  ✅ deleted ${label}`);
      } catch (error) {
        failures += 1;
        console.log(`  ❌ could not delete ${label}: ${error instanceof Error ? error.message : error}`);
      }
    }
  }

  // ── 2. Drivers ───────────────────────────────────────────────────────────
  const partners = await odooApi.searchRead<{ id: number; name: string }>(
    'res.partner',
    [
      '|',
      '|',
      ['email', '=like', '%@test-logistics.local'],
      ['name', 'in', SCENARIO_DRIVER_NAMES],
      ['name', '=like', 'ANONYMIZED_%'],
    ],
    ['id', 'name'],
    { context: { active_test: false } }
  );
  for (const partner of partners) {
    const label = `partner "${partner.name}" (id ${partner.id})`;
    if (dryRun) {
      console.log(`  would delete ${label}`);
      continue;
    }
    try {
      await odooApi.unlink('res.partner', [partner.id]);
      console.log(`  ✅ deleted ${label}`);
    } catch (error) {
      failures += 1;
      console.log(`  ❌ could not delete ${label}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // ── 3. db:seed vehicle model and brand ───────────────────────────────────
  for (const [model, name] of [
    ['fleet.vehicle.model', 'TestTruck'],
    ['fleet.vehicle.model.brand', 'MD-TestFleet'],
  ]) {
    const ids = await odooApi.search(model, [['name', '=', name]]);
    if (ids.length === 0) continue;
    if (dryRun) {
      console.log(`  would delete ${model} "${name}" (${ids.length})`);
      continue;
    }
    try {
      await odooApi.unlink(model, ids);
      console.log(`  ✅ deleted ${model} "${name}" (${ids.length})`);
    } catch (error) {
      failures += 1;
      console.log(`  ❌ could not delete ${model} "${name}": ${error instanceof Error ? error.message : error}`);
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} record(s) could not be deleted (see above)`);
  }
  console.log(`\n✨ Cleanup ${dryRun ? 'dry run ' : ''}complete`);
}

cleanTestData(process.argv.includes('--dry-run')).catch((error) => {
  console.error('❌ Cleanup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
