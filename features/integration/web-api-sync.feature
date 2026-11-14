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

    # Verify in Web UI
    When I navigate to "Vehicles" page
    Then I should see "MD-SYNC-001" text

  @sync-003
  Scenario: Vehicle deleted via API disappears from UI
    # First create via API
    When I create vehicle via API with:
      | license_plate | MD-SYNC-003 |
      | active        | true        |

    # Verify it appears in UI
    When I navigate to "Vehicles" page
    Then I should see "MD-SYNC-003" text

    # Delete via API
    When I delete vehicle with plate "MD-SYNC-003" via API

    # Refresh and verify gone from UI: wait for Odoo's "no records" answer to the search
    When I navigate to "Vehicles" page
    And I search for "MD-SYNC-003" in search
    Then the vehicles search for "MD-SYNC-003" should find no vehicles

  @sync-004
  Scenario: Count vehicles matches between UI and API
    When I get list of vehicles via API
    And I navigate to "Vehicles" page
    Then the vehicles list view should count as many vehicles as the API returned
