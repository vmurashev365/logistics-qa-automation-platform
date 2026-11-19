/**
 * Vehicle Workflows - Composite Steps
 * High-level workflow steps that combine multiple atomic steps
 * 
 * These steps provide convenient abstractions for common test scenarios
 * while internally using the atomic and domain steps.
 * 
 * Usage:
 *   When I complete vehicle registration for "MD-TEST-001"
 *   When I prepare vehicle "MD-TEST-001" for daily operations
 *   When I perform vehicle inspection for "MD-TEST-001"
 */

import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { getEnvConfig } from '../../support/env';
import { verify } from '../../support/evidence';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Navigate to vehicles list and wait for it to load
 * Skips navigation if already on vehicles LIST page (not form page)
 */
async function navigateToVehiclesList(world: CustomWorld): Promise<void> {
  const config = getEnvConfig();
  
  // Log current URL for debugging
  const currentUrl = world.page.url();
  console.log(`  📍 Current URL: ${currentUrl}`);
  
  // Check if already on vehicles LIST page (not form page)
  const isOnVehicleModel = currentUrl.includes('fleet.vehicle') || currentUrl.includes('model=fleet.vehicle');
  const isOnFormPage = currentUrl.includes('&id=') || currentUrl.includes('action=') && currentUrl.includes('id=');
  
  console.log(`  📍 isOnVehicleModel: ${isOnVehicleModel}, isOnFormPage: ${isOnFormPage}`);
  
  // If on vehicles list (not form), skip navigation
  if (isOnVehicleModel && !isOnFormPage) {
    // Check if list/kanban view is actually visible
    try {
      const listView = world.page.locator('.o_kanban_view, .o_kanban_renderer, table.o_list_table, .o_list_view');
      const isVisible = await listView.first().isVisible();
      console.log(`  📍 List view visible: ${isVisible}`);
      if (isVisible) {
        await world.vehiclesListPage.waitForLoadingComplete();
        return;
      }
    } catch (e) {
      console.log(`  📍 List view check failed: ${e}`);
      // If check fails, proceed with navigation
    }
  }
  
  console.log(`  📍 Navigating to vehicles page...`);
  await world.vehiclesListPage.navigateToVehicles(config.baseUrl);
  await world.vehiclesListPage.waitForLoadingComplete();
}

// ============================================
// VEHICLE REGISTRATION WORKFLOWS
// ============================================

When(
  'I complete vehicle registration for {string}',
  { timeout: 30000 },
  async function (this: CustomWorld, plate: string) {
    console.log(`📝 Starting vehicle registration for ${plate}...`);
    
    // Navigate to vehicles list
    console.log('  1. Navigating to vehicles list...');
    await navigateToVehiclesList(this);
    console.log('  1. ✓ Navigation complete');

    // Click create button
    console.log('  2. Clicking create button...');
    await this.vehiclesListPage.clickCreateVehicle();
    console.log('  2. ✓ Create button clicked');
    
    console.log('  3. Waiting for form ready...');
    await this.vehicleFormPage.waitForFormReady();
    console.log('  3. ✓ Form ready');

    // Fill required fields
    console.log(`  4. Filling license plate: ${plate}...`);
    await this.vehicleFormPage.fillLicensePlate(plate);
    console.log('  4. ✓ License plate filled');
    
    // Save the vehicle
    console.log('  5. Clicking save button...');
    await this.vehicleFormPage.clickSave();
    console.log('  5. ✓ Save button clicked');


    // Store the registered plate for later assertions
    this.setTestData('registeredVehicle', plate);
    console.log(`✅ Vehicle registered: ${plate}`);
  }
);

When(
  'I complete vehicle registration for {string} with details:',
  { timeout: 60000 },
  async function (this: CustomWorld, plate: string, dataTable: DataTable) {
    const details = dataTable.rowsHash();

    // Navigate to vehicles list
    await navigateToVehiclesList(this);

    // Click create button
    await this.vehiclesListPage.clickCreateVehicle();
    await this.vehicleFormPage.waitForFormReady();

    // Fill license plate
    await this.vehicleFormPage.fillLicensePlate(plate);

    // Fill additional details from data table
    for (const [field, value] of Object.entries(details)) {
      if (value) {
        await this.vehicleFormPage.fillField(field, value);
      }
    }

    // Save the vehicle
    await this.vehicleFormPage.clickSave();

    this.setTestData('registeredVehicle', plate);
    this.setTestData('vehicleDetails', details);
    console.log(`✅ Vehicle registered with details: ${plate}`);
  }
);

When(
  'I assign driver {string} to vehicle {string}',
  { timeout: 30000 },
  async function (this: CustomWorld, driverName: string, plate: string) {
    // Navigate to vehicles and find the vehicle
    await navigateToVehiclesList(this);
    await this.vehiclesListPage.searchVehicle(plate);

    // Click on the vehicle to open form
    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await vehicleRow.click();
    await this.vehicleFormPage.waitForFormReady();

    // Click edit button
    await this.vehicleFormPage.clickEdit();

    // Select driver
    await this.vehicleFormPage.selectDriver(driverName);

    // Save changes
    await this.vehicleFormPage.clickSave();

    this.setTestData('assignedDriver', driverName);
    console.log(`✅ Assigned driver "${driverName}" to vehicle "${plate}"`);
  }
);

// ============================================
// VEHICLE PREPARATION WORKFLOWS
// ============================================

When(
  'I prepare vehicle {string} for daily operations',
  async function (this: CustomWorld, plate: string) {
    // This is a high-level workflow that would include:
    // 1. Verify vehicle exists
    // 2. Check driver assignment
    // 3. Verify status is ready

    // Navigate to vehicles
    await navigateToVehiclesList(this);

    // Search for the vehicle
    await this.vehiclesListPage.searchVehicle(plate);

    // Verify vehicle is visible
    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await expect(vehicleRow).toBeVisible({ timeout: 10000 });

    // Open vehicle details
    await vehicleRow.click();
    await this.vehicleFormPage.waitForFormReady();

    // Store preparation status
    this.setTestData('preparedVehicle', plate);
    this.setTestData('preparationTime', Date.now());
    console.log(`✅ Vehicle "${plate}" prepared for daily operations`);
  }
);

When(
  'I update odometer for vehicle {string} to {int}',
  async function (this: CustomWorld, plate: string, odometerValue: number) {
    // Navigate to vehicle
    await navigateToVehiclesList(this);
    await this.vehiclesListPage.searchVehicle(plate);

    // Open vehicle form
    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await vehicleRow.click();
    await this.vehicleFormPage.waitForFormReady();

    // Click edit
    await this.vehicleFormPage.clickEdit();

    // Update odometer
    await this.vehicleFormPage.fillField('odometer', odometerValue.toString());

    // Save
    await this.vehicleFormPage.clickSave();

    this.setTestData('updatedOdometer', odometerValue);
    console.log(`✅ Updated odometer for "${plate}" to ${odometerValue}`);
  }
);

// ============================================
// VEHICLE SEARCH AND VERIFICATION WORKFLOWS
// ============================================

Then(
  'vehicle {string} should be visible in list',
  async function (this: CustomWorld, plate: string) {
    await navigateToVehiclesList(this);
    await this.vehiclesListPage.searchVehicle(plate);

    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await expect(vehicleRow).toBeVisible({ timeout: 10000 });
  }
);

Then(
  'vehicle {string} should not be visible in list',
  async function (this: CustomWorld, plate: string) {
    await navigateToVehiclesList(this);
    await this.vehiclesListPage.searchVehicle(plate);

    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await expect(vehicleRow).not.toBeVisible({ timeout: 5000 });
  }
);

Then(
  'I should see the registered vehicle in the list',
  async function (this: CustomWorld) {
    const plate = this.getTestData<string>('registeredVehicle');
    if (!plate) {
      throw new Error('No registered vehicle found in test context');
    }

    await navigateToVehiclesList(this);
    await this.vehiclesListPage.searchVehicle(plate);

    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await expect(vehicleRow).toBeVisible({ timeout: 10000 });
  }
);

// ============================================
// END-TO-END VERIFICATION WORKFLOWS
// ============================================

Then(
  'vehicle {string} should sync across all layers',
  async function (this: CustomWorld, plate: string) {
    // 1. Verify in UI
    await navigateToVehiclesList(this);
    await this.vehiclesListPage.searchVehicle(plate);
    const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
    await expect(vehicleRow).toBeVisible({ timeout: 10000 });

    // 2. Verify via API and in the database; both layers are required
    if (!this.dbClient) {
      throw new Error('Database client not initialized. Ensure DB_ENABLED=true in environment.');
    }
    const vehicles = await this.fleetEndpoints.getVehicles([['license_plate', '=', plate]]);
    const inDatabase = await this.dbClient.vehicleExists(plate);

    verify(this, `Vehicle "${plate}" exists in every layer`, [
      { what: 'active vehicles with this plate', source: 'Odoo JSON-RPC', expected: 1, actual: vehicles.length },
      { what: 'active row in fleet_vehicle', source: 'PostgreSQL', expected: true, actual: inDatabase },
    ]);
  }
);

// ============================================
// BATCH OPERATIONS
// ============================================

When(
  'I create {int} test vehicles with prefix {string}',
  async function (this: CustomWorld, count: number, prefix: string) {
    const createdPlates: string[] = [];

    for (let i = 1; i <= count; i++) {
      const plate = `${prefix}-${i.toString().padStart(3, '0')}`;
      
      try {
        // Use API for faster creation
        if (this.fleetEndpoints) {
          await this.fleetEndpoints.createVehicle({
            license_plate: plate,
          });
        } else {
          // Fall back to UI
          await navigateToVehiclesList(this);
          await this.vehiclesListPage.clickCreateVehicle();
          await this.vehicleFormPage.waitForFormReady();
          await this.vehicleFormPage.fillLicensePlate(plate);
          await this.vehicleFormPage.clickSave();
        }
        
        createdPlates.push(plate);
      } catch (error) {
        console.log(`⚠️ Failed to create vehicle ${plate}: ${error}`);
      }
    }

    this.setTestData('batchCreatedVehicles', createdPlates);
    console.log(`✅ Created ${createdPlates.length} test vehicles with prefix "${prefix}"`);
  }
);

// Cleanup: each scenario removes what it created (After hook) and the leftovers of the plates
// it names (Before hook). There is no "clean up everything with a prefix" step: run in
// parallel, it would delete the vehicles of scenarios that are still running.
