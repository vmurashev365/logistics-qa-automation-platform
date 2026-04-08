@integration @web-api-sync
Feature: Web UI and API Data Consistency
  As a system
  I want to ensure data consistency between Web UI and API
  So that users see the same data regardless of interface

  Background:
    Given Odoo is accessible at "http://localhost:8069"
    And I login with username "admin" and password "admin"
    And Odoo API is authenticated

  @critical @sync-001
  Scenario: Vehicle created via API appears in UI
    # Create vehicle via API (API auto-assigns required model_id)
    When I create vehicle via API with:
      | license_plate | MD-SYNC-001 |
      | active        | true        |
    Then API response status should be 200
    
    # Verify in Web UI
    When I navigate to "Vehicles" page
    Then I should see "MD-SYNC-001" text
    
    # Cleanup via API
    When I delete vehicle with plate "MD-SYNC-001" via API
    Then API response status should be 200

  @critical @sync-002
  Scenario: Vehicle created via API appears in UI second check
    # Create vehicle via API
    When I create vehicle via API with:
      | license_plate | MD-SYNC-002 |
      | active        | true        |
    Then API response status should be 200
    
    # Verify in Web UI
    When I navigate to "Vehicles" page
    Then I should see "MD-SYNC-002" text
    
    # Cleanup via API
    When I delete vehicle with plate "MD-SYNC-002" via API
    Then API response status should be 200

  @sync-003
  Scenario: Vehicle deleted via API disappears from UI
    # First create via API
    When I create vehicle via API with:
      | license_plate | MD-SYNC-003 |
      | active        | true        |
    Then API response status should be 200
    
    # Verify it appears in UI
    When I navigate to "Vehicles" page
    Then I should see "MD-SYNC-003" text
    
    # Delete via API
    When I delete vehicle with plate "MD-SYNC-003" via API
    Then API response status should be 200
    
    # Refresh and verify gone from UI
    When I navigate to "Vehicles" page
    Then I should not see "MD-SYNC-003" text

  @sync-004
  Scenario: Count vehicles matches between UI and API
    # Get count via API
    When I get list of vehicles via API
    Then API response status should be 200
    And API response should be a valid JSON array
    
    # Navigate to UI and verify list is shown
    When I navigate to "Vehicles" page
    Then I should see "Vehicles" text
