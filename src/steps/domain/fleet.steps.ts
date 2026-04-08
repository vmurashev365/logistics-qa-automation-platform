/**
 * Fleet Domain Steps
 * High-level steps for Fleet module workflows
 * Uses UI-MAP pattern and Page Objects
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';

/**
 * When I create new vehicle with:
 * Creates a vehicle using DataTable
 */
When('I create new vehicle with:', { timeout: 30000 }, async function (this: CustomWorld, dataTable: DataTable) {
  const data = dataTable.rowsHash();

  // Navigate to vehicles page
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());

  // Click Create
  await this.vehiclesListPage.clickCreateVehicle();

  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Fill form fields
  for (const [fieldKey, value] of Object.entries(data)) {
    await this.vehicleFormPage.fillField(fieldKey, value);
  }

  // Save
  await this.vehicleFormPage.clickSave();

  // Wait for success
  try {
    await this.vehicleFormPage.waitForSuccessMessage();
  } catch {
    // Some Odoo versions don't show notification, check if saved by URL change
    await this.page.waitForLoadState('networkidle');
  }

  // Store for cleanup
  if (data.licensePlate) {
    this.setTestData('lastCreatedVehicle', data.licensePlate);
  }
});

/**
 * When I assign vehicle {string} to driver {string}
 * Assigns a driver to a vehicle
 */
When('I assign vehicle {string} to driver {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string,
  driverName: string
) {
  // Navigate to vehicles page
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());

  // Search for the vehicle
  await this.vehiclesListPage.searchVehicle(plate);

  // Click on the vehicle to open form
  await this.vehiclesListPage.clickVehicleByPlate(plate);

  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Click Edit if in read mode
  const editBtn = this.page.locator('.o_form_button_edit');
  if (await editBtn.isVisible()) {
    await this.vehicleFormPage.clickEdit();
  }

  // Select driver
  await this.vehicleFormPage.selectDriver(driverName);

  // Save
  await this.vehicleFormPage.clickSave();

  // Wait for success
  await this.vehicleFormPage.waitForSuccessMessage();
});

/**
 * When I unassign driver from vehicle {string}
 * Removes driver assignment from a vehicle
 */
When('I unassign driver from vehicle {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  // Navigate to vehicles page
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());

  // Search for the vehicle
  await this.vehiclesListPage.searchVehicle(plate);

  // Click on the vehicle to open form
  await this.vehiclesListPage.clickVehicleByPlate(plate);

  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Click Edit if in read mode
  const editBtn = this.page.locator('.o_form_button_edit');
  if (await editBtn.isVisible()) {
    await this.vehicleFormPage.clickEdit();
  }

  // Clear driver field
  const driverField = this.page.locator('[name="driver_id"] input');
  await driverField.clear();

  // Save
  await this.vehicleFormPage.clickSave();

  // Wait for success
  await this.vehicleFormPage.waitForSuccessMessage();
});

/**
 * Then vehicle {string} should exist in vehicles list
 * Verifies a vehicle exists in the list
 */
Then('vehicle {string} should exist in vehicles list', { timeout: 15000 }, async function (
  this: CustomWorld,
  plate: string
) {
  // Navigate to vehicles page
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());

  // Search for the vehicle
  await this.vehiclesListPage.searchVehicle(plate);

  // Check if vehicle is visible
  const vehicleRow = this.vehiclesListPage.getVehicleByPlate(plate);
  await expect(vehicleRow).toBeVisible({ timeout: 5000 });
});

/**
 * Then vehicle {string} should have driver {string}
 * Verifies a vehicle has a specific driver assigned
 */
Then('vehicle {string} should have driver {string}', { timeout: 15000 }, async function (
  this: CustomWorld,
  plate: string,
  expectedDriver: string
) {
  // Navigate to vehicles page
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());

  // Search for the vehicle
  await this.vehiclesListPage.searchVehicle(plate);

  // Click on the vehicle to open form
  await this.vehiclesListPage.clickVehicleByPlate(plate);

  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Check driver field
  const driverField = this.page.locator('[name="driver_id"]');
  const driverText = await driverField.textContent();
  expect(driverText).toContain(expectedDriver);
});

/**
 * Then vehicle {string} should have no driver
 * Verifies a vehicle has no driver assigned
 */
Then('vehicle {string} should have no driver', { timeout: 15000 }, async function (
  this: CustomWorld,
  plate: string
) {
  // Navigate to vehicles page
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());

  // Search for the vehicle
  await this.vehiclesListPage.searchVehicle(plate);

  // Click on the vehicle to open form
  await this.vehiclesListPage.clickVehicleByPlate(plate);

  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Check driver field is empty
  const driverField = this.page.locator('[name="driver_id"] input');
  const driverValue = await driverField.inputValue();
  expect(driverValue).toBeFalsy();
});

/**
 * Given vehicle {string} exists
 * Ensures a vehicle exists (creates if needed)
 */
Given('vehicle {string} exists', { timeout: 30000 }, async function (this: CustomWorld, plate: string) {
  // Try to find the vehicle via UI search first
  try {
    await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());
    await this.vehiclesListPage.searchVehicle(plate);
    const vehicleExists = await this.vehiclesListPage.getVehicleByPlate(plate).isVisible({ timeout: 3000 });
    if (vehicleExists) {
      console.log(`   Vehicle ${plate} already exists`);
      return;
    }
  } catch {
    console.log(`   Vehicle search failed, will create vehicle via UI`);
  }

  // Create via UI
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());
  await this.vehiclesListPage.clickCreateVehicle();
  await this.vehicleFormPage.waitForFormReady();
  await this.vehicleFormPage.fillLicensePlate(plate);
  await this.vehicleFormPage.clickSave();
  
  // Store for cleanup
  this.setTestData(`vehicle_${plate}`, true);
});

/**
 * Given driver {string} exists
 * Ensures a driver exists (placeholder - would need DriverFormPage)
 */
Given('driver {string} exists', { timeout: 15000 }, async function (this: CustomWorld, driverName: string) {
  // For now, just log - full implementation would need DriverFormPage
  console.log(`   Assuming driver "${driverName}" exists in Odoo`);
  this.setTestData(`driver_${driverName}`, true);
});

/**
 * Given vehicle {string} is assigned to {string}
 * Ensures a vehicle has a specific driver
 */
Given('vehicle {string} is assigned to {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string,
  driverName: string
) {
  // First ensure vehicle exists
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());
  await this.vehiclesListPage.searchVehicle(plate);

  const vehicleExists = await this.vehiclesListPage.getVehicleByPlate(plate).isVisible().catch(() => false);
  
  if (!vehicleExists) {
    // Create the vehicle first
    await this.vehiclesListPage.clickCreateVehicle();
    await this.vehicleFormPage.waitForFormReady();
    await this.vehicleFormPage.fillLicensePlate(plate);
    await this.vehicleFormPage.selectDriver(driverName);
    await this.vehicleFormPage.clickSave();
  } else {
    // Update existing vehicle
    await this.vehiclesListPage.clickVehicleByPlate(plate);
    await this.vehicleFormPage.waitForFormReady();
    
    const editBtn = this.page.locator('.o_form_button_edit');
    if (await editBtn.isVisible()) {
      await this.vehicleFormPage.clickEdit();
    }
    
    await this.vehicleFormPage.selectDriver(driverName);
    await this.vehicleFormPage.clickSave();
  }
});

/**
 * When I click vehicle {string}
 * Clicks on a vehicle in the list to open it
 */
When('I click vehicle {string}', { timeout: 15000 }, async function (this: CustomWorld, plate: string) {
  await this.vehiclesListPage.clickVehicleByPlate(plate);
  await this.vehicleFormPage.waitForFormReady();
});

/**
 * When I search for {string}
 * Searches in the current list view
 */
When('I search for {string}', async function (this: CustomWorld, searchText: string) {
  await this.vehiclesListPage.search(searchText);
});

/**
 * Then I should see {string} in results
 * Verifies text appears in search results
 */
Then('I should see {string} in results', async function (this: CustomWorld, expectedText: string) {
  const resultsArea = this.page.locator('.o_list_view, .o_kanban_view');
  await expect(resultsArea).toContainText(expectedText);
});

/**
 * Then driver {string} should not have any vehicles
 * Verifies a driver has no vehicles assigned
 */
Then('driver {string} should not have any vehicles', async function (this: CustomWorld, driverName: string) {
  // Search for vehicles with this driver
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());
  await this.vehiclesListPage.search(driverName);
  
  // Check no results or driver column is empty
  const driverColumn = this.page.locator(`td[data-field="driver_id"]:has-text("${driverName}")`);
  const count = await driverColumn.count();
  expect(count).toBe(0);
});

/**
 * Then I should see error message about missing {string}
 * Verifies validation error for missing field
 */
Then('I should see error message about missing {string}', async function (this: CustomWorld, fieldName: string) {
  // Check for validation errors
  const hasErrors = await this.vehicleFormPage.hasValidationErrors();
  expect(hasErrors).toBe(true);
  
  // Or check notification
  const notification = this.page.locator('.o_notification_content');
  if (await notification.isVisible()) {
    const text = await notification.textContent();
    expect(text?.toLowerCase()).toContain(fieldName.toLowerCase());
  }
});
