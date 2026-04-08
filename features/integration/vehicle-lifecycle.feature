@integration @vehicle-lifecycle @critical
Feature: Complete Vehicle Lifecycle
  As a logistics system
  I want to ensure data consistency across all layers
  So that users see accurate information everywhere

  Background:
    Given I am logged in as "admin"

  # ============================================
  # END-TO-END DATA SYNC TESTS (All via UI)
  # ============================================

  @end-to-end @integration-001
  Scenario: Vehicle created in UI syncs to API and database
    # UI Layer - Create vehicle through UI (like MD-AUDIT-001)
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-INT-TEST-001"
    
    # Verify still visible in UI
    When I navigate to "vehicles" page
    Then I should see "MD-INT-TEST-001" text

    # API Layer - Verify vehicle was synced to API
    When I send authenticated request to search vehicles with plate "MD-INT-TEST-001"
    Then API response status should be 200
    And API response should contain vehicle with plate "MD-INT-TEST-001"

    # Database Layer - Verify vehicle persisted to database
    Then database should contain vehicle plate "MD-INT-TEST-001"

  @end-to-end @integration-002
  Scenario: Vehicle update via UI propagates across all layers
    # Create vehicle via UI first
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-E2E-002"
    
    # UI Layer - Navigate to vehicle and update odometer
    When I navigate to "vehicles" page
    And I search for "MD-E2E-002" in search
    And I click on vehicle "MD-E2E-002"
    And I update odometer to 15000
    
    # Verify odometer in UI (the primary check for UI integration test)
    Then UI should show odometer 15000

    # Verify via API that update propagated
    When I send authenticated request to get vehicle "MD-E2E-002"
    Then API response should show odometer 15000

  @end-to-end @integration-003
  Scenario: Vehicle deletion via UI removes from all layers
    # Create vehicle via UI first
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-E2E-003"
    
    # UI Layer - Delete vehicle through Action menu (already on vehicles page after create)
    When I navigate to "vehicles" page
    And I search for "MD-E2E-003" in search
    And I click on vehicle "MD-E2E-003"
    And I delete current vehicle

    # Verify NOT visible in UI after deletion
    When I navigate to "vehicles" page
    And I search for "MD-E2E-003" in search
    Then I should not see "MD-E2E-003" in vehicle list

    # Verify via API that vehicle is archived (not found in active records)
    When I send authenticated request to get vehicle "MD-E2E-003"
    Then API response should be empty or archived

  # ============================================
  # DRIVER ASSIGNMENT LIFECYCLE
  # ============================================
  @driver-assignment @integration-004
  Scenario: Driver assignment syncs across layers
    # Create vehicle via UI first
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-DRV-001"
    
    # Open vehicle and assign driver via UI
    When I navigate to "vehicles" page
    And I search for "MD-DRV-001" in search
    And I click on vehicle "MD-DRV-001"
    And I assign driver "Ion Popescu" via UI

    # Verify via API
    When I send authenticated request to get vehicle "MD-DRV-001"
    Then API response should show driver "Ion Popescu"

    # Verify in database
    Then database vehicle "MD-DRV-001" should have driver "Ion Popescu"

  @driver-assignment @integration-005
  Scenario: Driver reassignment updates all layers
    # Create vehicle and assign first driver via UI
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-DRV-002"
    When I navigate to "vehicles" page
    And I search for "MD-DRV-002" in search
    And I click on vehicle "MD-DRV-002"
    And I assign driver "First Driver" via UI

    # Reassign to second driver
    When I navigate to "vehicles" page
    And I search for "MD-DRV-002" in search
    And I click on vehicle "MD-DRV-002"
    And I assign driver "Second Driver" via UI

    # Verify new assignment
    Then database vehicle "MD-DRV-002" should have driver "Second Driver"

  # ============================================
  # CTI INTEGRATION TESTS
  # Real data created in Odoo, then CTI events simulated
  # ISTQB: True integration - UI creates data, CTI queries it
  # ============================================

  @cti-integration @module_cti @integration-006
  Scenario: Incoming call triggers screen pop with vehicle info
    # PRECONDITION: Verify company phone is configured
    Given company phone is "+1800555000"

    # SETUP: Create REAL vehicle and driver in Odoo via UI
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-CTI-001"
    And I navigate to "vehicles" page
    And I search for "MD-CTI-001" in search
    And I click on vehicle "MD-CTI-001"
    And I assign driver "John Doe" via UI

    # Register driver phone for CTI lookup
    Given driver "John Doe" is registered with phone "+1234567890"

    # Verify preconditions via API (real data exists)
    When I send authenticated request to get vehicle "MD-CTI-001"
    Then API response should show driver "John Doe"

    # NOW simulate CTI incoming call
    When I simulate CTI event "call_start" with payload:
      | from | +1234567890 |
      | to   | +1800555000 |

    # Verify CTI event captured and linked to real data
    Then CTI event log should contain "call_start"
    And last call should have caller "+1234567890"
    And CTI lookup should find driver "John Doe" for phone "+1234567890"

  @cti-integration @module_cti @integration-007
  Scenario: Call lifecycle events are logged correctly
    # PRECONDITION: Verify company phone is configured
    Given company phone is "+1800555000"

    # SETUP: Create REAL vehicle and driver for the call
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-CTI-002"
    And I navigate to "vehicles" page
    And I search for "MD-CTI-002" in search
    And I click on vehicle "MD-CTI-002"
    And I assign driver "Jane Smith" via UI

    # Register driver phone
    Given driver "Jane Smith" is registered with phone "+1987654321"

    # Simulate complete call flow from registered driver
    When I simulate complete call flow from "+1987654321" lasting 120 seconds

    # Verify full call lifecycle captured
    Then CTI event log should contain "call_start"
    And CTI event log should contain "screen_pop"
    And CTI event log should contain "call_end"
    And CTI event log should have 3 events
    And CTI lookup should find driver "Jane Smith" for phone "+1987654321"

  @cti-integration @module_cti @integration-008
  Scenario: Unknown caller shows generic screen pop
    # PRECONDITION: Verify company phone is configured
    Given company phone is "+1800555000"

    # NOTE: This test verifies behavior when caller is NOT in system
    # No precondition setup needed - caller should be unknown

    # Verify phone is not registered
    Then CTI lookup should NOT find driver for phone "+9999999999"

    # Simulate call from unknown number
    When I simulate incoming call from "+9999999999" to "+1800555000"

    # Verify call is logged but no driver association
    Then CTI event log should contain "call_start"
    And last call should have caller "+9999999999"
    And last call should have no associated driver

  # ============================================
  # OFFLINE SYNC TESTS
  # ============================================

  @offline-sync @module_offline_sync @integration-009
  Scenario: Offline vehicle data syncs when connection restored
    # Create offline data
    Given I have offline data for vehicle "MD-OFF-001"
    And offline sync status should show "pending"

    # Simulate sync
    When I sync offline data

    # Verify sync
    Then offline sync status should show "synced"
    And offline document "vehicle-MD-OFF-001" should exist

  @offline-sync @module_offline_sync @integration-010
  Scenario: Offline conflict is resolved correctly
    # Create document with potential conflict
    Given I have offline data for vehicle "MD-CONFLICT-001"

    # Simulate conflict
    When I simulate sync conflict for document "vehicle-MD-CONFLICT-001" resolved with "local"

    # Verify resolution
    Then conflict log should have 1 entries
    And last conflict should be resolved with "local"
    And offline sync should have 1 conflicts

  @offline-sync @module_offline_sync @integration-011
  Scenario: Multiple offline documents sync in batch
    # Create multiple offline documents
    Given I have offline data:
      | id              | type    | licensePlate   |
      | vehicle-batch-1 | vehicle | MD-BATCH-001   |
      | vehicle-batch-2 | vehicle | MD-BATCH-002   |
      | vehicle-batch-3 | vehicle | MD-BATCH-003   |

    # Sync all
    When I sync offline data

    # Verify all synced
    Then offline sync status should show "synced"
    And offline database should have 3 documents

  # ============================================
  # API AND DATABASE CONSISTENCY
  # ============================================

  @api-db-consistency @integration-012
  Scenario: API creation persists to database immediately
    # Create via API
    When I create vehicle via API with plate "MD-API-001"
    Then API response status should be 200

    # Verify immediate persistence
    Then database should contain vehicle plate "MD-API-001"

  @api-db-consistency @integration-013
  Scenario: Database state matches API response
    # Get vehicle via API
    When I send authenticated request to get vehicle "MD-API-001"
    And I store API response vehicle data

    # Compare with database
    Then database vehicle "MD-API-001" should match API response

  # ============================================
  # CROSS-SYSTEM WORKFLOW
  # ============================================

  @full-workflow @integration-014
  Scenario: Complete vehicle workflow across all systems
    # 1. Create via UI (using working atomic steps)
    And I navigate to "vehicles" page
    When I create a vehicle with plate "MD-FULL-001"

    # 2. Verify immediate sync to database
    Then database should contain vehicle plate "MD-FULL-001"

    # 3. Update via API
    When I update vehicle "MD-FULL-001" odometer to 5000 via API

    # 4. Verify in UI
    When I navigate to "vehicles" page
    And I search for "MD-FULL-001" in search
    And I click on vehicle "MD-FULL-001"
    Then UI should show odometer 5000

    # 5. Create offline update
    When I store offline document "update-MD-FULL-001" with data:
      | odometer | 5500 |
      | status   | active |

    # 6. Sync offline
    When I sync offline data
    Then offline sync status should show "synced"

  @cleanup @integration-999
  Scenario: Cleanup test data
    When I cleanup test vehicles with prefix "MD-E2E"
    And I cleanup test vehicles with prefix "MD-DRV"
    And I cleanup test vehicles with prefix "MD-CTI"
    And I cleanup test vehicles with prefix "MD-OFF"
    And I cleanup test vehicles with prefix "MD-API"
    And I cleanup test vehicles with prefix "MD-FULL"
    Then test environment should be clean
