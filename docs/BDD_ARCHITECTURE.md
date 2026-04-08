# 3-Layer BDD Architecture

The 3-Layer BDD Architecture consists of three main layers: **Atomic**, **Domain**, and **Composite**.
This structure helps organize the test code and promotes a clear separation of concerns, improving maintainability and readability.

## 1. Atomic Layer

The Atomic Layer provides the foundational steps that are reused across the Domain layer.

### Example (Atomic Layer)

- **Navigation Steps:** Refer to `src/steps/atomic/navigation.steps.ts` for steps related to navigating the application.
- **Interaction Steps:** Refer to `src/steps/atomic/interaction.steps.ts` for steps that handle user interactions.

## 2. Domain Layer

The Domain Layer encapsulates business logic and uses the atomic steps to define scenarios
that represent individual business processes.

### Example (Domain Layer)

- **Authentication Steps:** Refer to `src/steps/domain/auth.steps.ts` for steps that pertain to user authentication logic,
  utilizing the atomic interactions.

## 3. Composite Layer

The Composite Layer combines multiple domain scenarios into more comprehensive workflows,
handling complex user journeys that span across different domains.

### Example (Composite Layer)

- **Vehicle Workflows Steps:** Refer to `src/steps/composite/vehicle-workflows.steps.ts`
  for combined workflows related to vehicle management.

## Feature Snippet

### Before

```gherkin
Feature: User Authentication
  Scenario: Successful login
    Given I have navigated to the login page
    When I enter valid credentials
    Then I should be logged in
```

### After

```gherkin
Feature: User Authentication
  Scenario: Successful login and vehicle management
    Given I have navigated to the login page
    When I enter valid credentials
    And I navigate to the vehicle management section
    Then I should see my vehicle details
```

This architecture ensures organized and scalable test development essential for Behavior-Driven Development (BDD).
