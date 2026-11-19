@web @fleet @vehicle-management @browser
Feature: Vehicle Management
  As a Fleet Manager
  I want to register vehicles in Odoo Fleet
  So that every vehicle of the company fleet has a record

  Background:
    Given Odoo is accessible
    And I am logged in as admin
    And I navigate to "vehicles" page

  @smoke @critical @odoo-api
  Scenario: A vehicle with a license plate and a model is saved
    When I click "create" button
    And I fill "licensePlate" with "MD-WEB-001"
    And I choose vehicle model "Audi/A1"
    And I click "save" button
    Then vehicle "MD-WEB-001" should be saved in Odoo with model "Audi/A1"

  @crud @odoo-api
  Scenario: A vehicle without a model is not saved
    When I click "create" button
    And I fill "licensePlate" with "MD-WEB-002"
    And I click "save" button
    Then Odoo should refuse to save the vehicle because "Model" is missing
    And no vehicle "MD-WEB-002" should exist in Odoo

  @smoke
  Scenario: Navigate to vehicles list
    When I navigate to "vehicles" page
    Then the vehicles list should be shown

  @crud @odoo-api
  Scenario: Discarding a new vehicle saves nothing
    When I click "create" button
    And I fill "licensePlate" with "MD-DISCARD-001"
    And I click "discard" button
    Then the vehicles list should be shown
    And no vehicle "MD-DISCARD-001" should exist in Odoo
