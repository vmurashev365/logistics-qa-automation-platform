@web @fleet @driver-assignment
Feature: Driver Assignment
  As a Fleet Manager
  I want to assign drivers to vehicles
  So that I can track who operates each vehicle

  Background:
    Given Odoo is accessible at "http://localhost:8069"
    And I am logged in as admin

  @smoke
  Scenario: Navigate to drivers page
    When I navigate to "vehicles" page
    Then I should see "Vehicles" text

  @crud
  Scenario: View vehicle details
    When I navigate to "vehicles" page
    Then I should see "Vehicles" text
