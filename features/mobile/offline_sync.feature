@tablet @offline @integration @module_offline_sync
Feature: Offline Sync
  As a driver on a tablet
  I want deliveries and POD uploads to queue offline
  So that they reliably sync when connectivity returns

  Scenario: Mark delivered + upload POD queues offline and syncs online
    Given the tablet app is loaded online
    When I go offline
    And I mark delivered and upload POD (should queue)
    When I go back online
    Then the load should sync within 30 seconds
