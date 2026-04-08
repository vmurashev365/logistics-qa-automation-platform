@web @fleet @vehicle-management
Feature: Vehicle Management
  As a Fleet Manager
  I want to manage vehicles
  So that I can track the company fleet

  Background:
    Given Odoo is accessible at "http://localhost:8069"
    And I am logged in as admin
    And I navigate to "vehicles" page

  @smoke @critical
  Scenario: Create vehicle with minimum required fields
    When I click "create" button
    And I fill "licensePlate" with "MD-TEST-001"
    And I click "save" button
    Then I should see "Vehicles" text

  @crud
  Scenario: Create vehicle with license plate and model
    When I click "create" button
    And I fill "licensePlate" with "MD-TEST-002"
    And I fill "model" with "Volvo"
    And I click "save" button
    Then I should see "Vehicles" text

  @smoke
  Scenario: Navigate to vehicles list
    When I navigate to "vehicles" page
    Then I should see "Vehicles" text

  @crud
  Scenario: Discard vehicle creation
    When I click "create" button
    And I fill "licensePlate" with "MD-DISCARD-001"
    And I click "discard" button
    Then I should see "New Request" text
