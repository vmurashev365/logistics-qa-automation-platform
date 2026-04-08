/**
 * API Step Definitions
 * Atomic steps for REST and Odoo JSON-RPC API testing
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';

// =============================================================================
// Authentication Steps
// =============================================================================

Given('Odoo API is authenticated', { timeout: 30000 }, async function (this: CustomWorld) {
  // API client is already authenticated in Before hook
  // This step verifies authentication is active
  if (!this.odooApi.isAuthenticated()) {
    const config = await import('../../support/env');
    const env = config.getEnvConfig();
    await this.odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  }
  expect(this.odooApi.isAuthenticated()).toBe(true);
});

Given('API client is configured for {string}', async function (this: CustomWorld, baseUrl: string) {
  this.restApi.setBaseUrl(baseUrl);
});

// =============================================================================
// HTTP Request Steps
// =============================================================================

When('I send {string} request to {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string
) {
  const response = await this.restApi.request(method, endpoint);
  this.lastApiResponse = response;
});

When('I send {string} request to {string} with body:', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string,
  dataTable: DataTable
) {
  // Convert DataTable to object
  const rows = dataTable.raw();
  const body: Record<string, unknown> = {};
  
  for (const [key, value] of rows) {
    // Parse value types
    body[key] = parseValue(value);
  }

  const response = await this.restApi.request(method, endpoint, body);
  this.lastApiResponse = response;
});

When('I send {string} request to {string} with query:', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string,
  dataTable: DataTable
) {
  // Build query string from DataTable
  const rows = dataTable.raw();
  const params = new URLSearchParams();
  
  for (const [key, value] of rows) {
    params.append(key, value);
  }

  const fullEndpoint = `${endpoint}?${params.toString()}`;
  const response = await this.restApi.request(method, fullEndpoint);
  this.lastApiResponse = response;
});

When('I send {string} request to {string} with JSON:', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string,
  jsonString: string
) {
  const body = JSON.parse(jsonString);
  const response = await this.restApi.request(method, endpoint, body);
  this.lastApiResponse = response;
});

// =============================================================================
// Odoo-Specific API Steps
// =============================================================================

When('I search for {string} in {string} model via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  fieldValue: string,
  model: string
) {
  // Generic search - determines field based on model
  const searchField = getDefaultSearchField(model);
  const records = await this.odooApi.searchRead(model, [[searchField, 'ilike', fieldValue]], ['id', searchField]);
  
  this.lastApiResponse = {
    status: 200,
    headers: {},
    body: records,
  };
});

When('I create {string} record via API with:', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  dataTable: DataTable
) {
  const values = dataTableToObject(dataTable);
  const id = await this.odooApi.create(model, values);
  
  this.lastApiResponse = {
    status: 200,
    headers: {},
    body: { id },
  };

  // Store created ID for cleanup
  this.setTestData(`created_${model}_id`, id);
});

When('I read {string} record with ID {int} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  id: number
) {
  const records = await this.odooApi.read(model, [id], []);
  
  this.lastApiResponse = {
    status: records.length > 0 ? 200 : 404,
    headers: {},
    body: records.length > 0 ? records[0] : null,
  };
});

When('I update {string} record with ID {int} via API with:', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  id: number,
  dataTable: DataTable
) {
  const values = dataTableToObject(dataTable);
  const success = await this.odooApi.write(model, [id], values);
  
  this.lastApiResponse = {
    status: success ? 200 : 400,
    headers: {},
    body: { success },
  };
});

When('I delete {string} record with ID {int} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  id: number
) {
  const success = await this.odooApi.unlink(model, [id]);
  
  this.lastApiResponse = {
    status: success ? 200 : 400,
    headers: {},
    body: { success },
  };
});

// =============================================================================
// Fleet-Specific API Steps
// =============================================================================

When('I get list of vehicles via API', { timeout: 30000 }, async function (this: CustomWorld) {
  const vehicles = await this.fleetEndpoints.getVehicles();
  
  this.lastApiResponse = {
    status: 200,
    headers: {},
    body: vehicles,
  };
});

When('I get vehicle by plate {string} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  this.lastApiResponse = {
    status: vehicle ? 200 : 404,
    headers: {},
    body: vehicle,
  };
});

When('I create vehicle via API with:', { timeout: 30000 }, async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTableToObject(dataTable);
  const id = await this.fleetEndpoints.createVehicle(data as any);
  
  // Store for cleanup
  const createdIds = (this.getTestData<number[]>('created_vehicle_ids') || []);
  createdIds.push(id);
  this.setTestData('created_vehicle_ids', createdIds);
  
  this.lastApiResponse = {
    status: 200,
    headers: {},
    body: { id },
  };
});

When('I delete vehicle with plate {string} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  
  if (vehicle?.id) {
    const success = await this.fleetEndpoints.deleteVehicle(vehicle.id);
    this.lastApiResponse = {
      status: success ? 200 : 400,
      headers: {},
      body: { success, deletedId: vehicle.id },
    };
  } else {
    this.lastApiResponse = {
      status: 404,
      headers: {},
      body: { success: false, message: 'Vehicle not found' },
    };
  }
});

// =============================================================================
// Response Assertion Steps
// =============================================================================

Then('API response status should be {int}', function (this: CustomWorld, expectedStatus: number) {
  expect(this.lastApiResponse).toBeDefined();
  expect(this.lastApiResponse!.status).toBe(expectedStatus);
});

Then('API response should contain {string}', function (this: CustomWorld, expectedText: string) {
  expect(this.lastApiResponse).toBeDefined();
  const bodyString = JSON.stringify(this.lastApiResponse!.body);
  expect(bodyString).toContain(expectedText);
});

Then('API response should not contain {string}', function (this: CustomWorld, unexpectedText: string) {
  expect(this.lastApiResponse).toBeDefined();
  const bodyString = JSON.stringify(this.lastApiResponse!.body);
  expect(bodyString).not.toContain(unexpectedText);
});

Then('API response should be a valid JSON array', function (this: CustomWorld) {
  expect(this.lastApiResponse).toBeDefined();
  expect(Array.isArray(this.lastApiResponse!.body)).toBe(true);
});

Then('API response should be a valid JSON object', function (this: CustomWorld) {
  expect(this.lastApiResponse).toBeDefined();
  expect(typeof this.lastApiResponse!.body).toBe('object');
  expect(Array.isArray(this.lastApiResponse!.body)).toBe(false);
});

Then('API response JSON at {string} should equal {string}', function (
  this: CustomWorld,
  jsonPath: string,
  expectedValue: string
) {
  expect(this.lastApiResponse).toBeDefined();
  const actualValue = getJsonPathValue(this.lastApiResponse!.body, jsonPath);
  expect(String(actualValue)).toBe(expectedValue);
});

Then('API response JSON at {string} should equal {int}', function (
  this: CustomWorld,
  jsonPath: string,
  expectedValue: number
) {
  expect(this.lastApiResponse).toBeDefined();
  const actualValue = getJsonPathValue(this.lastApiResponse!.body, jsonPath);
  expect(actualValue).toBe(expectedValue);
});

Then('API response should contain:', function (this: CustomWorld, dataTable: DataTable) {
  expect(this.lastApiResponse).toBeDefined();
  const rows = dataTable.raw();
  
  for (const [jsonPath, expectedValue] of rows) {
    const actualValue = getJsonPathValue(this.lastApiResponse!.body, jsonPath);
    expect(String(actualValue)).toBe(expectedValue);
  }
});

Then('API response array should have {int} items', function (this: CustomWorld, count: number) {
  expect(this.lastApiResponse).toBeDefined();
  expect(Array.isArray(this.lastApiResponse!.body)).toBe(true);
  expect((this.lastApiResponse!.body as unknown[]).length).toBe(count);
});

Then('API response array should have at least {int} items', function (this: CustomWorld, count: number) {
  expect(this.lastApiResponse).toBeDefined();
  expect(Array.isArray(this.lastApiResponse!.body)).toBe(true);
  expect((this.lastApiResponse!.body as unknown[]).length).toBeGreaterThanOrEqual(count);
});

Then('API response should contain vehicle with plate {string}', function (
  this: CustomWorld,
  plate: string
) {
  expect(this.lastApiResponse).toBeDefined();
  const body = this.lastApiResponse!.body;
  
  if (Array.isArray(body)) {
    const found = body.some((v: any) => v.license_plate === plate);
    expect(found).toBe(true);
  } else {
    expect((body as any).license_plate).toBe(plate);
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a string value to appropriate type
 */
function parseValue(value: string): unknown {
  // Boolean
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  
  // Null
  if (value.toLowerCase() === 'null') return null;
  
  // Number
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;
  
  // String
  return value;
}

/**
 * Convert DataTable to object
 */
function dataTableToObject(dataTable: DataTable): Record<string, unknown> {
  const rows = dataTable.raw();
  const obj: Record<string, unknown> = {};
  
  for (const [key, value] of rows) {
    obj[key] = parseValue(value);
  }
  
  return obj;
}

/**
 * Get value from object using simple JSON path
 * Supports: $.field, $[0].field, field, [0].field
 */
function getJsonPathValue(obj: unknown, path: string): unknown {
  // Remove leading $. or $
  const cleanPath = path.replace(/^\$\.?/, '');
  
  // Handle empty path
  if (!cleanPath) return obj;
  
  // Split path into parts
  const parts = cleanPath.split(/\.|\[|\]/).filter(p => p !== '');
  
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Get default search field for a model
 */
function getDefaultSearchField(model: string): string {
  const fieldMap: Record<string, string> = {
    'fleet.vehicle': 'license_plate',
    'fleet.vehicle.model': 'name',
    'fleet.vehicle.model.brand': 'name',
    'res.partner': 'name',
    'res.users': 'login',
  };
  
  return fieldMap[model] || 'name';
}
