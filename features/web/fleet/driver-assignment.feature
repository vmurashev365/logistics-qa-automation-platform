@web @fleet @driver-assignment
Feature: Driver Assignment
  As a Fleet Manager
  I want to assign drivers to vehicles
  So that I can track who operates each vehicle

  Background:
    Given Odoo is accessible
    And I am logged in as admin

  @smoke
  Scenario: Open a vehicle from the vehicles list
    Given vehicle "MD-DRV-010" exists in the system
    When I navigate to "vehicles" page
    And I search for "MD-DRV-010" in search
    And I click on vehicle "MD-DRV-010"
    Then the vehicle form should show license plate "MD-DRV-010"

  @crud @integration @portfolio
  Scenario: Assign a driver to a vehicle in the vehicle form
    Given vehicle "MD-DRV-011" exists in the system
    When I navigate to "vehicles" page
    And I search for "MD-DRV-011" in search
    And I click on vehicle "MD-DRV-011"
    And I assign driver "Maria Rusu" via UI
    Then vehicle "MD-DRV-011" should have driver "Maria Rusu" in Odoo
    And database vehicle "MD-DRV-011" should have driver "Maria Rusu"
