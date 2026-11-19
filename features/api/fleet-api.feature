@api @fleet
Feature: Fleet API Operations
  As a backend service
  I want to manage vehicles through Odoo's JSON-RPC API
  So that mobile apps and web UI can synchronize data

  Background:
    Given Odoo API is authenticated

  @api-smoke @critical @api-001
  Scenario: Get list of vehicles via API
    Given vehicle "MD-API-010" exists in the system
    When I get list of vehicles via API
    Then the vehicle list from the API should include "MD-API-010"

  @crud @api-002
  Scenario: Create vehicle via API
    When I create vehicle via API with:
      | license_plate | MD-API-001 |
      | active        | true       |
    Then the vehicle created via API should be stored in Odoo with:
      | license_plate | MD-API-001 |
      | active        | true       |

  @crud @api-003
  Scenario: Get vehicle by license plate via API
    Given vehicle "MD-API-002" exists in the system
    When I get vehicle by plate "MD-API-002" via API
    Then API response should contain vehicle with plate "MD-API-002"

  @crud @api-004
  Scenario: Update vehicle via API
    Given vehicle "MD-API-003" exists in the system
    When I update vehicle "MD-API-003" odometer to 4321 via API
    And I get vehicle by plate "MD-API-003" via API
    Then API response should show odometer 4321

  @crud @api-005
  Scenario: Delete vehicle via API
    Given vehicle "MD-API-DEL" exists in the system
    When I delete vehicle with plate "MD-API-DEL" via API
    Then no vehicle "MD-API-DEL" should exist in Odoo

  @negative @api-006
  Scenario: Get non-existent vehicle returns nothing
    When I get vehicle by plate "DOES-NOT-EXIST-999" via API
    Then API response should return no vehicle

  @search @api-007
  Scenario: Search vehicles by partial plate
    Given vehicle "MD-SEARCH-001" exists in the system
    And vehicle "MD-SEARCH-002" exists in the system
    When I search for "MD-SEARCH" in "fleet.vehicle" model via API
    Then the API response should list exactly the plates "MD-SEARCH-001, MD-SEARCH-002"
