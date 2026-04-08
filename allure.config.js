/**
 * Allure Reporter Configuration
 * Used by allure-cucumberjs formatter
 */

module.exports = {
  resultsDir: './allure-results',
  targetDir: './allure-report',
  
  // Allure categories configuration (optional)
  categories: [
    {
      name: 'Product defects',
      matchedStatuses: ['failed'],
    },
    {
      name: 'Test defects',
      matchedStatuses: ['broken'],
    },
  ],
};
