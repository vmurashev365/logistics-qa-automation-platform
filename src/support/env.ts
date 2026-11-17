/**
 * Environment Configuration Loader
 *
 * The one place that reads the framework's configuration: .env in the project root, overridden
 * by real environment variables. Every value is parsed strictly: a value that is set but cannot
 * be read (HEADLESS=1x, TIMEOUT=30s, BROWSER=chrome) stops the run with a message naming the
 * variable, instead of silently falling back to a default. An empty value counts as unset.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root (real environment variables win)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const BROWSERS = ['chromium', 'firefox', 'webkit'] as const;
export type BrowserName = (typeof BROWSERS)[number];

export interface EnvironmentConfig {
  // Application Under Test
  baseUrl: string;
  odooUsername: string;
  odooPassword: string;
  odooDatabase: string;
  /** REST services under test (finance, load status); defaults to BASE_URL. */
  apiBaseUrl: string;

  // Browser Configuration
  headless: boolean;
  browser: BrowserName;
  slowMo: number;
  timeout: number;
  viewportWidth: number;
  viewportHeight: number;

  // Test Configuration
  screenshotOnFailure: boolean;
  videoRecording: boolean;

  // Database
  dbEnabled: boolean;
  postgresHost: string;
  postgresPort: number;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;

  // CTI (Computer Telephony Integration)
  ctiMode: 'mock' | 'disabled';

  // Offline Sync
  offlineMode: 'mock' | 'disabled';
}

function raw(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** A string variable, or the default when unset. */
export function envString(name: string, defaultValue: string): string {
  return raw(name) ?? defaultValue;
}

/** true/false (also 1/0, yes/no), case-insensitive. */
export function envBoolean(name: string, defaultValue: boolean): boolean {
  const value = raw(name);
  if (value === undefined) return defaultValue;
  const normalized = value.toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  throw new Error(`${name}=${value} is not a boolean. Use true or false.`);
}

/** A whole number >= 0. */
export function envInteger(name: string, defaultValue: number): number {
  const value = raw(name);
  if (value === undefined) return defaultValue;
  if (!/^\d+$/.test(value)) {
    throw new Error(`${name}=${value} is not a whole number >= 0.`);
  }
  return Number(value);
}

/** One of the allowed values, case-sensitive. */
export function envChoice<T extends string>(name: string, allowed: readonly T[], defaultValue: T): T {
  const value = raw(name);
  if (value === undefined) return defaultValue;
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${name}=${value} is not supported. Use one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/**
 * Get environment configuration with defaults
 */
export function getEnvConfig(): EnvironmentConfig {
  const baseUrl = envString('BASE_URL', 'http://localhost:8069').replace(/\/+$/, '');

  return {
    // Application Under Test
    baseUrl,
    odooUsername: envString('ODOO_USERNAME', 'admin'),
    odooPassword: envString('ODOO_PASSWORD', 'admin'),
    odooDatabase: envString('ODOO_DATABASE', 'logistics_qa_db'),
    apiBaseUrl: envString('API_BASE_URL', baseUrl).replace(/\/+$/, ''),

    // Browser Configuration
    headless: envBoolean('HEADLESS', false),
    browser: envChoice('BROWSER', BROWSERS, 'chromium'),
    slowMo: envInteger('SLOW_MO', 0),
    timeout: envInteger('TIMEOUT', 30000),
    viewportWidth: envInteger('VIEWPORT_WIDTH', 1920),
    viewportHeight: envInteger('VIEWPORT_HEIGHT', 1080),

    // Test Configuration
    screenshotOnFailure: envBoolean('SCREENSHOT_ON_FAILURE', true),
    videoRecording: envBoolean('VIDEO_RECORDING', false),

    // Database
    dbEnabled: envBoolean('DB_ENABLED', true),
    postgresHost: envString('POSTGRES_HOST', 'localhost'),
    postgresPort: envInteger('POSTGRES_PORT', 5432),
    postgresUser: envString('POSTGRES_USER', 'odoo'),
    postgresPassword: envString('POSTGRES_PASSWORD', 'odoo'),
    postgresDatabase: envString('POSTGRES_DATABASE', 'logistics_qa_db'),

    // CTI
    ctiMode: envChoice('CTI_MODE', ['mock', 'disabled'] as const, 'mock'),

    // Offline Sync
    offlineMode: envChoice('OFFLINE_MODE', ['mock', 'disabled'] as const, 'mock'),
  };
}
