/**
 * Cucumber Configuration
 * @type {import('@cucumber/cucumber').IConfiguration}
 */
module.exports = {
  default: {
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
      snippetInterface: 'async-await'
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
  }
};
