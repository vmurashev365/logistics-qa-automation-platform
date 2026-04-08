Feature: Fleet Fuel and Compliance Management

  @integration @api @fleet @record_fuel
  Scenario: Record fuel and verify it is persisted
    Given a fleet vehicle "Truck-01" exists
    When I log fuel of 50 gallons at price 4.20 for truck "Truck-01"
    Then the fuel log should be stored correctly for truck "Truck-01"

  @integration @fleet @inspection
  Scenario: Record inspection for truck
    Given a fleet vehicle "Truck-01" exists
    When I record a "pass" inspection for truck "Truck-01"
    Then inspection should be visible in fleet records
