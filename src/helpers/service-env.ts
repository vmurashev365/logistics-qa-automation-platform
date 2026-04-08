/**
 * Loads and validates the "ENV Contract" variables.
 *
 * This module intentionally keeps existing env.ts behavior intact and only
 * enforces required variables when these higher-level modules are used.
 */

import type {
  ServiceEnvContract,
  FinanceEnvContract,
  OfflineSyncEnvContract,
  CtiEnvContract,
  HosEnvContract,
} from '../types/env-contract';

// Ensure .env is loaded (env.ts performs dotenv.config at import time).
import '../support/env';

function required(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(value: string | undefined): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Prefer contract names, but allow fallback to existing repo variables
 * for backward compatibility.
 */
export function getServiceEnv(): ServiceEnvContract {
  const apiBaseUrl = optional(process.env.API_BASE_URL) ?? optional(process.env.REST_BASE_URL);
  const odooBaseUrl = optional(process.env.ODOO_BASE_URL) ?? optional(process.env.BASE_URL);

  const odooUser = optional(process.env.ODOO_USER) ?? optional(process.env.ODOO_USERNAME);
  const odooPass = optional(process.env.ODOO_PASS) ?? optional(process.env.ODOO_PASSWORD);

  return {
    apiBaseUrl: required('API_BASE_URL', apiBaseUrl),
    apiAuthToken: required('API_AUTH_TOKEN', process.env.API_AUTH_TOKEN),

    odooBaseUrl: required('ODOO_BASE_URL', odooBaseUrl),
    odooUser: required('ODOO_USER', odooUser),
    odooPass: required('ODOO_PASS', odooPass),

    ctiWsPattern: required('CTI_WS_PATTERN', process.env.CTI_WS_PATTERN),

    financeSalaryEndpoint: required('FINANCE_SALARY_ENDPOINT', process.env.FINANCE_SALARY_ENDPOINT),
    financeIftaEndpoint: required('FINANCE_IFTA_ENDPOINT', process.env.FINANCE_IFTA_ENDPOINT),

    loadStatusEndpoint: required('LOAD_STATUS_ENDPOINT', process.env.LOAD_STATUS_ENDPOINT),

    demoMode: parseBoolean(process.env.DEMO_MODE, true),
    timezone: process.env.TIMEZONE || 'UTC',
    eldMode: (process.env.ELD_MODE as HosEnvContract['eldMode']) || 'mock',
    eldApiBaseUrl: optional(process.env.ELD_API_BASE_URL),
    eldApiToken: optional(process.env.ELD_API_TOKEN),
    hosRuleset: (process.env.HOS_RULESET as HosEnvContract['hosRuleset']) || 'FMCSA',

    runSuffix: optional(process.env.RUN_SUFFIX),
    testRunId: optional(process.env.TEST_RUN_ID),
  };
}

export function getFinanceEnv(): FinanceEnvContract {
  const apiBaseUrl = optional(process.env.API_BASE_URL) ?? optional(process.env.REST_BASE_URL);

  return {
    apiBaseUrl: required('API_BASE_URL', apiBaseUrl),
    apiAuthToken: required('API_AUTH_TOKEN', process.env.API_AUTH_TOKEN),
    financeSalaryEndpoint: required('FINANCE_SALARY_ENDPOINT', process.env.FINANCE_SALARY_ENDPOINT),
    financeIftaEndpoint: required('FINANCE_IFTA_ENDPOINT', process.env.FINANCE_IFTA_ENDPOINT),
  };
}

export function getOfflineSyncEnv(): OfflineSyncEnvContract {
  const apiBaseUrl = optional(process.env.API_BASE_URL) ?? optional(process.env.REST_BASE_URL);
  const odooBaseUrl = optional(process.env.ODOO_BASE_URL) ?? optional(process.env.BASE_URL);

  const odooUser = optional(process.env.ODOO_USER) ?? optional(process.env.ODOO_USERNAME);
  const odooPass = optional(process.env.ODOO_PASS) ?? optional(process.env.ODOO_PASSWORD);

  return {
    apiBaseUrl: required('API_BASE_URL', apiBaseUrl),
    apiAuthToken: required('API_AUTH_TOKEN', process.env.API_AUTH_TOKEN),

    odooBaseUrl: required('ODOO_BASE_URL', odooBaseUrl),
    odooUser: required('ODOO_USER', odooUser),
    odooPass: required('ODOO_PASS', odooPass),

    loadStatusEndpoint: required('LOAD_STATUS_ENDPOINT', process.env.LOAD_STATUS_ENDPOINT),
  };
}

export function getCtiEnv(): CtiEnvContract {
  const odooBaseUrl = optional(process.env.ODOO_BASE_URL) ?? optional(process.env.BASE_URL);

  const odooUser = optional(process.env.ODOO_USER) ?? optional(process.env.ODOO_USERNAME);
  const odooPass = optional(process.env.ODOO_PASS) ?? optional(process.env.ODOO_PASSWORD);

  return {
    odooBaseUrl: required('ODOO_BASE_URL', odooBaseUrl),
    odooUser: required('ODOO_USER', odooUser),
    odooPass: required('ODOO_PASS', odooPass),
    ctiWsPattern: required('CTI_WS_PATTERN', process.env.CTI_WS_PATTERN),
  };
}

export function getHosEnv(): HosEnvContract {
  const demoMode = parseBoolean(process.env.DEMO_MODE, true);
  const eldMode = (process.env.ELD_MODE as HosEnvContract['eldMode']) || 'mock';
  const timezone = process.env.TIMEZONE || 'UTC';
  const hosRuleset = (process.env.HOS_RULESET as HosEnvContract['hosRuleset']) || 'FMCSA';

  if (eldMode === 'api') {
    return {
      demoMode,
      timezone,
      eldMode,
      eldApiBaseUrl: required('ELD_API_BASE_URL', process.env.ELD_API_BASE_URL),
      eldApiToken: required('ELD_API_TOKEN', process.env.ELD_API_TOKEN),
      hosRuleset,
    };
  }

  return {
    demoMode,
    timezone,
    eldMode,
    eldApiBaseUrl: optional(process.env.ELD_API_BASE_URL),
    eldApiToken: optional(process.env.ELD_API_TOKEN),
    hosRuleset,
  };
}
