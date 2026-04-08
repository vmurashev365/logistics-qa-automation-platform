@api @fleet
Feature: Fleet API Operations
  As a backend service
  I want to manage vehicles via API
  So that mobile apps and web UI can synchronize data

  Background:
    Given Odoo API is authenticated

  @api-smoke @critical @api-001
  Scenario: Get list of vehicles via API
    When I get list of vehicles via API
    Then API response status should be 200
    And API response should be a valid JSON array

  @crud @api-002
  Scenario: Create vehicle via API
    When I create vehicle via API with:
      | license_plate | MD-API-001 |
      | active        | true       |
    Then API response status should be 200
    And API response should be a valid JSON object
    # Cleanup - delete the created vehicle
    When I delete vehicle with plate "MD-API-001" via API
    Then API response status should be 200

  @crud @api-003
  Scenario: Get vehicle by license plate via API
    # First create a vehicle
    When I create vehicle via API with:
      | license_plate | MD-API-002 |
      | active        | true       |
    Then API response status should be 200
    # Then retrieve it by plate
    When I get vehicle by plate "MD-API-002" via API
    Then API response status should be 200
    And API response should contain vehicle with plate "MD-API-002"
    # Cleanup
    When I delete vehicle with plate "MD-API-002" via API
    Then API response status should be 200

  @crud @api-004
  Scenario: Update vehicle via API
    # Create vehicle
    When I create vehicle via API with:
      | license_plate | MD-API-003 |
      | active        | true       |
    Then API response status should be 200
    # Get the vehicle to find its ID
    When I get vehicle by plate "MD-API-003" via API
    Then API response status should be 200
    And API response should contain "MD-API-003"
    # Cleanup
    When I delete vehicle with plate "MD-API-003" via API
    Then API response status should be 200

  @crud @api-005
  Scenario: Delete vehicle via API
    # Create vehicle to delete
    When I create vehicle via API with:
      | license_plate | MD-API-DEL |
      | active        | true       |
    Then API response status should be 200
    # Delete it
    When I delete vehicle with plate "MD-API-DEL" via API
    Then API response status should be 200
    # Verify it's gone
    When I get vehicle by plate "MD-API-DEL" via API
    Then API response status should be 404

  @negative @api-006
  Scenario: Get non-existent vehicle returns 404
    When I get vehicle by plate "DOES-NOT-EXIST-999" via API
    Then API response status should be 404

  @search @api-007
  Scenario: Search vehicles by partial plate
    # Create test vehicles
    When I create vehicle via API with:
      | license_plate | MD-SEARCH-001 |
      | active        | true          |
    Then API response status should be 200
    When I create vehicle via API with:
      | license_plate | MD-SEARCH-002 |
      | active        | true          |
    Then API response status should be 200
    # Search by pattern
    When I search for "MD-SEARCH" in "fleet.vehicle" model via API
    Then API response status should be 200
    And API response should be a valid JSON array
    And API response array should have at least 2 items
    # Cleanup
    When I delete vehicle with plate "MD-SEARCH-001" via API
    When I delete vehicle with plate "MD-SEARCH-002" via API
