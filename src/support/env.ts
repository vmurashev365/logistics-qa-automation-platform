/**
 * Environment Configuration Loader
 * Loads environment variables from .env file and provides typed access
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface EnvironmentConfig {
  // Application Under Test
  baseUrl: string;
  odooUsername: string;
  odooPassword: string;
  odooDatabase: string;

  // Browser Configuration
  headless: boolean;
  browser: 'chromium' | 'firefox' | 'webkit';
  slowMo: number;
  timeout: number;
  viewportWidth: number;
  viewportHeight: number;

  // Test Configuration
  screenshotOnFailure: boolean;
  videoRecording: boolean;
  retryCount: number;

  // Reporting
  reportsDir: string;
  generateHtmlReport: boolean;

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

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  verbose: boolean;
}

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse integer from environment variable
 */
function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment configuration with defaults
 */
export function getEnvConfig(): EnvironmentConfig {
  return {
    // Application Under Test
    baseUrl: process.env.BASE_URL || 'http://localhost:8069',
    odooUsername: process.env.ODOO_USERNAME || 'admin',
    odooPassword: process.env.ODOO_PASSWORD || 'admin',
    odooDatabase: process.env.ODOO_DATABASE || 'logistics_qa_db',

    // Browser Configuration
    headless: parseBoolean(process.env.HEADLESS, false),
    browser: (process.env.BROWSER as EnvironmentConfig['browser']) || 'chromium',
    slowMo: parseInt(process.env.SLOW_MO, 0),
    timeout: parseInt(process.env.TIMEOUT, 30000),
    viewportWidth: parseInt(process.env.VIEWPORT_WIDTH, 1920),
    viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT, 1080),

    // Test Configuration
    screenshotOnFailure: parseBoolean(process.env.SCREENSHOT_ON_FAILURE, true),
    videoRecording: parseBoolean(process.env.VIDEO_RECORDING, false),
    retryCount: parseInt(process.env.RETRY_COUNT, 0),

    // Reporting
    reportsDir: process.env.REPORTS_DIR || 'reports/cucumber',
    generateHtmlReport: parseBoolean(process.env.GENERATE_HTML_REPORT, true),

    // Database
    dbEnabled: parseBoolean(process.env.DB_ENABLED, true),
    postgresHost: process.env.POSTGRES_HOST || 'localhost',
    postgresPort: parseInt(process.env.POSTGRES_PORT, 5432),
    postgresUser: process.env.POSTGRES_USER || 'odoo',
    postgresPassword: process.env.POSTGRES_PASSWORD || 'odoo',
    postgresDatabase: process.env.POSTGRES_DATABASE || 'logistics_qa_db',

    // CTI
    ctiMode: (process.env.CTI_MODE as 'mock' | 'disabled') || 'mock',

    // Offline Sync
    offlineMode: (process.env.OFFLINE_MODE as 'mock' | 'disabled') || 'mock',

    // Logging
    logLevel: (process.env.LOG_LEVEL as EnvironmentConfig['logLevel']) || 'info',
    verbose: parseBoolean(process.env.VERBOSE, false),
  };
}

// Export singleton instance
export const env = getEnvConfig();

// Export for convenience
export default env;
