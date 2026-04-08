@api @integration @module_finance
Feature: Financial Compliance
  As a compliance system
  I want finance calculations to be correct
  So that payroll and IFTA reporting are accurate

  Background:
    Given financial compliance API is configured

  Scenario: Salary calculation matches calculator
    When I request salary calculation with:
      | miles              | 1234.5 |
      | rate_per_mile_cents | 72     |
    Then salary response should match calculator within 1 cent

  Scenario: IFTA calculation matches calculator
    When I request IFTA calculation with:
      | miles                     | 1000  |
      | mpg                       | 6.5   |
      | state_rate_cents_per_gallon | 42    |
      | tax_paid_cents            | 5000  |
    Then IFTA response should match calculator within 1 cent
