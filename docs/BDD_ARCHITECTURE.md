# BDD step architecture

Cucumber loads the support files and all three step directories through [cucumber.js](../cucumber.js).
A scenario can mix steps from different directories. The directory name describes the responsibility of
the definition. Each step receives the current scenario's [World](../src/support/custom-world.ts).

| Layer | Responsibility | Example |
| --- | --- | --- |
| [Atomic](../src/steps/atomic) | One browser, HTTP, RPC or database operation | `When I click "create" button` |
| [Domain](../src/steps/domain) | A Fleet or integration action or assertion | `When I choose vehicle model "Audi/A1"` |
| [Composite](../src/steps/composite) | A workflow implemented with page objects, clients and helpers | `When I assign driver "Maria Rusu" to vehicle "MD-DRV-011"` |

## From form interaction to a persisted result

The following scenario combines navigation and form actions with a domain assertion. The assertion reads
the saved record through Odoo JSON-RPC. See the [Fleet feature](../features/web/fleet/vehicle-management.feature)
and [persistence assertions](../src/steps/domain/vehicle-records.steps.ts).

```gherkin
Feature: Fleet vehicle registration
  Scenario: Save the selected model
    Given Odoo is accessible
    And I am logged in as admin
    When I navigate to "vehicles" page
    And I click "create" button
    And I fill "licensePlate" with "MD-WEB-001"
    And I choose vehicle model "Audi/A1"
    And I click "save" button
    Then vehicle "MD-WEB-001" should be saved in Odoo with model "Audi/A1"
```

When adding a definition, reuse the existing page object or client for the operation.
Store per-scenario IDs in the World and register cleanup when creating records.
See the [step library](STEP_LIBRARY.md) and [data strategy](DATA_STRATEGY.md).
