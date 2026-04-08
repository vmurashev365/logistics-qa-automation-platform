/**
 * Test Data Seeding Script
 *
 * Creates deterministic test fixtures in a live Odoo instance:
 *   - 1 vehicle brand + model pair tagged for cleanup
 *   - 10 test vehicles  (license plates: MD-TEST-001 … MD-TEST-010)
 *   - 5  test drivers   (emails: driver1@test-logistics.local … driver5@…)
 *   - First 5 vehicles are assigned to drivers
 *
 * Usage:
 *   npm run db:seed
 *
 * Cleanup:
 *   npm run db:clean
 */

import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';
import { getEnvConfig } from '../src/support/env';

const VEHICLE_COUNT = 10;
const DRIVER_COUNT = 5;
const LICENSE_PREFIX = 'MD-TEST';
const DRIVER_EMAIL_DOMAIN = 'test-logistics.local';
const TEST_BRAND_NAME = 'MD-TestFleet';
const TEST_MODEL_NAME = 'TestTruck';

async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');

  const env = getEnvConfig();
  const odooApi = new OdooJsonRpcClient(env.baseUrl);

  console.log('🔐 Authenticating with Odoo...');
  await odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  console.log('✅ Authentication successful\n');

  // ── 1. Resolve vehicle brand ─────────────────────────────────────────────
  let brandId: number;
  const existingBrands = await odooApi.search('fleet.vehicle.model.brand', [
    ['name', '=', TEST_BRAND_NAME],
  ]);
  if (existingBrands.length > 0) {
    brandId = existingBrands[0];
    console.log(`ℹ️  Reusing existing brand id=${brandId}`);
  } else {
    brandId = await odooApi.create('fleet.vehicle.model.brand', { name: TEST_BRAND_NAME });
    console.log(`✅ Created brand id=${brandId}`);
  }

  // ── 2. Resolve vehicle model ─────────────────────────────────────────────
  let modelId: number;
  const existingModels = await odooApi.search('fleet.vehicle.model', [
    ['name', '=', TEST_MODEL_NAME],
    ['brand_id', '=', brandId],
  ]);
  if (existingModels.length > 0) {
    modelId = existingModels[0];
    console.log(`ℹ️  Reusing existing model id=${modelId}`);
  } else {
    modelId = await odooApi.create('fleet.vehicle.model', {
      name: TEST_MODEL_NAME,
      brand_id: brandId,
    });
    console.log(`✅ Created model id=${modelId}`);
  }

  // ── 3. Create test drivers ────────────────────────────────────────────────
  console.log(`\n👤 Creating ${DRIVER_COUNT} test drivers...`);
  const driverIds: number[] = [];
  for (let i = 1; i <= DRIVER_COUNT; i++) {
    const id = await odooApi.create('res.partner', {
      name: `Test Driver ${i}`,
      email: `driver${i}@${DRIVER_EMAIL_DOMAIN}`,
      comment: 'Created by db:seed — safe to delete',
    });
    driverIds.push(id);
    console.log(`  ✓ driver${i}@${DRIVER_EMAIL_DOMAIN}  id=${id}`);
  }

  // ── 4. Create test vehicles ───────────────────────────────────────────────
  console.log(`\n🚛 Creating ${VEHICLE_COUNT} test vehicles...`);
  const vehicleIds: number[] = [];
  for (let i = 1; i <= VEHICLE_COUNT; i++) {
    const plate = `${LICENSE_PREFIX}-${String(i).padStart(3, '0')}`;
    const driverId = i <= DRIVER_COUNT ? driverIds[i - 1] : false;
    const id = await odooApi.create('fleet.vehicle', {
      license_plate: plate,
      model_id: modelId,
      ...(driverId ? { driver_id: driverId } : {}),
    });
    vehicleIds.push(id);
    const assignNote = driverId ? `  → driver id=${driverId}` : '';
    console.log(`  ✓ ${plate}  id=${id}${assignNote}`);
  }

  console.log('\n📊 Summary:');
  console.log(`  ✓ Drivers  : ${driverIds.length}`);
  console.log(`  ✓ Vehicles : ${vehicleIds.length}  (first ${DRIVER_COUNT} assigned to drivers)`);
  console.log('\n✨ Seeding complete — run npm run db:clean to remove test data');
}

seedTestData().catch((error) => {
  console.error('❌ Seeding failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
