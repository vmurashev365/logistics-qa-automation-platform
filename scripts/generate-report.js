/**
 * Cucumber HTML Report Generator
 * Generates an HTML report from the Cucumber JSON output
 */

const reporter = require('cucumber-html-reporter');
const fs = require('fs');
const path = require('path');

// Configuration
const reportsDir = path.resolve(__dirname, '../reports/cucumber');
const jsonFile = path.join(reportsDir, 'cucumber.json');
const outputFile = path.join(reportsDir, 'index.html');

// Ensure reports directory exists
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Check if JSON file exists
if (!fs.existsSync(jsonFile)) {
  console.error('❌ Cucumber JSON report not found at:', jsonFile);
  console.error('   Run tests first: npm run test:smoke');
  process.exit(1);
}

// Report options
const options = {
  theme: 'bootstrap',
  jsonFile: jsonFile,
  output: outputFile,
  reportSuiteAsScenarios: true,
  scenarioTimestamp: true,
  launchReport: false,
  metadata: {
    'App Version': '1.0.0',
    'Test Environment': process.env.NODE_ENV || 'development',
    'Platform': process.platform,
    'Executed': new Date().toISOString(),
  },
  brandTitle: 'Logistics QA - Test Report',
  name: 'Fleet Management Tests',
};

try {
  const features = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  if (!Array.isArray(features) || !features.some(feature => feature.elements?.length)) {
    throw new Error('The Cucumber JSON contains no scenarios.');
  }
  if (reporter.generate(options) !== true || fs.statSync(outputFile).size === 0) {
    throw new Error('The HTML reporter did not produce a report.');
  }
  console.log('✅ HTML Report generated successfully!');
  console.log(`   Report: ${outputFile}`);
} catch (error) {
  console.error('❌ Failed to generate report:', error.message);
  process.exit(1);
}
