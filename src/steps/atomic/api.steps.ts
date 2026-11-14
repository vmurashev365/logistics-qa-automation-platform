/**
 * API Step Definitions
 * Atomic steps for REST and Odoo JSON-RPC API testing
 *
 * Two kinds of results are recorded in `lastApiResponse`:
 * - `http`: a real HTTP response (REST requests). Its status is the one the server sent.
 * - `rpc`: an Odoo JSON-RPC result from OdooJsonRpcClient. The client returns the result or
 *   throws, so an rpc result has no status; check the returned value instead.
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import type { ApiResult, VehicleCreateData } from '../../types/api';

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
  this.lastApiResponse = { kind: 'http', ...response };
});

When('I send {string} request to {string} with body:', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string,
  dataTable: DataTable
) {
  const body = dataTableToObject(dataTable);
  const response = await this.restApi.request(method, endpoint, body);
  this.lastApiResponse = { kind: 'http', ...response };
});

When('I send {string} request to {string} with query:', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string,
  dataTable: DataTable
) {
  // Build query string from DataTable
  const params = new URLSearchParams();
  for (const [key, value] of dataTable.raw()) {
    params.append(key, value);
  }

  const response = await this.restApi.request(method, `${endpoint}?${params.toString()}`);
  this.lastApiResponse = { kind: 'http', ...response };
});

When('I send {string} request to {string} with JSON:', { timeout: 30000 }, async function (
  this: CustomWorld,
  method: string,
  endpoint: string,
  jsonString: string
) {
  const body = JSON.parse(jsonString);
  const response = await this.restApi.request(method, endpoint, body);
  this.lastApiResponse = { kind: 'http', ...response };
});

// =============================================================================
// Odoo-Specific API Steps (JSON-RPC)
// =============================================================================

When('I search for {string} in {string} model via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  fieldValue: string,
  model: string
) {
  // Generic search - determines field based on model
  const searchField = getDefaultSearchField(model);
  const records = await this.odooApi.searchRead(model, [[searchField, 'ilike', fieldValue]], ['id', searchField]);
  this.lastApiResponse = { kind: 'rpc', call: `${model}.search_read ${searchField} ilike ${fieldValue}`, body: records };
});

When('I create {string} record via API with:', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  dataTable: DataTable
) {
  const values = dataTableToObject(dataTable);
  const id = await this.odooApi.create(model, values);
  this.lastApiResponse = { kind: 'rpc', call: `${model}.create`, body: { id } };

  // Store created ID for cleanup
  this.setTestData(`created_${model}_id`, id);
});

When('I read {string} record with ID {int} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  id: number
) {
  const records = await this.odooApi.read(model, [id], []);
  this.lastApiResponse = { kind: 'rpc', call: `${model}.read ${id}`, body: records.length > 0 ? records[0] : null };
});

When('I update {string} record with ID {int} via API with:', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  id: number,
  dataTable: DataTable
) {
  const values = dataTableToObject(dataTable);
  const success = await this.odooApi.write(model, [id], values);
  this.lastApiResponse = { kind: 'rpc', call: `${model}.write ${id}`, body: { success } };
});

When('I delete {string} record with ID {int} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  model: string,
  id: number
) {
  const success = await this.odooApi.unlink(model, [id]);
  this.lastApiResponse = { kind: 'rpc', call: `${model}.unlink ${id}`, body: { success } };
});

// =============================================================================
// Fleet-Specific API Steps (JSON-RPC)
// =============================================================================

When('I get list of vehicles via API', { timeout: 30000 }, async function (this: CustomWorld) {
  const vehicles = await this.fleetEndpoints.getVehicles();
  this.lastApiResponse = { kind: 'rpc', call: 'fleet.vehicle.search_read', body: vehicles };
});

When('I get vehicle by plate {string} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  this.lastApiResponse = { kind: 'rpc', call: `fleet.vehicle.search_read license_plate = ${plate}`, body: vehicle };
});

When('I create vehicle via API with:', { timeout: 30000 }, async function (
  this: CustomWorld,
  dataTable: DataTable
) {
  const data = dataTableToObject(dataTable) as unknown as VehicleCreateData;
  const id = await this.fleetEndpoints.createVehicle(data);

  if (typeof data.license_plate === 'string') {
    this.trackVehicle(data.license_plate);
  }
  this.setTestData('lastCreatedVehicleId', id);
  this.lastApiResponse = { kind: 'rpc', call: 'fleet.vehicle.create', body: { id } };
});

When('I delete vehicle with plate {string} via API', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  const vehicle = await this.fleetEndpoints.getVehicleByPlate(plate);
  if (!vehicle?.id) {
    throw new Error(`Cannot delete vehicle "${plate}": Odoo has no active vehicle with this plate`);
  }

  const success = await this.fleetEndpoints.deleteVehicle(vehicle.id);
  this.lastApiResponse = { kind: 'rpc', call: `fleet.vehicle.unlink ${vehicle.id}`, body: { success, deletedId: vehicle.id } };
});

// =============================================================================
// Response Assertion Steps
// =============================================================================

function requireResult(world: CustomWorld): ApiResult {
  if (!world.lastApiResponse) {
    throw new Error('No API call was made in this scenario');
  }
  return world.lastApiResponse;
}

Then('API response status should be {int}', function (this: CustomWorld, expectedStatus: number) {
  const result = requireResult(this);
  if (result.kind !== 'http') {
    throw new Error(
      `The last API call (${result.call}) was an Odoo JSON-RPC call: it has no HTTP status of its own. ` +
        'Check what it returned instead.'
    );
  }
  expect(result.status, 'HTTP status').toBe(expectedStatus);
});

Then('API response should contain {string}', function (this: CustomWorld, expectedText: string) {
  const bodyString = JSON.stringify(requireResult(this).body);
  expect(bodyString).toContain(expectedText);
});

Then('API response should not contain {string}', function (this: CustomWorld, unexpectedText: string) {
  const bodyString = JSON.stringify(requireResult(this).body);
  expect(bodyString).not.toContain(unexpectedText);
});

Then('API response should be a valid JSON array', function (this: CustomWorld) {
  expect(Array.isArray(requireResult(this).body)).toBe(true);
});

Then('API response should be a valid JSON object', function (this: CustomWorld) {
  const body = requireResult(this).body;
  expect(typeof body).toBe('object');
  expect(body).not.toBeNull();
  expect(Array.isArray(body)).toBe(false);
});

Then('API response JSON at {string} should equal {string}', function (
  this: CustomWorld,
  jsonPath: string,
  expectedValue: string
) {
  const actualValue = getJsonPathValue(requireResult(this).body, jsonPath);
  expect(String(actualValue)).toBe(expectedValue);
});

Then('API response JSON at {string} should equal {int}', function (
  this: CustomWorld,
  jsonPath: string,
  expectedValue: number
) {
  const actualValue = getJsonPathValue(requireResult(this).body, jsonPath);
  expect(actualValue).toBe(expectedValue);
});

Then('API response should contain:', function (this: CustomWorld, dataTable: DataTable) {
  const body = requireResult(this).body;
  for (const [jsonPath, expectedValue] of dataTable.raw()) {
    const actualValue = getJsonPathValue(body, jsonPath);
    expect(String(actualValue)).toBe(expectedValue);
  }
});

Then('API response array should have {int} items', function (this: CustomWorld, count: number) {
  const body = requireResult(this).body;
  expect(Array.isArray(body)).toBe(true);
  expect((body as unknown[]).length).toBe(count);
});

Then('API response array should have at least {int} items', function (this: CustomWorld, count: number) {
  const body = requireResult(this).body;
  expect(Array.isArray(body)).toBe(true);
  expect((body as unknown[]).length).toBeGreaterThanOrEqual(count);
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
  const obj: Record<string, unknown> = {};
  for (const [key, value] of dataTable.raw()) {
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
