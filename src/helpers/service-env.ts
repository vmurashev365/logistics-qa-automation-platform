/**
 * Loads and validates the "ENV Contract" variables of the integration modules
 * (finance, offline sync, CTI screen pop, HOS/ELD).
 *
 * Variables are required only when a module that needs them runs. Odoo's address and the
 * administrator's credentials come from the main configuration (BASE_URL, ODOO_USERNAME,
 * ODOO_PASSWORD), the same values every other step uses.
 */

import type {
  FinanceEnvContract,
  OfflineSyncEnvContract,
  CtiEnvContract,
  HosEnvContract,
} from '../types/env-contract';
import { getEnvConfig, envBoolean, envChoice, envString } from '../support/env';

function required(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v ? v : undefined;
}

export function getFinanceEnv(): FinanceEnvContract {
  return {
    apiBaseUrl: getEnvConfig().apiBaseUrl,
    apiAuthToken: required('API_AUTH_TOKEN'),
    financeSalaryEndpoint: required('FINANCE_SALARY_ENDPOINT'),
    financeIftaEndpoint: required('FINANCE_IFTA_ENDPOINT'),
  };
}

export function getOfflineSyncEnv(): OfflineSyncEnvContract {
  const config = getEnvConfig();
  return {
    apiBaseUrl: config.apiBaseUrl,
    apiAuthToken: required('API_AUTH_TOKEN'),
    odooBaseUrl: config.baseUrl,
    odooUser: config.odooUsername,
    odooPass: config.odooPassword,
    loadStatusEndpoint: required('LOAD_STATUS_ENDPOINT'),
  };
}

export function getCtiEnv(): CtiEnvContract {
  const config = getEnvConfig();
  return {
    odooBaseUrl: config.baseUrl,
    odooUser: config.odooUsername,
    odooPass: config.odooPassword,
    ctiWsPattern: required('CTI_WS_PATTERN'),
  };
}

export function getHosEnv(): HosEnvContract {
  const demoMode = envBoolean('DEMO_MODE', true);
  const eldMode = envChoice('ELD_MODE', ['mock', 'api'] as const, 'mock');
  const timezone = envString('TIMEZONE', 'UTC');
  const hosRuleset = envChoice('HOS_RULESET', ['FMCSA'] as const, 'FMCSA');

  return {
    demoMode,
    timezone,
    eldMode,
    eldApiBaseUrl: eldMode === 'api' ? required('ELD_API_BASE_URL') : optional('ELD_API_BASE_URL'),
    eldApiToken: eldMode === 'api' ? required('ELD_API_TOKEN') : optional('ELD_API_TOKEN'),
    hosRuleset,
  };
}
