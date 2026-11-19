/**
 * Cucumber Configuration
 *
 * Run settings only. Everything the tests read about the environment (Odoo URL, credentials,
 * browser, timeouts) comes from src/support/env.ts, which loads .env.
 *
 * @type {import('@cucumber/cucumber').IConfiguration}
 */
const path = require('path');

// This file is evaluated before the support code, so load .env here for RETRY_COUNT.
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

function retryCount() {
  const value = (process.env.RETRY_COUNT || '').trim();
  if (value === '') return 0;
  if (!/^\d+$/.test(value)) {
    throw new Error(`RETRY_COUNT=${value} is not a whole number >= 0.`);
  }
  return Number(value);
}

module.exports = {
  default: {
    // Feature files location
    paths: ['features/**/*.feature'],

    // Step definitions and support files
    require: ['src/support/**/*.ts', 'src/steps/**/*.ts'],

    // Use ts-node for TypeScript execution
    requireModule: ['ts-node/register'],

    // Output format
    format: [
      'progress-bar',
      'json:reports/cucumber/cucumber.json',
      'html:reports/cucumber/cucumber-report.html',
      'allure-cucumberjs/reporter',
    ],

    // Formatting options
    formatOptions: {
      snippetInterface: 'async-await',
    },

    // Scenarios run one at a time unless --parallel is given (test:all uses 2)
    parallel: 1,

    // Re-run a failed scenario this many times (RETRY_COUNT, default 0)
    retry: retryCount(),

    // Strict mode - fail on pending/undefined steps
    strict: true,

    // Publish reports (disabled)
    publish: false,

    // Dry run (disabled)
    dryRun: false,
  },
};
