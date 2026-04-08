@web @integration @module_cti
Feature: CTI Screen Pop
  As a dispatcher
  I want incoming calls to screen-pop driver details
  So that I can quickly assist callers

  Scenario: Incoming call triggers screen pop and driver lookup
    Given I am logged in as Odoo dispatcher
    And CTI WebSocket is mocked
    When I inject incoming call event with caller_id "+18005551234"
    Then I should see the Incoming Call modal
    And the modal should show the driver name for caller "+18005551234"
