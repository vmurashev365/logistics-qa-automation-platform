# Logistics QA Automation Platform

[![Core QA checks](https://github.com/vmurashev365/logistics-qa-automation-platform/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/vmurashev365/logistics-qa-automation-platform/actions/workflows/ci.yml)

## Case study · Driver assignment

A driver assignment can look saved on the dispatcher's screen while the Fleet API or database still holds the old driver.
That leaves dispatch and downstream tools working from different records.

In a local Odoo 17 Fleet demo, Playwright assigned **Maria Rusu** to vehicle **MD-DRV-011** through the vehicle form.
Cucumber then checked the driver through Odoo JSON-RPC and independently checked the stored relationship in PostgreSQL.
Both reads matched the expected assignment. The report shows the expected and observed values from the recorded run.

[Watch the recording](https://odoo-fleet-driver-assignment.vmurashev.chatgpt.site/) ·
[Open the check report](https://odoo-fleet-driver-assignment.vmurashev.chatgpt.site/report) ·
[Read the Gherkin scenario](features/web/fleet/driver-assignment.feature)

## Quick start

Install Node.js 20 or later and start Docker. From the repository root in PowerShell, run the following commands.

```powershell
npm ci
npx playwright install chromium
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run docker:start
```

In Bash, use `cp -n .env.example .env` to create the local configuration. The Docker npm scripts use
`docker-compose`. For installations that expose `docker compose`, start the stack with `docker compose up -d`.
Wait for [Odoo health](http://localhost:8069/web/health) to return success. The local Fleet database is
`logistics_qa_db`, with `admin` / `admin` as the initial Odoo credentials. When targeting another instance,
set the URL and credentials for a dedicated test database. Smoke scenarios create and remove vehicles.

```bash
npm run test:smoke
npm run test:web -- --tags @portfolio
```

To run just **Access Vehicles page**, use `npm run test:smoke -- --tags @smoke-001`.
To inspect that selection without running the steps, append `--dry-run`. A positional feature path is added to the
glob in `cucumber.js` and can select scenarios in other files. The [runbook](docs/RUNBOOK.md) covers troubleshooting.

## Running tests

| Command | Scenarios selected and prerequisites |
| --- | --- |
| `npm run test:smoke` | Fleet browser and tablet quick checks. Excludes `@api`, `@module_loads` and `@wip`. |
| `npm run test:api` / `npm run test:api:smoke` | Core Odoo Fleet API checks / the tagged API smoke check. |
| `npm run test:web` | Fleet UI and CTI screen pop. Use `npm run test:web -- --tags @fleet` for Fleet checks. |
| `npm run test:integration` | Fleet, UI/API/DB consistency and simulated HOS/ELD rules. Excludes finance, offline-sync and CTI module tags. |
| `npm run test:core` / `npm run test:nightly` | Union of smoke, API and integration selections. Overlapping scenarios run once. |
| `npm run test:chromium` | Four native Playwright smoke checks for health, the login page and valid/invalid login. |
| `npm run test:security` | Access control, sessions, input handling, export and audit. Some checks require PostgreSQL or access to the Odoo server log. Anonymization is tagged `@wip`. |
| `npm run test:tablet` | Local Fleet form checks using tablet-sized viewports and orientation changes. |
| `npm run test:tablet:galaxy` / `npm run test:tablet:ipad` | Device-tagged Fleet browser checks. |
| `npm run test:tablet:offline` | Browser POD sync scenario. Requires a compatible Loads UI and status service. |
| `npm run test:accessibility` | Zero runnable scenarios. Exits with an explanation until the Loads touch-target and reachability steps are implemented. |
| `npm run test:module:finance` | Salary and IFTA checks require a REST service, configured endpoints and a bearer token. |
| `npm run test:module:offline` | In-memory vehicle sync and browser load/POD sync. The browser scenario needs a Loads UI, status endpoint and token. |
| `npm run test:module:cti` | In-memory call workflows and browser screen pop. The browser scenario needs a CTI-enabled UI and matching contact. |
| `npm run test:visual` | Two Fleet snapshots. Create baselines before comparison. |
| `npm run test:all` | All scenarios outside `@wip`, including external-service scenarios and visual checks, using two workers. |

The `@wip` tag marks unfinished scenarios such as the Loads BOL upload and signature flows. The `@external-service`
tag marks scenarios with step definitions that need a compatible deployment beyond the bundled stack. CTI call events,
offline vehicle sync and HOS/ELD use simulations. Visual checks require baselines and some security checks require
additional accounts or server log access. See the [mobile strategy](docs/MOBILE_STRATEGY.md) and [script definitions](package.json).

## Reports and CI

Cucumber writes `reports/cucumber/cucumber-report.html`, `reports/cucumber/cucumber.json` and `allure-results/`.
Run `npm run report:cucumber` to generate `reports/cucumber/index.html` from JSON. With Java installed,
`npm run report:allure:trend:open` generates and opens the Allure report and saves local trend history.
Failure screenshots go to `reports/screenshots/` when enabled.

The [GitHub Actions workflow](.github/workflows/ci.yml) runs type-check, lint, the Cucumber core suites and the native
Chromium smoke tests on pushes and pull requests targeting `main`, daily at 03:30 UTC and on manual dispatch.
Download the Cucumber, Allure and Playwright HTML reports from **Artifacts** on the run page. GitHub requires a
signed-in account for Actions artifact downloads. The driver-assignment recording and report above are public.

## Test data

`npm run db:seed` creates 10 vehicles and five driver contacts via Odoo JSON-RPC. Preview cleanup with
`npm run db:clean -- --dry-run` before using `npm run db:clean`. The script matches plate prefixes and partner
identifiers across the configured test database. See the [data strategy](docs/DATA_STRATEGY.md).

## 🖼️ Visual regression (POC)

This is a minimal visual regression proof-of-concept using Cucumber tag `@visual`.

1. Create/update baselines (local):

**Windows (PowerShell):**

```powershell
$env:UPDATE_BASELINE="1"; npm run test:visual
```

**Mac/Linux:**

```bash
UPDATE_BASELINE=1 npm run test:visual
```

After capture in PowerShell, run `Remove-Item Env:UPDATE_BASELINE` to return to comparison mode.

Baselines are stored in `visual/baseline/`.

2. Compare against baselines (default):

```bash
npm run test:visual
```

A size mismatch saves the actual image. On a pixel mismatch, the run writes debug images to `reports/visual/*.actual.png` and `reports/visual/*.diff.png`.

---

## 📁 Project Structure

Here's a simplified view of the key folders:

```text
logistics-qa-automation-platform/
├── features/                  # 📝 Test files (Gherkin language)
│   ├── smoke.feature         #    Quick sanity checks
│   ├── security.feature      #    Security tests
│   ├── api/                  #    API tests
│   ├── integration/          #    Integration tests
│   ├── web/                  #    Web interface tests
│   └── mobile/               #    Tablet/mobile tests
│
├── src/                       # 💻 Framework code (for developers)
│   ├── api/                  #    API clients (Odoo JSON-RPC)
│   ├── db/                   #    Database utilities
│   ├── pages/                #    Page Object Models
│   ├── steps/                #    Test step implementations
│   ├── support/              #    Cucumber hooks & world
│   ├── types/                #    TypeScript type definitions
│   ├── ui-map/               #    UI element locators
│   └── utils/                #    Helper functions
│
├── config/                    # ⚙️ Configuration files
│   └── appium.ts             #    Appium settings for mobile
│
├── perf/                      # ⚡ Performance tests
│   └── k6/                   #    k6 load test scripts
│
├── reports/                   # 📊 Test results
│   ├── cucumber/             #    HTML reports
│   └── screenshots/          #    Error screenshots
│
├── docs/                      # 📚 Documentation
│   ├── STEP_LIBRARY.md       #    Test steps reference
│   ├── RUNBOOK.md            #    Troubleshooting guide
│   └── ...                   #    Other guides
│
├── allure-report/            # 📈 Allure HTML report (generated)
├── allure-history/           # 📈 Allure trend history (generated)
├── .env.example              # 🔐 Environment variables template
├── docker-compose.yml        # 🐳 Docker settings for Odoo
├── cucumber.js               # ⚙️ Cucumber configuration
└── package.json              # 📦 Dependencies & scripts
```

Start with the scenarios in [features](features) and use the [step library](docs/STEP_LIBRARY.md) for matching phrases.

---

## 📚 Documentation for Different Roles

| Document | Who It's For | What's Inside |
| --- | --- | --- |
| **[STEP_LIBRARY.md](docs/STEP_LIBRARY.md)** | Product Owners, Business Analysts | Registered steps and Fleet examples |
| **[RUNBOOK.md](docs/RUNBOOK.md)** | Anyone | Troubleshooting guide and common fixes |
| **[BDD_ARCHITECTURE.md](docs/BDD_ARCHITECTURE.md)** | QA Engineers, Developers | 3-Layer BDD architecture (Atomic → Domain → Composite) |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | QA Engineers, Developers | Browser, JSON-RPC and PostgreSQL paths |
| **[API_TESTING.md](docs/API_TESTING.md)** | QA Engineers | Guide for API testing |
| **[MOBILE_STRATEGY.md](docs/MOBILE_STRATEGY.md)** | QA Engineers | Mobile testing roadmap |
| **[DATA_STRATEGY.md](docs/DATA_STRATEGY.md)** | QA Engineers | Test data management |
| **[CTI_STRATEGY.md](docs/CTI_STRATEGY.md)** | QA Engineers | Computer Telephony Integration testing |

---

## HOS and ELD

Run `npm run test:integration -- --tags @hos` to exercise the simulated driving, duty, break and cycle rules.
`VirtualClock` advances time, `EldMockClient` supplies duty events and `HosCalculator` evaluates the event history.
Use `ELD_MODE=mock`. The API provider is a stub. See the [HOS scenarios](features/integration/hos_compliance.feature).

```gherkin
Feature: HOS example
  Scenario: Driving exceeds the 11-hour limit
    Given demo HOS context for driver "D1" and vehicle "V1"
    And driver "D1" starts OFF_DUTY for 600 minutes
    When driver "D1" drives for 700 minutes
    Then HOS status for driver "D1" should show VIOLATION for "DRIVE_11"
```

## Performance testing

Install k6 on the command path. Both scripts accept `BASE_URL` and default to `http://localhost:8069`.

| Command | Description |
| --- | --- |
| `npm run perf:k6:smoke` | Checks public HTTP availability and response content for the health endpoint and login form (1 minute, 10 VUs). |
| `npm run perf:k6:load` | Measures authenticated Odoo JSON-RPC `fleet.vehicle.search_read` and validates a result array of up to 20 Fleet records (9 minutes, up to 100 VUs). |

Set `ODOO_USERNAME` and `ODOO_PASSWORD` in the shell for the Fleet read. `ODOO_DATABASE` defaults to
`logistics_qa_db`. To verify the request and checks on the demo stack at lower load, run
`npm run perf:k6:load -- --stage 5s:2 --stage 15s:2 --stage 5s:0`.

## Command reference

### Reporting

| Command                            | Description                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `npm run report:cucumber`          | Generate Cucumber HTML report                         |
| `npm run report:allure`            | Generate Allure report                                |
| `npm run report:allure:open`       | Open existing Allure report in browser                |
| `npm run report:allure:trend`      | Generate Allure report with Trend/history preserved   |
| `npm run report:allure:trend:open` | Generate Allure report with Trend/history and open it |

### Allure Trend (Advanced)

| Command                          | Description                                         |
| -------------------------------- | --------------------------------------------------- |
| `npm run allure:history:restore` | Restore Trend history into `allure-results/history` |
| `npm run allure:history:save`    | Save `allure-report/history` into `allure-history`  |

### Docker Management

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run docker:start` | Start Odoo + PostgreSQL containers |
| `npm run docker:stop`  | Stop containers                    |
| `npm run docker:reset` | Reset containers and volumes       |

### Code Quality

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `npm run lint`         | Run ESLint                      |
| `npm run lint:fix`     | Fix ESLint issues automatically |
| `npm run format`       | Format code with Prettier       |
| `npm run format:check` | Check code formatting           |
| `npm run type-check`   | TypeScript type checking        |
| `npm run build`        | Compile TypeScript              |
| `npm run clean`        | Clean generated files           |

## 🔧 Configuration

### Environment Variables (.env)

| Variable                | Default                 | Description                                  |
| ----------------------- | ----------------------- | -------------------------------------------- |
| `BASE_URL`              | `http://localhost:8069` | Odoo base URL                                |
| `ODOO_USERNAME`         | `admin`                 | Odoo username for UI/API                     |
| `ODOO_PASSWORD`         | `admin`                 | Odoo password for UI/API                     |
| `ODOO_DATABASE`         | `logistics_qa_db`       | Odoo database name                           |
| `HEADLESS`              | `false`                 | Run browser headless                         |
| `BROWSER`               | `chromium`              | `chromium`, `firefox` or `webkit`            |
| `TIMEOUT`               | `30000`                 | Default timeout (ms)                         |
| `SLOW_MO`               | `0`                     | Slow down actions (ms)                       |
| `VIEWPORT_WIDTH`        | `1920`                  | Browser viewport width                       |
| `VIEWPORT_HEIGHT`       | `1080`                  | Browser viewport height                      |
| `SCREENSHOT_ON_FAILURE` | `true`                  | Capture screenshot on failure                |
| `VIDEO_RECORDING`       | `false`                 | Record video of test execution               |
| `RETRY_COUNT`           | `0`                     | Number of retries for failed tests           |
| `DB_ENABLED`            | `true`                  | Enable direct DB checks in integration tests |
| `POSTGRES_HOST`         | `localhost`             | PostgreSQL host                              |
| `POSTGRES_PORT`         | `5432`                  | PostgreSQL port                              |
| `POSTGRES_USER`         | `odoo`                  | PostgreSQL user                              |
| `POSTGRES_PASSWORD`     | `odoo`                  | PostgreSQL password                          |
| `POSTGRES_DATABASE`     | `logistics_qa_db`       | PostgreSQL database                          |
| `CTI_MODE`              | `mock`                  | CTI mode (`mock`/`disabled`)                 |
| `OFFLINE_MODE`          | `mock`                  | Offline sync mode (`mock`/`disabled`)        |
| `API_BASE_URL`          | `BASE_URL`              | REST services under test (finance, loads)    |
| `ODOO_CONTAINER`        | `logistics-qa-odoo`     | Odoo container, read by @security-016        |
| `ODOO_LOG_FILE`         | odoo.conf `logfile`     | Log file in the container; empty: logs       |

The browser configuration rejects invalid typed values: a value that cannot be read (`HEADLESS=maybe`,
`TIMEOUT=30s`, `BROWSER=chrome`) stops the run with a message naming the variable. Scenarios
signing in as another user by name need `USER_<LOGIN>_PASSWORD`; there is no default password.

### ENV Contract (Integration Modules)

The following settings apply to individual integration modules under `features/api`, `features/mobile`, and `features/web`.

| Variable | Required By | Notes |
| --- | --- | --- |
| `API_BASE_URL` | Financial Compliance, Offline Sync | Base URL for REST services under test (default `BASE_URL`) |
| `API_AUTH_TOKEN` | Financial Compliance, Offline Sync | Bearer token value (without the `Bearer` prefix) |
| `FINANCE_SALARY_ENDPOINT` | Financial Compliance | Salary endpoint path or absolute URL |
| `FINANCE_IFTA_ENDPOINT` | Financial Compliance | IFTA endpoint path or absolute URL |
| `LOAD_STATUS_ENDPOINT` | Offline Sync | Polling endpoint for sync status (path or absolute URL) |
| `CTI_WS_PATTERN` | CTI Screen Pop | WebSocket URL match pattern used by `page.routeWebSocket()` (supports `*` wildcards or `/regex/flags`) |
| `DEMO_MODE` | HOS / ELD | Parsed demo flag (default `true`). `ELD_MODE` selects the provider. |
| `TIMEZONE` | HOS / ELD | IANA timezone name (default `UTC`) |
| `ELD_MODE` | HOS / ELD | `mock` or `api` (default `mock`) |
| `ELD_API_BASE_URL` | HOS / ELD | Required when `ELD_MODE=api` |
| `ELD_API_TOKEN` | HOS / ELD | Required when `ELD_MODE=api` |
| `HOS_RULESET` | HOS / ELD | Currently `FMCSA` only |

### Running in Headed Mode (Default)

```bash
HEADLESS=false npm run test:smoke
```

### Running with Slow Motion

```bash
SLOW_MO=500 npm run test:smoke
```

## Usage Notice

Copyright © Victor Murashev. All rights reserved.

This repository is provided for portfolio review, technical evaluation, and interview demonstration purposes only.

Commercial reuse, redistribution, client implementation, internal delivery, agency delivery, training use, or adaptation of this framework without prior written permission is not allowed.

This project is an independent QA automation portfolio framework and is not affiliated with, endorsed by, or sponsored by Odoo S.A.
