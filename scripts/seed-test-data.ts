/**
 * Test Data Seeding Script
 * 
 * Purpose: Populate Odoo database with sample test data
 * 
 * This script creates:
 * - 100 test vehicles (various models, fuel types, states)
 * - 50 test drivers (with realistic data using faker.js)
 * - 200 test trips (assignments between vehicles and drivers)
 * 
 * Usage:
 *   npm run db:seed
 * 
 * TODO: Implement full seeding logic with VehicleFactory and DriverFactory
 */

import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';
import { getEnvConfig } from '../src/support/env';

async function seedTestData() {
  console.log('🌱 Starting test data seeding...\n');

  try {
    // Load environment configuration
    const env = getEnvConfig();
    
    // Initialize Odoo API client
    const odooApi = new OdooJsonRpcClient(env.baseUrl);
    
    // Authenticate
    console.log('🔐 Authenticating with Odoo...');
    await odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
    console.log('✅ Authentication successful\n');
    
    // TODO: Implement seeding logic
    console.log('📋 Seeding plan:');
    console.log('  [ ] Create 100 test vehicles');
    console.log('  [ ] Create 50 test drivers');
    console.log('  [ ] Assign 50 vehicles to drivers');
    console.log('  [ ] Create 200 trip records');
    console.log('  [ ] Create reference data (vehicle models, fuel types)');
    
    console.log('\n⚠️  Seeding logic not yet implemented');
    console.log('💡 To implement:');
    console.log('   1. Create VehicleFactory and DriverFactory in src/utils/factories/');
    console.log('   2. Use faker.js for realistic data generation');
    console.log('   3. Use odooApi.create() to insert records');
    console.log('   4. Implement batch inserts for performance');
    console.log('   5. Track created IDs for reporting');
    
    // Example implementation (commented out):
    /*
    import { VehicleFactory } from '../src/utils/factories/VehicleFactory';
    import { DriverFactory } from '../src/utils/factories/DriverFactory';
    
    // Create drivers first (vehicles may reference them)
    console.log('Creating drivers...');
    const driverIds: number[] = [];
    for (let i = 0; i < 50; i++) {
      const driver = DriverFactory.create();
      const id = await odooApi.create('res.partner', driver);
      driverIds.push(id);
      
      if ((i + 1) % 10 === 0) {
        console.log(`  Created ${i + 1}/50 drivers`);
      }
    }
    console.log('✅ 50 drivers created\n');
    
    // Create vehicles
    console.log('Creating vehicles...');
    const vehicleIds: number[] = [];
    for (let i = 0; i < 100; i++) {
      const vehicle = VehicleFactory.create({
        driver_id: i < 50 ? driverIds[i] : null, // Assign half to drivers
      });
      const id = await odooApi.create('fleet.vehicle', vehicle);
      vehicleIds.push(id);
      
      if ((i + 1) % 20 === 0) {
        console.log(`  Created ${i + 1}/100 vehicles`);
      }
    }
    console.log('✅ 100 vehicles created\n');
    
    console.log('📊 Summary:');
    console.log(`  ✓ Drivers: ${driverIds.length}`);
    console.log(`  ✓ Vehicles: ${vehicleIds.length}`);
    console.log(`  ✓ Assigned vehicles: 50`);
    console.log(`  ✓ Unassigned vehicles: 50`);
    */
    
    console.log('\n✨ Seeding script completed (placeholder mode)');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run seeding
seedTestData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
