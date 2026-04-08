@visual
Feature: Visual regression POC
  As a QA engineer
  I want a minimal visual regression check
  So that UI changes are caught early

  Scenario: Vehicles list visual snapshot
    Given I am logged in as admin
    When I navigate to "Vehicles" page
    Then the page should match visual baseline "vehicles-list"

  Scenario: Vehicle form visual snapshot
    Given I am logged in as admin
    When I navigate to "Vehicles" page
    When I click "New" button
    Then the page should match visual baseline "vehicle-form"
