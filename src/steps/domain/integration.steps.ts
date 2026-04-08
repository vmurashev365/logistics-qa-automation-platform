/**
 * Integration Step Definitions
 * Steps for cross-layer testing (UI-API-DB integration)
 * Bridges atomic steps into integration scenarios
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { UI_MAP } from '../../ui-map';
import { Vehicle } from '../../types/api';

// =============================================================================
// Message Verification Steps (UI-MAP pattern)
// =============================================================================

/**
 * Then I should see {string} message
 * Verifies a UI-MAP message is visible (notification format)
 */
Then('I should see {string} message', { timeout: 10000 }, async function (this: CustomWorld, messageKey: string) {
  // Try UI-MAP lookup first
  const message = UI_MAP.messages[messageKey as keyof typeof UI_MAP.messages];
  const expectedText = message || messageKey;

  // Odoo notification selectors (various versions)
  const notificationSelectors = [
    '.o_notification_content',
    '.o_notification_body',
    '.o_notification .text-break',
    '.alert-success',
    '.alert-info',
  ];

  let found = false;
  for (const selector of notificationSelectors) {
    const notification = this.page.locator(selector).first();
    try {
      await notification.waitFor({ state: 'visible', timeout: 3000 });
      const text = await notification.textContent();
      if (text?.toLowerCase().includes(expectedText.toLowerCase())) {
        found = true;
        break;
      }
    } catch {
      // Try next selector
    }
  }

  if (!found) {
    // Fallback: check page body for the message
    await expect(this.page.locator('body')).toContainText(expectedText, { timeout: 5000 });
  }
});

// =============================================================================
// Search Steps
// =============================================================================

/**
 * When I search for {string} in search
 * Performs search using Odoo search bar
 */
When('I search for {string} in search', { timeout: 15000 }, async function (this: CustomWorld, searchTerm: string) {
  // Odoo search input selectors (varies by version)
  const searchSelectors = [
    '.o_searchview_input',
    'input.o_searchview_input',
    '.o_search_panel_current_selection input',
    '[placeholder*="Search"]',
  ];

  let filled = false;
  for (const selector of searchSelectors) {
    try {
      const searchInput = this.page.locator(selector).first();
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill(searchTerm);
        await this.page.keyboard.press('Enter');
        filled = true;
        break;
      }
    } catch {
      // Try next selector
    }
  }

  if (!filled) {
    // Fallback: try search through vehicle list page method
    await this.vehiclesListPage.searchVehicle(searchTerm);
  }

  // Wait for results to load (fast wait)
  await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
});

// =============================================================================
// API Integration Steps
// =============================================================================

/**
 * When I send authenticated request to search vehicles with plate {string}
 * Uses FleetEndpoints to search vehicles via API
 */
When('I send authenticated request to search vehicles with plate {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  // Ensure API is authenticated
  if (!this.odooApi.isAuthenticated()) {
    const config = await import('../../support/env');
    const env = config.getEnvConfig();
    await this.odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  }

  // Search for vehicle
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  this.lastApiResponse = {
    status: vehicle ? 200 : 404,
    headers: {},
    body: vehicle ? [vehicle] : [],
  };

  // Store for later assertions
  if (vehicle) {
    this.setTestData('lastVehicleApiResult', vehicle);
  }
});

/**
 * When I send authenticated request to get vehicle {string}
 * Retrieves a specific vehicle via API
 */
When('I send authenticated request to get vehicle {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  // Ensure API is authenticated
  if (!this.odooApi.isAuthenticated()) {
    const config = await import('../../support/env');
    const env = config.getEnvConfig();
    await this.odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  }

  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  this.lastApiResponse = {
    status: vehicle ? 200 : 404,
    headers: {},
    body: vehicle,
  };

  if (vehicle) {
    this.setTestData('lastVehicleApiResult', vehicle);
  }
});

/**
 * Then API response should show odometer {int}
 * Verifies odometer value in API response
 */
Then('API response should show odometer {int}', async function (this: CustomWorld, expectedOdometer: number) {
  const vehicle = this.lastApiResponse?.body as Vehicle | undefined;
  expect(vehicle).toBeDefined();
  expect(vehicle?.odometer || 0).toBe(expectedOdometer);
});

/**
 * Then API response should show driver {string}
 * Verifies driver in API response
 */
Then('API response should show driver {string}', async function (this: CustomWorld, driverName: string) {
  const vehicle = this.lastApiResponse?.body as Vehicle | undefined;
  expect(vehicle).toBeDefined();
  const driverIdArray = vehicle?.driver_id as [number, string] | undefined;
  const actualDriver = driverIdArray?.[1] || '';
  expect(actualDriver).toContain(driverName);
});

/**
 * When I store API response vehicle data
 * Stores vehicle data for later comparison
 */
When('I store API response vehicle data', async function (this: CustomWorld) {
  const vehicle = this.lastApiResponse?.body;
  expect(vehicle).toBeDefined();
  this.setTestData('storedVehicleData', JSON.parse(JSON.stringify(vehicle)));
});

// =============================================================================
// Vehicle Existence Steps
// =============================================================================

/**
 * Given vehicle {string} exists in the system
 * Ensures vehicle exists (creates if not)
 */
Given('vehicle {string} exists in the system', { timeout: 60000 }, async function (this: CustomWorld, plate: string) {
  // Check if exists via API
  const existingVehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  if (!existingVehicle) {
    // Create via API
    const modelId = await this.fleetEndpoints.getOrCreateDefaultModel();
    await this.fleetEndpoints.createVehicle({
      license_plate: plate,
      model_id: modelId,
      odometer: 0,
    });
    
    // Store for cleanup
    const testVehicles = this.getTestData<string[]>('testVehicles') || [];
    testVehicles.push(plate);
    this.setTestData('testVehicles', testVehicles);
  }
});

/**
 * Given vehicle {string} is assigned to driver {string}
 * Ensures vehicle has driver assigned
 */
Given('vehicle {string} is assigned to driver {string}', { timeout: 60000 }, async function (
  this: CustomWorld,
  plate: string,
  driverName: string
) {
  // Ensure vehicle exists
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  if (!vehicle?.id) {
    throw new Error(`Vehicle ${plate} not found. Create it first.`);
  }

  // Find driver
  const drivers = await this.odooApi.searchRead<{ id: number; name: string }>(
    'res.partner',
    [['name', 'ilike', driverName]],
    ['id', 'name']
  );

  if (drivers.length === 0) {
    throw new Error(`Driver "${driverName}" not found.`);
  }

  // Assign driver to vehicle
  await this.odooApi.write('fleet.vehicle', [vehicle.id], {
    driver_id: drivers[0].id,
  });
});

// =============================================================================
// UI Action Steps
// =============================================================================

/**
 * When I click on vehicle {string}
 * Clicks on a specific vehicle row in list
 */
When('I click on vehicle {string}', { timeout: 15000 }, async function (this: CustomWorld, plate: string) {
  await this.vehiclesListPage.clickVehicleByPlate(plate);
});

/**
 * When I update odometer to {int}
 * Updates odometer when already on vehicle form
 */
When('I update odometer to {int}', { timeout: 30000 }, async function (this: CustomWorld, odometerValue: number) {
  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Click edit if not in edit mode
  try {
    const editBtn = this.page.locator('.o_form_button_edit');
    if (await editBtn.isVisible({ timeout: 1000 })) {
      await editBtn.click();
      await this.page.waitForTimeout(500);
    }
  } catch {
    // Already in edit mode
  }

  // Update odometer
  await this.vehicleFormPage.fillField('odometer', odometerValue.toString());

  // Save
  await this.vehicleFormPage.clickSave();
  await this.page.waitForTimeout(1000);

  this.setTestData('updatedOdometer', odometerValue);
  console.log(`✅ Updated odometer to ${odometerValue}`);
});

/**
 * When I assign driver {string} via UI
 * Assigns driver when already on vehicle form - creates driver if not exists
 */
When('I assign driver {string} via UI', { timeout: 30000 }, async function (this: CustomWorld, driverName: string) {
  // Wait for form to be ready
  await this.vehicleFormPage.waitForFormReady();

  // Click edit if not in edit mode
  try {
    const editBtn = this.page.locator('.o_form_button_edit');
    if (await editBtn.isVisible({ timeout: 1000 })) {
      await editBtn.click();
      await this.page.waitForTimeout(500);
    }
  } catch {
    // Already in edit mode
  }

  // Click on Driver field to open dropdown
  const driverField = this.page.locator('div[name="driver_id"]');
  await driverField.click();
  await this.page.waitForTimeout(300);

  // Type driver name to search
  const driverInput = this.page.locator('div[name="driver_id"] input');
  await driverInput.fill(driverName);
  await this.page.waitForTimeout(500);

  // Try to select existing driver or create new one
  const existingOption = this.page.locator('.o-autocomplete--dropdown-menu .o-autocomplete--dropdown-item').filter({
    hasText: new RegExp(`^${driverName}$`, 'i')
  }).first();

  if (await existingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    // Select existing driver
    await existingOption.click();
  } else {
    // Look for "Create" option
    const createOption = this.page.locator('.o-autocomplete--dropdown-menu').getByText(`Create "${driverName}"`).first();
    if (await createOption.isVisible({ timeout: 1000 }).catch(() => false)) {
      await createOption.click();
    } else {
      // Try clicking first dropdown option
      const firstOption = this.page.locator('.o-autocomplete--dropdown-menu .o-autocomplete--dropdown-item').first();
      await firstOption.click();
    }
  }

  await this.page.waitForTimeout(500);

  // Save the form
  await this.vehicleFormPage.clickSave();
  await this.page.waitForTimeout(1000);

  this.setTestData('assignedDriver', driverName);
  console.log(`✅ Assigned driver "${driverName}" via UI`);
});

/**
 * Then UI should show odometer {int}
 * Verifies odometer value displayed in the UI form
 */
Then('UI should show odometer {int}', { timeout: 10000 }, async function (this: CustomWorld, expectedValue: number) {
  // Wait for form to be ready
  await this.vehicleFormPage.waitForFormReady();
  
  // Get odometer field value - selector from screenshot: div[name="odometer"] input
  const odometerInput = this.page.locator('div[name="odometer"] input, input#odometer_0');
  
  // Get displayed value
  const displayedValue = await odometerInput.inputValue();
  
  // Parse value (may contain formatting like "15,000.00")
  const numericValue = parseFloat(displayedValue.replace(/,/g, ''));
  
  console.log(`📊 UI Odometer value: ${displayedValue} (parsed: ${numericValue})`);
  
  expect(numericValue).toBe(expectedValue);
});

/**
 * Then UI should show driver {string}
 * Verifies driver is displayed in the UI form
 */
Then('UI should show driver {string}', { timeout: 10000 }, async function (this: CustomWorld, expectedDriver: string) {
  // Wait for form
  await this.vehicleFormPage.waitForFormReady();

  // Get driver field value from form view
  const driverField = this.page.locator('div[name="driver_id"] span, div[name="driver_id"] a');
  const displayedDriver = await driverField.textContent();

  console.log(`📊 UI Driver: ${displayedDriver?.trim()}`);

  expect(displayedDriver?.trim()).toContain(expectedDriver);
});

// Note: "I update odometer for vehicle {string} to {int}" step is defined in vehicle-workflows.steps.ts

/**
 * When I delete vehicle {string} via UI
 * Deletes a vehicle using the UI (navigates first)
 */
When('I delete vehicle {string} via UI', { timeout: 30000 }, async function (this: CustomWorld, plate: string) {
  // Navigate to vehicle
  await this.vehiclesListPage.navigateToVehicles(this.getBaseUrl());
  await this.vehiclesListPage.searchVehicle(plate);
  await this.vehiclesListPage.clickVehicleByPlate(plate);

  // Click Action menu and Delete
  const actionBtn = this.page.locator('.o_cp_action_menus button').first();
  await actionBtn.click();
  
  const deleteOption = this.page.getByRole('menuitem', { name: /delete/i });
  await deleteOption.click();

  // Confirm deletion
  const confirmBtn = this.page.getByRole('button', { name: /ok|confirm|delete/i });
  await confirmBtn.click();

  // Wait for navigation back to list
  await this.page.waitForLoadState('domcontentloaded');
});

/**
 * When I delete current vehicle
 * Deletes the currently opened vehicle (must be on vehicle form)
 */
When('I delete current vehicle', { timeout: 30000 }, async function (this: CustomWorld) {
  // Wait for form
  await this.vehicleFormPage.waitForFormReady();
  
  // Click Action menu (dropdown button in control panel)
  const actionBtn = this.page.locator('.o_cp_action_menus button, button.dropdown-toggle:has-text("Action")').first();
  await actionBtn.waitFor({ state: 'visible', timeout: 5000 });
  await actionBtn.click();
  
  // Wait for menu and click Delete
  const deleteOption = this.page.getByRole('menuitem', { name: /delete/i });
  await deleteOption.waitFor({ state: 'visible', timeout: 5000 });
  await deleteOption.click();

  // Wait for confirmation dialog "Bye-bye, record!"
  await this.page.waitForTimeout(500);

  // Click Delete button in modal (btn-primary with text "Delete")
  const confirmDeleteBtn = this.page.locator('.modal-footer button.btn-primary:has-text("Delete")');
  await confirmDeleteBtn.waitFor({ state: 'visible', timeout: 5000 });
  await confirmDeleteBtn.click();

  // Wait for navigation back to list
  await this.page.waitForLoadState('domcontentloaded');
  console.log('✅ Vehicle deleted via UI');
});

/**
 * When I delete vehicle {string}
 * Simpler delete step (assumes already on vehicle page/list)
 */
When('I delete vehicle {string}', { timeout: 30000 }, async function (this: CustomWorld, plate: string) {
  // Search and select vehicle
  await this.vehiclesListPage.searchVehicle(plate);
  await this.vehiclesListPage.clickVehicleByPlate(plate);

  // Click Action menu and Delete
  const actionBtn = this.page.locator('.o_cp_action_menus button, button:has-text("Action")').first();
  await actionBtn.click();
  
  const deleteOption = this.page.getByRole('menuitem', { name: /delete/i });
  await deleteOption.click();
});

/**
 * When I confirm deletion
 * Confirms deletion dialog
 */
When('I confirm deletion', { timeout: 10000 }, async function (this: CustomWorld) {
  const confirmBtn = this.page.getByRole('button', { name: /ok|confirm|delete|yes/i });
  await confirmBtn.click();
  await this.page.waitForLoadState('domcontentloaded');
});

// =============================================================================
// Database Cross-Verification Steps
// Note: Core database steps are defined in db.steps.ts
// Additional integration-specific database steps can be added here
// =============================================================================

/**
 * Then database vehicle {string} should match API response
 * Verifies database data matches stored API response
 */
Then('database vehicle {string} should match API response', { timeout: 10000 }, async function (
  this: CustomWorld,
  plate: string
) {
  if (!this.dbClient) {
    console.log('Database client not configured, skipping DB verification');
    return;
  }

  const dbVehicle = await this.dbClient.getVehicleByPlate(plate);
  const apiVehicle = this.getTestData<Record<string, unknown>>('storedVehicleData');
  
  expect(dbVehicle).toBeDefined();
  expect(apiVehicle).toBeDefined();
  
  // Compare key fields
  expect(dbVehicle?.license_plate).toBe(apiVehicle?.license_plate);
});

// =============================================================================
// API Result Verification Steps
// =============================================================================

/**
 * Then API response should return empty results
 * Verifies empty API response
 */
Then('API response should return empty results', async function (this: CustomWorld) {
  const response = this.lastApiResponse;
  expect(response).toBeDefined();
  
  const body = response?.body;
  const isEmpty = !body || 
    (Array.isArray(body) && body.length === 0) ||
    body === null;
  
  expect(isEmpty).toBe(true);
});

/**
 * Then I should not see {string} in vehicle list
 * Verifies vehicle is NOT visible in current list/kanban view
 */
Then('I should not see {string} in vehicle list', { timeout: 10000 }, async function (
  this: CustomWorld,
  plate: string
) {
  await this.vehiclesListPage.waitForLoadingComplete();
  
  // Check that vehicle is NOT visible in list or kanban
  const listRow = this.page.locator('.o_data_row').filter({
    has: this.page.locator(`td:has-text("${plate}")`)
  }).first();
  
  const kanbanCard = this.page.locator('.o_kanban_record').filter({
    hasText: plate
  }).first();
  
  const listVisible = await listRow.isVisible({ timeout: 1000 }).catch(() => false);
  const kanbanVisible = await kanbanCard.isVisible({ timeout: 1000 }).catch(() => false);
  
  expect(listVisible || kanbanVisible).toBe(false);
  console.log(`✅ Vehicle "${plate}" is NOT visible in list (as expected)`);
});

/**
 * Then API response should be empty or archived
 * Verifies vehicle is either not found or archived (active=false)
 */
Then('API response should be empty or archived', async function (this: CustomWorld) {
  const response = this.lastApiResponse;
  
  // If no response or empty body - vehicle not found (good)
  if (!response || !response.body) {
    console.log('✅ API: Vehicle not found (deleted)');
    return;
  }
  
  // If vehicle found, check if it's archived
  const vehicle = response.body as { active?: boolean };
  if (vehicle.active === false) {
    console.log('✅ API: Vehicle is archived (active=false)');
    return;
  }
  
  // Vehicle exists and is active - this is a failure
  expect(vehicle.active).toBe(false);
});

/**
 * When I create vehicle via API with plate {string}
 * Creates vehicle via API
 */
When('I create vehicle via API with plate {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  const modelId = await this.fleetEndpoints.getOrCreateDefaultModel();
  const vehicleId = await this.fleetEndpoints.createVehicle({
    license_plate: plate,
    model_id: modelId,
    odometer: 0,
  });
  
  this.lastApiResponse = {
    status: vehicleId ? 200 : 400,
    headers: {},
    body: { id: vehicleId, license_plate: plate },
  };
  
  // Store for cleanup
  const testVehicles = this.getTestData<string[]>('testVehicles') || [];
  testVehicles.push(plate);
  this.setTestData('testVehicles', testVehicles);
});

/**
 * When I update vehicle {string} odometer to {int} via API
 * Updates vehicle odometer via API
 */
When('I update vehicle {string} odometer to {int} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string,
  odometer: number
) {
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  if (!vehicle?.id) {
    throw new Error(`Vehicle ${plate} not found`);
  }
  
  const success = await this.fleetEndpoints.updateVehicle(vehicle.id, { odometer });
  
  this.lastApiResponse = {
    status: success ? 200 : 400,
    headers: {},
    body: { success, odometer },
  };
});

/**
 * Then I should see odometer value {string}
 * Verifies odometer value on page
 */
Then('I should see odometer value {string}', { timeout: 10000 }, async function (
  this: CustomWorld,
  expectedValue: string
) {
  // Look for odometer field value
  const odometerField = this.page.locator('[name="odometer"], [name="odometer_count"]').first();
  
  if (await odometerField.isVisible({ timeout: 3000 })) {
    const actualValue = await odometerField.inputValue();
    expect(actualValue).toContain(expectedValue);
  } else {
    // Fall back to text match
    await expect(this.page.locator(`text=${expectedValue}`)).toBeVisible({ timeout: 5000 });
  }
});

/**
 * Then test environment should be clean
 * Verifies test cleanup was successful
 */
Then('test environment should be clean', async function (this: CustomWorld) {
  // Verify test vehicles were cleaned up
  const testVehicles = this.getTestData<string[]>('testVehicles') || [];
  
  for (const plate of testVehicles) {
    const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
    expect(vehicle).toBeFalsy();
  }
});

/**
 * Then API response should not find vehicle {string}
 * Verifies vehicle not found via API
 */
Then('API response should not find vehicle {string}', async function (this: CustomWorld, plate: string) {
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  expect(vehicle).toBeFalsy();
});

/**
 * Then API and UI should show same vehicle data
 * Compares stored API response with UI display
 */
Then('API and UI should show same vehicle data', { timeout: 20000 }, async function (this: CustomWorld) {
  const apiVehicle = this.getTestData<Record<string, unknown>>('storedVehicleData');
  expect(apiVehicle).toBeDefined();

  // Get plate from API data
  const plate = apiVehicle?.license_plate as string;
  
  // Verify UI shows the same plate
  await expect(this.page.locator(`text=${plate}`)).toBeVisible({ timeout: 5000 });
});
