/**
 * Cucumber Configuration (typed mirror)
 *
 * Runtime config for `cucumber-js` is `cucumber.js` (CommonJS), which is what the npm scripts
 * use via `--config cucumber.js`.
 *
 * This file is kept as a TypeScript/typed mirror for editor assistance and future refactors.
 */

import { IConfiguration } from '@cucumber/cucumber/lib/configuration/types';

const config: Partial<IConfiguration> = {
  // Feature files location
  paths: ['features/**/*.feature'],
  
  // Step definitions and support files
  require: [
    'src/support/**/*.ts',
    'src/steps/**/*.ts'
  ],
  
  // Use ts-node for TypeScript execution
  requireModule: ['ts-node/register'],
  
  // Output format
  format: [
    'progress-bar',
    'json:reports/cucumber/cucumber.json',
    'html:reports/cucumber/cucumber-report.html',
    'allure-cucumberjs/reporter'
  ],
  
  // Formatting options
  formatOptions: {
    snippetInterface: 'async-await',
    snippetSyntax: './node_modules/@cucumber/cucumber/lib/formatter/step_definition_snippet_builder/javascript_snippet_syntax.js'
  },
  
  // Parallel execution (disabled for Phase 1)
  parallel: 1,
  
  // Retry failed scenarios
  retry: 0,
  
  // Strict mode - fail on pending/undefined steps
  strict: true,
  
  // World parameters
  worldParameters: {
    baseUrl: process.env.BASE_URL || 'http://localhost:8069',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0', 10),
    timeout: parseInt(process.env.TIMEOUT || '30000', 10)
  },
  
  // Publish reports (disabled)
  publish: false,
  
  // Dry run (disabled)
  dryRun: false
};

export default config;
