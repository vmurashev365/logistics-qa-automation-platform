# Step library

Use these phrases when writing Fleet scenarios. Cucumber loads definitions from `src/steps/**/*.ts`.
Text in quotes is an argument. Data tables in the examples supply one field/value pair per row.

## Common steps

| Action | Example |
| --- | --- |
| Check the configured Odoo URL | `Given Odoo is accessible` |
| Sign in with configured administrator credentials | `Given I am logged in as admin` |
| Open the Fleet vehicles view | `When I navigate to "vehicles" page` |
| Create, save or discard | `When I click "create" button` |
| Set a form field | `When I fill "licensePlate" with "MD-WEB-001"` |
| Select the required Fleet model | `When I choose vehicle model "Audi/A1"` |
| Filter vehicles | `When I search for "MD-DRV-010" in search` |
| Open a result | `When I click on vehicle "MD-DRV-010"` |
| Assign a driver in the UI | `When I assign driver "Maria Rusu" via UI` |
| Check the loaded view | `Then the vehicles list should be shown` |
| Read a vehicle through JSON-RPC | `When I get vehicle by plate "MD-API-002" via API` |
| Check PostgreSQL directly | `Then database should contain vehicle plate "MD-API-002"` |

The direct database step requires `DB_ENABLED=true` and access to the Odoo PostgreSQL database.
Find more keys in the [UI map](../src/ui-map) and exact phrases in the [step definitions](../src/steps).

## Save and validate a Fleet vehicle

Odoo requires the model. The license plate is optional in Odoo and serves as a test identifier here.
The final steps check the saved record or its absence through JSON-RPC.

```gherkin
Feature: Fleet vehicle validation
  Background:
    Given Odoo is accessible
    And I am logged in as admin
    And I navigate to "vehicles" page

  Scenario: A vehicle with a license plate and a model is saved
    When I click "create" button
    And I fill "licensePlate" with "MD-WEB-001"
    And I choose vehicle model "Audi/A1"
    And I click "save" button
    Then vehicle "MD-WEB-001" should be saved in Odoo with model "Audi/A1"

  Scenario: A vehicle without a model is not saved
    When I click "create" button
    And I fill "licensePlate" with "MD-WEB-002"
    And I click "save" button
    Then Odoo should refuse to save the vehicle because "Model" is missing
    And no vehicle "MD-WEB-002" should exist in Odoo
```

To run the checked-in Fleet examples, use `npm run test:web -- --tags @fleet`. Choose distinct plates when
adding a scenario. See [vehicle management](../features/web/fleet/vehicle-management.feature),
[driver assignment](../features/web/fleet/driver-assignment.feature) and [API testing](API_TESTING.md).

## Check a scenario before execution

```bash
npm run test:smoke -- --tags @smoke-001 --dry-run
```

Check the selected scenario count and look for undefined or ambiguous steps. Remove `--dry-run` to execute it.
For operational details see the [runbook](RUNBOOK.md).
