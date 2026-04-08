/**
 * Financial Compliance Domain Steps
 *
 * Tags: @api @integration
 *
 * Compares REST API responses against deterministic calculator logic.
 */

import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { getFinanceEnv } from '../../helpers/service-env';
import { FinancialCalculator } from '../../helpers/FinancialCalculator';
import { dollarsToCents, isWithinCentsTolerance } from '../../helpers/money';
import type {
  SalaryCalculationRequest,
  IftaCalculationRequest,
} from '../../types/finance';

const calculator = new FinancialCalculator();

Given('financial compliance API is configured', async function (this: CustomWorld) {
  const env = getFinanceEnv();
  this.restApi.setBaseUrl(env.apiBaseUrl);
  this.restApi.setAuthorization(env.apiAuthToken, 'Bearer');

  this.setTestData('finance_env', env);
});

When('I request salary calculation with:', async function (this: CustomWorld, table: DataTable) {
  const env = getFinanceEnv();
  const request = parseSalaryRequest(table);

  const response = await this.restApi.post<unknown>(env.financeSalaryEndpoint, request);
  this.lastApiResponse = response;

  this.setTestData('salary_request', request);
});

Then('salary response should match calculator within 1 cent', function (this: CustomWorld) {
  const request = this.getTestData<SalaryCalculationRequest>('salary_request');
  if (!request) {
    throw new Error('Missing salary_request in world state');
  }

  const expectedCents = calculator.salaryCents({
    miles: request.miles,
    ratePerMileCents: request.rate_per_mile_cents,
  });

  const body = this.lastApiResponse?.body;
  const actualCents = extractMoneyCents(body, ['salary_cents', 'salaryCents', 'salary']);

  expect(
    isWithinCentsTolerance(actualCents, expectedCents, 1),
    `Salary mismatch: expected ${expectedCents}c, got ${actualCents}c`
  ).toBe(true);
});

When('I request IFTA calculation with:', async function (this: CustomWorld, table: DataTable) {
  const env = getFinanceEnv();
  const request = parseIftaRequest(table);

  const response = await this.restApi.post<unknown>(env.financeIftaEndpoint, request);
  this.lastApiResponse = response;

  this.setTestData('ifta_request', request);
});

Then('IFTA response should match calculator within 1 cent', function (this: CustomWorld) {
  const request = this.getTestData<IftaCalculationRequest>('ifta_request');
  if (!request) {
    throw new Error('Missing ifta_request in world state');
  }

  const expected = calculator.ifta({
    miles: request.miles,
    mpg: request.mpg,
    stateRateCentsPerGallon: request.state_rate_cents_per_gallon,
    taxPaidCents: request.tax_paid_cents,
  });

  const body = this.lastApiResponse?.body;

  const taxDueCents = extractMoneyCents(body, ['tax_due_cents', 'taxDueCents', 'tax_due']);
  const netCents = extractMoneyCents(body, ['net_cents', 'netCents', 'net']);

  expect(
    isWithinCentsTolerance(taxDueCents, expected.taxDueCents, 1),
    `IFTA tax_due mismatch: expected ${expected.taxDueCents}c, got ${taxDueCents}c`
  ).toBe(true);

  expect(
    isWithinCentsTolerance(netCents, expected.netCents, 1),
    `IFTA net mismatch: expected ${expected.netCents}c, got ${netCents}c`
  ).toBe(true);

  // Gallons is a derived float; assert it's finite and close to our computed value.
  const gallons = extractNumber(body, ['gallons']);
  expect(Number.isFinite(gallons)).toBe(true);
  expect(Math.abs(gallons - expected.gallons)).toBeLessThan(1e-6);
});

// ============================================================================
// Parsing + extraction helpers (no any)
// ============================================================================

function parseSalaryRequest(table: DataTable): SalaryCalculationRequest {
  const rows = table.rowsHash();
  return {
    miles: parseFiniteNumber(rows['miles'], 'miles'),
    rate_per_mile_cents: parseIntStrict(rows['rate_per_mile_cents'], 'rate_per_mile_cents'),
  };
}

function parseIftaRequest(table: DataTable): IftaCalculationRequest {
  const rows = table.rowsHash();
  return {
    miles: parseFiniteNumber(rows['miles'], 'miles'),
    mpg: parseFiniteNumber(rows['mpg'], 'mpg'),
    state_rate_cents_per_gallon: parseIntStrict(rows['state_rate_cents_per_gallon'], 'state_rate_cents_per_gallon'),
    tax_paid_cents: parseIntStrict(rows['tax_paid_cents'], 'tax_paid_cents'),
  };
}

function parseFiniteNumber(value: string | undefined, field: string): number {
  if (value === undefined) throw new Error(`Missing field: ${field}`);
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid number for ${field}: ${value}`);
  return n;
}

function parseIntStrict(value: string | undefined, field: string): number {
  if (value === undefined) throw new Error(`Missing field: ${field}`);
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new Error(`Invalid integer for ${field}: ${value}`);
  return n;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractNumber(body: unknown, keys: string[]): number {
  if (!isRecord(body)) {
    throw new Error(`Expected JSON object response, got: ${typeof body}`);
  }

  for (const key of keys) {
    const v = body[key];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }

  throw new Error(`Response missing numeric field(s): ${keys.join(', ')}`);
}

function extractMoneyCents(body: unknown, keys: string[]): number {
  if (!isRecord(body)) {
    throw new Error(`Expected JSON object response, got: ${typeof body}`);
  }

  for (const key of keys) {
    const v = body[key];
    if (typeof v === 'number' && Number.isFinite(v)) {
      // Heuristic: if the key contains 'cents' treat as cents; else treat as dollars.
      if (key.toLowerCase().includes('cents')) return Math.trunc(v);
      return dollarsToCents(v);
    }
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      const parsed = Number(v);
      if (key.toLowerCase().includes('cents')) return Math.trunc(parsed);
      return dollarsToCents(parsed);
    }
  }

  throw new Error(`Response missing money field(s): ${keys.join(', ')}`);
}
