# Step Library Reference Guide

## Introduction

This guide is designed for **Product Owners** and non-technical team members who want to write automated tests without coding.
The Logistics QA Automation Platform uses a **Behavior-Driven Development (BDD)** approach where tests are written
in plain English using **Gherkin** syntax.

### What is This?

This document lists all available test steps (commands) you can use to build test scenarios.
Each step performs a specific action like clicking a button, filling a form field,
or checking if text appears on the screen.

### How to Use This Guide

1. **Find the step you need** in the tables below
2. **Copy the step pattern** into your feature file
3. **Replace the quoted text** with your actual values (e.g., replace `"buttonName"` with `"Save"`)
4. **Run your test** using `npm run test:smoke` or tag-based commands

### Three-Layer Architecture

Our framework uses a **3-layer step abstraction**:

- **Atomic Steps**: Low-level actions (click, fill, navigate) - **This guide focuses on these**
- **Domain Steps**: Business-specific workflows (create vehicle, assign driver)
- **Composite Steps**: Multi-step processes (complete vehicle onboarding)

---

## Step Categories

### 1. Navigation Steps

Navigate between pages and verify URLs.

| Step Pattern                         | Example                                               | Description                                     |
| ------------------------------------ | ----------------------------------------------------- | ----------------------------------------------- |
| `Given Odoo is accessible at {url}`  | `Given Odoo is accessible at "http://localhost:8069"` | Verifies Odoo is running at specified URL       |
| `When I navigate to {pageKey} page`  | `When I navigate to "vehicles" page`                  | Navigates to a specific page using pageKey      |
| `Then I should be on {pageKey} page` | `Then I should be on "vehicles" page`                 | Verifies current page URL matches expected page |
| `When I go to {url}`                 | `When I go to "/web#model=fleet.vehicle"`             | Navigates to exact URL path                     |
| `When I refresh the page`            | `When I refresh the page`                             | Reloads the current page                        |

**Available pageKeys**: `login`, `vehicles`, `vehicleForm`, `drivers`, `driverForm`, `dashboard`, `home`

---

### 2. Authentication Steps

Handle login and logout workflows.

| Step Pattern                                                 | Example                                                    | Description                                |
| ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------ |
| `Given I login with username {string} and password {string}` | `Given I login with username "admin" and password "admin"` | Logs into Odoo with credentials            |
| `Given I am logged in as admin`                              | `Given I am logged in as admin`                            | Quick login with default admin credentials |
| `When I logout`                                              | `When I logout`                                            | Logs out of current session                |

---

### 3. Form Interaction Steps

Fill, clear, and interact with form fields.

| Step Pattern                          | Example                                         | Description                        |
| ------------------------------------- | ----------------------------------------------- | ---------------------------------- |
| `When I fill {fieldKey} with {value}` | `When I fill "licensePlate" with "MD-TEST-001"` | Fills a field with specified value |
| `When I clear {fieldKey} field`       | `When I clear "licensePlate" field`             | Clears content from a field        |
| `When I select {value} in {fieldKey}` | `When I select "Gasoline" in "fuelType"`        | Selects option from dropdown       |
| `When I press {key} in {fieldKey}`    | `When I press "Enter" in "licensePlate"`        | Presses keyboard key in field      |

**Available fieldKeys**:

**Vehicle Fields**: `licensePlate`, `model`, `modelName`, `vehicleType`, `driver`, `assignedDriver`, `odometer`, `currentOdometer`,
`acquisitionDate`, `immatriculation`, `firstContractDate`, `vin`, `fuelType`, `color`, `seats`, `doors`, `brand`, `horsepower`,
`horsepowerTax`, `power`, `co2`, `category`, `tags`

**Driver Fields**: `driverName`, `driverPhone`, `driverMobile`, `driverEmail`, `driverCompany`, `driverDepartment`

**Login Fields**: `login`, `email`, `password`

**Common Fields**: `name`, `description`, `notes`, `active`, `state`

---

### 4. Button & Click Steps

Click buttons and interactive elements.

| Step Pattern                             | Example                             | Description                     |
| ---------------------------------------- | ----------------------------------- | ------------------------------- |
| `When I click {buttonKey} button`        | `When I click "save" button`        | Clicks a button by key or label |
| `When I click on {text}`                 | `When I click on "Create Vehicle"`  | Clicks element containing text  |
| `When I double click {buttonKey} button` | `When I double click "edit" button` | Double-clicks a button          |

**Available buttonKeys**:

**CRUD Actions**: `create`, `new`, `save`, `edit`, `discard`, `discardChanges`, `delete`, `archive`, `unarchive`, `duplicate`

**Search/Filter**: `search`, `filter`, `groupBy`, `favorites`

**Navigation**: `back`, `cancel`, `close`, `confirm`, `ok`

**Authentication**: `login`, `logout`

**Actions**: `print`, `export`, `import`, `send`, `refresh`

**Fleet-Specific**: `newRequest`, `assignDriver`, `unassignDriver`, `logOdometer`

---

### 5. Assertion Steps

Verify UI state, text visibility, and field values.

| Step Pattern                                   | Example                                             | Description                      |
| ---------------------------------------------- | --------------------------------------------------- | -------------------------------- |
| `Then I should see {text} text`                | `Then I should see "Vehicles" text`                 | Verifies text is visible on page |
| `Then I should not see {text} text`            | `Then I should not see "Error" text`                | Verifies text is NOT visible     |
| `Then I should see {heading} heading`          | `Then I should see "Fleet Dashboard" heading`       | Verifies heading exists          |
| `Then I should see {buttonName} button`        | `Then I should see "Save" button`                   | Verifies button is visible       |
| `Then I should not see {buttonName} button`    | `Then I should not see "Delete" button`             | Verifies button is NOT visible   |
| `Then {fieldKey} field should contain {value}` | `Then "licensePlate" field should contain "MD-001"` | Verifies field value matches     |
| `Then {fieldKey} field should be empty`        | `Then "odometer" field should be empty`             | Verifies field has no value      |
| `Then {fieldKey} field should be visible`      | `Then "licensePlate" field should be visible`       | Verifies field is displayed      |
| `Then {fieldKey} field should be disabled`     | `Then "vin" field should be disabled`               | Verifies field is read-only      |

---

### 6. Wait Steps

Pause or wait for conditions.

| Step Pattern                          | Example                                     | Description                         |
| ------------------------------------- | ------------------------------------------- | ----------------------------------- |
| `When I wait {seconds} seconds`       | `When I wait 2 seconds`                     | Pauses execution for specified time |
| `When I wait for {text} to appear`    | `When I wait for "Vehicle saved" to appear` | Waits until text becomes visible    |
| `When I wait for {text} to disappear` | `When I wait for "Loading..." to disappear` | Waits until text is gone            |
| `When I wait for page to load`        | `When I wait for page to load`              | Waits for network idle state        |

---

### 7. API Steps

Test REST and Odoo JSON-RPC APIs.

| Step Pattern                                 | Example                                        | Description                    |
| -------------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `Given Odoo API is authenticated`            | `Given Odoo API is authenticated`              | Verifies API session is active |
| `When I send {method} request to {endpoint}` | `When I send "GET" request to "/api/vehicles"` | Makes HTTP request             |
| `When I create Odoo record in {model} with:` | See example below                              | Creates record via JSON-RPC    |
| `Then API response status should be {code}`  | `Then API response status should be 200`       | Verifies HTTP status code      |
| `Then API response should contain {field}`   | `Then API response should contain "id"`        | Verifies response has field    |

---

### 8. Database Steps

Verify data persistence in PostgreSQL database.

| Step Pattern                                                 | Example                                                     | Description                    |
| ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------ |
| `Then database should contain vehicle plate {plate}`         | `Then database should contain vehicle plate "MD-TEST-001"`  | Verifies vehicle exists in DB  |
| `Then database should not contain vehicle plate {plate}`     | `Then database should not contain vehicle plate "MD-OLD"`   | Verifies vehicle doesn't exist |
| `Then database vehicle {plate} should have odometer {value}` | `Then database vehicle "MD-001" should have odometer 12500` | Verifies specific field value  |
| `Then driver {name} should exist in database`                | `Then driver "John Doe" should exist in database`           | Verifies driver record exists  |

---

## Full Scenario Examples

### Example 1: Create Vehicle (Minimum Fields)

```gherkin
@smoke @vehicle-creation
Scenario: Create vehicle with license plate only
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  When I navigate to "vehicles" page
  And I click "create" button
  And I fill "licensePlate" with "MD-TEST-001"
  And I click "save" button
  Then I should see "Vehicles" text
  And database should contain vehicle plate "MD-TEST-001"
```

### Example 2: Create Vehicle (Full Details)

```gherkin
@vehicle-creation @complete
Scenario: Create vehicle with all details
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  When I navigate to "vehicles" page
  And I click "create" button
  And I fill "licensePlate" with "MD-FLEET-100"
  And I fill "model" with "Volvo XC90"
  And I fill "vin" with "YV1CZ852651234567"
  And I select "Diesel" in "fuelType"
  And I fill "color" with "Silver"
  And I fill "seats" with "7"
  And I fill "odometer" with "15000"
  And I click "save" button
  Then I should see "Vehicles" text
  And "licensePlate" field should contain "MD-FLEET-100"
```

### Example 3: Search and Verify Vehicle

```gherkin
@vehicle-search
Scenario: Search for existing vehicle
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  When I navigate to "vehicles" page
  And I fill "search" with "MD-FLEET-100"
  And I press "Enter" in "search"
  Then I should see "MD-FLEET-100" text
  And I should see "Volvo XC90" text
```

### Example 4: Discard Vehicle Creation

```gherkin
@vehicle-discard
Scenario: Cancel vehicle creation without saving
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  When I navigate to "vehicles" page
  And I click "create" button
  And I fill "licensePlate" with "MD-TEMP-999"
  And I click "discard" button
  Then I should see "Vehicles" text
  And database should not contain vehicle plate "MD-TEMP-999"
```

### Example 5: API Test - Create Vehicle via JSON-RPC

```gherkin
@api @vehicle-api
Scenario: Create vehicle using Odoo API
  Given Odoo API is authenticated
  When I create Odoo record in "fleet.vehicle" with:
    | license_plate | MD-API-001 |
    | model_id      | 1          |
  Then API response status should be 200
  And API response should contain "id"
  And database should contain vehicle plate "MD-API-001"
```

### Example 6: Driver Assignment

```gherkin
@driver-assignment
Scenario: Assign driver to vehicle
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  And I navigate to "vehicles" page
  When I click on "MD-FLEET-100"
  And I wait for page to load
  And I click "edit" button
  And I select "John Smith" in "driver"
  And I click "save" button
  Then I should see "John Smith" text
```

### Example 7: Negative Test - Empty Required Field

```gherkin
@negative @validation
Scenario: Cannot save vehicle without license plate
  Given Odoo is accessible at "http://localhost:8069"
  And I am logged in as admin
  When I navigate to "vehicles" page
  And I click "create" button
  And I fill "model" with "BMW X5"
  And I click "save" button
  Then I should see "The following fields are invalid" text
  Or I should see "License Plate is required" text
```

---

## UI-MAP Keys Reference

The framework uses **UI-MAP pattern** to decouple tests from UI changes. Always use these keys instead of exact labels.

### Available Keys

**Page Keys** (for navigation):

```text
login, vehicles, vehicleForm, drivers, driverForm, dashboard, home
```

**Field Keys** (for form filling):

```text
licensePlate, model, modelName, vehicleType, driver, assignedDriver,
odometer, currentOdometer, acquisitionDate, immatriculation,
firstContractDate, vin, fuelType, color, seats, doors, brand,
horsepower, horsepowerTax, power, co2, category, tags,
driverName, driverPhone, driverMobile, driverEmail, driverCompany,
driverDepartment, login, email, password, name, description, notes
```

**Button Keys** (for clicking):

```text
create, new, save, edit, discard, discardChanges, delete, archive,
unarchive, duplicate, search, filter, groupBy, favorites, back,
cancel, close, confirm, ok, login, logout, print, export, import,
send, refresh, newRequest, assignDriver, unassignDriver, logOdometer
```

**Message Keys** (for assertions):

```text
vehicleSaved, driverAssigned, vehicleDeleted, loginSuccess,
loginFailed, validationError, accessDenied, recordCreated
```

---

## Tips for Writing Tests

### ✅ DO

- Use descriptive scenario names that explain the business value
- Tag scenarios appropriately (`@smoke`, `@critical`, `@api`, `@web`)
- Use Background section for common setup steps
- Clean up test data after scenarios
- Use meaningful test data (e.g., `MD-TEST-001`, not `XXX`)

### ❌ DON'T

- Hardcode exact UI labels (use UI-MAP keys instead)
- Create tests that depend on each other
- Skip assertions - always verify expected results
- Use production data in tests
- Create duplicate scenarios

### Example: BAD vs GOOD

**❌ BAD** (hardcoded labels, no assertions):

```gherkin
When I click "New" button
And I fill "License Plate" with "ABC"
And I click "Save" button
```

**✅ GOOD** (UI-MAP keys, clear assertions):

```gherkin
When I click "create" button
And I fill "licensePlate" with "MD-TEST-001"
And I click "save" button
Then I should see "Vehicles" text
And database should contain vehicle plate "MD-TEST-001"
```

---

## Running Your Tests

### Run All Smoke Tests

```bash
npm run test:smoke
```

### Run Specific Tag

```bash
npx cucumber-js --tags @vehicle-creation
```

### Run Multiple Tags

```bash
npx cucumber-js --tags "@smoke and not @api"
```

### Run in Non-Headless Mode (See Browser)

```powershell
$env:HEADLESS="false"; npx cucumber-js --tags @smoke
```

### Generate HTML Report

```bash
npm run report:cucumber
```

---

## Getting Help

- **Report Issues**: Contact QA team lead
- **Add New Steps**: Request via DevOps team
- **Update UI-MAP**: Submit PR with new fieldKeys/buttonKeys
- **Documentation**: See `docs/API_TESTING.md` for API details

---

**Last Updated**: January 2026  
**Framework Version**: 1.0.0  
**Maintained By**: QA Automation Team
