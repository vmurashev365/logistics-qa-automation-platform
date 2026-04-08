@tablet @smoke @quick-check
Feature: Tablet Device Quick Check
  Quick validation of tablet testing steps on existing pages

  Background:
    Given Odoo is accessible at "http://localhost:8069"
    And I login with username "admin" and password "admin"

  @galaxy-tab
  Scenario: Galaxy Tab viewport and touch targets on Vehicles page
    Given I am using "galaxy-tab" device
    When I navigate to "vehicles" page
    And I click "create" button
    Then the "Discard" button should be visible

  @ipad-mini
  Scenario: iPad Mini viewport on Vehicles page
    Given I am using "ipad-mini" device
    When I navigate to "vehicles" page
    Then I should see "Vehicles" text
    And I click "create" button
    And I fill "licensePlate" with "IPAD-TEST-001"
    Then "licensePlate" field should contain "IPAD-TEST-001"

  @galaxy-tab @orientation
  Scenario: Orientation change preserves form data
    Given I am using "galaxy-tab" device
    And the device orientation is "landscape"
    When I navigate to "vehicles" page
    And I click "create" button
    And I fill "licensePlate" with "MD-ORIENT-TEST"
    When I rotate device to "portrait"
    Then "licensePlate" field should contain "MD-ORIENT-TEST"
    When I rotate device to "landscape"
    Then "licensePlate" field should contain "MD-ORIENT-TEST"
