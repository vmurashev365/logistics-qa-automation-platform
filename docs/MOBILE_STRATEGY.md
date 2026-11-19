# Mobile testing strategy

## Browser coverage today

For the local Odoo Fleet stack, run the tablet quick checks.

```bash
npm run test:tablet
```

The Galaxy Tab and iPad Mini Cucumber steps resize the existing Playwright page to 1200 × 800 and 744 × 1133
respectively. They use the browser chosen by `BROWSER`. The quick checks cover opening the vehicle form,
reading its field value and preserving input across orientation changes. The optional Playwright Test runner
defines separate device projects for specs under `tests/`.
[Quick checks](../features/mobile/tablet-quick-check.feature) · [Device step](../src/steps/domain/tablet.steps.ts)

## Bills of lading and proof of delivery

The BOL feature tags 21 unfinished scenarios `@wip`. They cover camera and gallery upload, offline queues,
signature capture, keyboard and orientation behavior, error handling, and touch targets. The four touch-target and
reachability scenarios account for the entire accessibility selection. `npm run test:accessibility` exits with a
message when it finds no runnable cases. The Fleet form orientation scenario is implemented and remains in
`test:tablet`. [BOL feature](../features/mobile/tablet-bol-upload.feature)

## Offline sync

- `npm run test:module:offline -- --tags @offline-sync` selects the vehicle-lifecycle scenarios. They exercise
  pending documents, conflict resolution and batch sync using the in-memory PouchDB adapter created with
  `OFFLINE_MODE=mock`. [Vehicle lifecycle](../features/integration/vehicle-lifecycle.feature)
- `npm run test:tablet:offline` selects the browser load/POD scenario. It toggles the Playwright context offline
  and online and is tagged `@external-service`. It requires a Loads/POD UI and a status endpoint with
  `API_AUTH_TOKEN` and `LOAD_STATUS_ENDPOINT`. `API_BASE_URL` defaults to `BASE_URL`.
  [Browser scenario](../features/mobile/offline_sync.feature) · [Definitions](../src/steps/domain/offline-sync.steps.ts)

## Native driver app roadmap

The proposed native suite uses Appium with Android UiAutomator2 and iOS XCUITest. The repository includes
[capability templates](../config/appium.json) and a [TypeScript loader](../config/appium.ts).
Native execution still requires an APK or IPA, devices or emulators, test accounts and a wired test runner.
The planned cases below are candidates for that suite.

### Happy Path Scenarios (Priority 1)

| Scenario ID | Description                         | Estimated Duration |
| ----------- | ----------------------------------- | ------------------ |
| **MOB-001** | Driver login with valid credentials | 30 seconds         |
| **MOB-002** | View list of assigned dispatches    | 15 seconds         |
| **MOB-003** | Open trip details (pickup/dropoff)  | 20 seconds         |
| **MOB-004** | Scan BOL at pickup location         | 45 seconds         |
| **MOB-005** | Update odometer reading             | 30 seconds         |
| **MOB-006** | Mark load as picked up              | 20 seconds         |
| **MOB-007** | Mark load as delivered              | 20 seconds         |
| **MOB-008** | Upload proof of delivery photo      | 40 seconds         |
| **MOB-009** | View trip history                   | 15 seconds         |
| **MOB-010** | Send message to dispatch            | 30 seconds         |

### Edge Case Scenarios (Priority 2)

| Scenario ID | Description                     | Test Complexity |
| ----------- | ------------------------------- | --------------- |
| **MOB-011** | Login with invalid credentials  | Low             |
| **MOB-012** | Handle expired JWT token        | Medium          |
| **MOB-013** | Airplane mode / no connectivity | High            |
| **MOB-014** | Poor network (3G, high latency) | Medium          |
| **MOB-015** | GPS signal lost during trip     | Medium          |
| **MOB-016** | Camera permission denied        | Low             |
| **MOB-017** | App backgrounded during scan    | Medium          |
| **MOB-018** | Device low battery (< 10%)      | Low             |
| **MOB-019** | OS notification interrupts      | Medium          |
| **MOB-020** | Force logout by dispatch        | High            |

### Integration Scenarios (Priority 3)

| Scenario ID | Description                        | Backend Dependency |
| ----------- | ---------------------------------- | ------------------ |
| **MOB-021** | Data sync after coming online      | Odoo API           |
| **MOB-022** | Push notification for new dispatch | FCM + Odoo         |
| **MOB-023** | Real-time location tracking        | GPS + Odoo         |
| **MOB-024** | Driver check-in/check-out          | Odoo Fleet API     |
| **MOB-025** | Multi-device login detection       | Odoo Sessions      |
