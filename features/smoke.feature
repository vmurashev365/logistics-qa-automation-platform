@smoke
Feature: Fleet Management Smoke Test
  As a Fleet Manager
  I want to manage vehicles
  So that I can track the company fleet

  Background:
    Given Odoo is accessible at "http://localhost:8069"
    And I login with username "admin" and password "admin"

  @critical @smoke-001
  Scenario: Access Vehicles page
    When I navigate to "vehicles" page
    Then I should see "Vehicles" text

  @critical @smoke-002
  Scenario: Open vehicle creation form
    When I navigate to "vehicles" page
    And I click "create" button
    Then I should see "License Plate" text

  @critical @smoke-003
  Scenario: Fill vehicle license plate field
    When I navigate to "vehicles" page
    And I click "create" button
    And I fill "licensePlate" with "MD-TEST-001"
    Then "licensePlate" field should contain "MD-TEST-001"

  @smoke-004
  Scenario: Discard vehicle creation
    When I navigate to "vehicles" page
    And I click "create" button
    And I click "discard" button
    Then I should see "New Request" text
