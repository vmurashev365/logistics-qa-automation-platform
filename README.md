# Logistics QA Automation Platform

[![CI — Smoke Tests](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)

A time-boxed training build demonstrating a maintainable QA automation platform
using a local Dockerized Odoo Community testbed. Covers web UI, REST/JSON-RPC API,
database, integration, mobile, security, and performance testing for logistics
workflow applications.

---

> **Portfolio Disclaimer**
>
> This repository is a **training / portfolio project** built as a time-boxed
> framework challenge. It is intended to demonstrate QA framework architecture,
> engineering approach, and multi-suite coverage — **not** associated with any
> client release or production system.

---

## ✨ Highlights

- 🏗 **3-Layer BDD Architecture** -
  Atomic → Domain → Composite steps for maximum reusability (see
  [docs/BDD_ARCHITECTURE.md](docs/BDD_ARCHITECTURE.md))
- 🗺 **UI-MAP Pattern** - Decoupled selectors for maintainability and resilience
- 🔄 **Full-Stack Testing** - Web UI, REST/JSON-RPC APIs, Database, Integration tests
- 📱 **Mobile-Ready** - Appium architecture for Android/iOS driver app testing
- 🔐 **Security Testing** - Access control, authentication, GDPR compliance validation
- ⚡ **Performance Testing** - k6 integration for load and stress testing
- 📚 **50+ Reusable Steps** - Product Owners can write tests without coding
- 🐳 **Docker-First** - Containerized Odoo environment for consistent testing
- 📊 **Rich Reporting** - Cucumber HTML reports, Allure reports, screenshots on failure
- 🚀 **CI/CD Ready** - GitHub Actions workflow with nightly smoke regression

---

## 🔌 Adapter-first Architecture (Demo-ready)

- **Odoo adapter included** (JSON-RPC) for data setup and verification.
- **ELD provider is pluggable**: mock provider for demos, API provider stub for real integrations.
- **Domain logic is deterministic** (VirtualClock + HosCalculator) for instant long-duration simulations.

---

## ✅ Compliance Coverage Matrix

| Module | Coverage | Notes |
| --- | --- | --- |
| HOS / ELD | ✅ Deterministic HOS engine, mock ELD | Demo mode supported |
| IFTA / Finance | ✅ REST API compliance | Calculator parity checks |
| Fleet | ✅ Web UI + API + DB | Vehicles, fuel, inspections |
| Inspections | ✅ Web UI | Fleet inspection flows |
| Offline Sync | ✅ Mobile + API | CouchDB mock |
| CTI | ✅ Web UI | Screen pop + WebSocket |

---

## ⚡ Quick Adaptation Guide

1. **Replace the Odoo adapter** with your REST/GraphQL adapter.
2. **Keep HosCalculator + EldProvider unchanged** to retain deterministic compliance logic.
3. Update `.env` contract values for your environments.

---

## 💰 ROI (Typical Outcomes)

- 60–80% reduction in manual compliance regression time.
- Faster onboarding for new fleets with reusable test suites.
- Reduced defect leakage in high-regulatory modules.

---

## ⚠️ Disclaimer

This framework provides test automation support and **does not constitute legal certification**.
This is a portfolio / training project and is not associated with any specific company or client.

---

## 📖 Table of Contents

- [What is this?](#-what-is-this)
- [Quick Start (Step by Step)](#-quick-start-step-by-step)
- [Running Tests](#-running-tests)
- [Viewing Reports](#-viewing-reports)
- [Project Structure](#-project-structure)
- [Writing Tests](#-writing-tests)
- [Troubleshooting](#-troubleshooting)
- [Command Reference](#-command-reference-complete-list)

---

## 🎯 What is this?

This framework demonstrates automated validation patterns for a logistics workflow platform:

- ✅ **Web Interface** — clicks, form filling, display verification
- ✅ **API** — server response validation without using the UI
- ✅ **Database** — verifies data is saved correctly
- ✅ **Security** — checks user access permissions
- ✅ **Performance** — validates system speed under load
- ✅ **Tablet Devices** — testing on Galaxy Tab and iPad

**Key Benefit:** Tests are written in plain English (Gherkin language), so business users can read
and even write tests without programming knowledge!

---

## 🚀 Quick Start (Step by Step)

## ⚡ 5-minute Demo

Goal: run a quick smoke suite and open an Allure report.

The local demo runs in headed mode by default so the browser flow is visible.

```bash
npm install
npx playwright install chromium
copy .env.example .env

# Optional (if you want a local Odoo + Postgres to test against)
npm run docker:start

# Run smoke
npm run test:smoke

# Generate + open Allure report (with trend history)
npm run report:allure:trend:open
```

Notes:

- Cucumber (`cucumber-js`) is the primary test runner in this repo.
- Playwright is used as the browser automation engine inside Cucumber steps.
- The Playwright Test runner (`npx playwright test`) is optional and not used by default.

### Step 1: Install Required Software

Before you begin, install these programs on your computer:

| Program | Why You Need It | How to Install |
| ------- | --------------- | -------------- |
| **Node.js 20+** | Runs the test framework | [Download from nodejs.org](https://nodejs.org/) — choose the LTS version |
| **Docker Desktop** | Runs the Odoo test environment | [Download from docker.com](https://www.docker.com/products/docker-desktop/) |
| **Git** | Downloads the project code | [Download from git-scm.com](https://git-scm.com/) |

> 💡 **Tip:** After installing Docker Desktop, make sure it's running (the whale icon in your system tray should be active).

### Step 2: Download the Project

Open **PowerShell** (or **Terminal** on Mac) and run these commands:

```bash
# Navigate to where you want to store the project
cd C:\Projects

# Download the project
git clone https://github.com/<your-username>/logistics-qa-automation-platform.git

# Go into the project folder
cd logistics-qa-automation-platform
```

> 💡 **How to open PowerShell:** Press `Win + X` and select "Windows PowerShell" or "Terminal".

### Step 3: Install Dependencies

```bash
# Install project libraries (takes 1-2 minutes)
npm install

# Install the browser for testing
npx playwright install chromium

# Copy environment configuration (edit if needed)
copy .env.example .env   # Windows
# cp .env.example .env   # Mac/Linux
```

> ⏳ The first run may take several minutes — wait for it to complete.
>
> 💡 **Tip:** Review `.env` file and adjust settings if your Odoo runs on a different URL or port.

### Step 4: Start the Odoo Test Environment

```bash
# Start Odoo and PostgreSQL in Docker
npm run docker:start
```

**Wait for startup!** The first time, Odoo initialization may take **1-2 minutes**.

Verify it's ready:

1. Open your browser and go to <http://localhost:8069>
2. You should see the Odoo login page
3. Username: `admin`, Password: `admin`

> ⚠️ **If the page doesn't load:** Wait another minute and refresh. Check status with `docker-compose logs -f odoo`.

### Step 5: Run Your First Test

```bash
# Run quick smoke tests
npm run test:smoke
```

You'll see test progress and results:

- ✅ **Passed** — test completed successfully
- ❌ **Failed** — test found an issue
- Each scenario name and every Gherkin step are printed to the terminal with execution time.

---

## 🧪 Running Tests

### Runner (important)

- **Primary runner:** Cucumber (`cucumber-js`) using config in `cucumber.js`.
- **Playwright usage:** Steps/hooks use the `playwright` library to drive browsers.
- **`@playwright/test` usage:** Used for Playwright's `expect` assertions inside Cucumber step definitions.
- **Playwright Test runner:** Optional only; see `playwright.config.ts`.

### Common Commands

| What to Test | Command | Duration |
| --- | --- | --- |
| Quick check (smoke) | `npm run test:smoke` | ~2 min |
| API only | `npm run test:api` | ~3 min |
| Web UI only | `npm run test:web` | ~5 min |
| Integration tests | `npm run test:integration` | ~5 min |
| All tests | `npm run test:all` | ~15 min |
| Tablet tests | `npm run test:tablet` | ~3 min |

### Suites & tags

These suites map directly to `package.json` scripts and Cucumber tag expressions.

| Suite | Primary tags (present in `features/**/*.feature`) | Command |
| --- | --- | --- |
| Smoke | `@smoke` (excludes `@api`) | `npm run test:smoke` |
| API | `@api` (excludes `@module_*` by default) | `npm run test:api` |
| API smoke | `@api-smoke` | `npm run test:api:smoke` |
| Web UI | `@web` (scoped to `features/web`) | `npm run test:web` |
| Integration | `@integration` (excludes `@module_*`) | `npm run test:integration` |
| Security | `@security` | `npm run test:security` |
| Accessibility | `@accessibility` | `npm run test:accessibility` |
| Tablet | `@tablet` (scoped to `features/mobile`) | `npm run test:tablet` |
| Tablet offline | `@tablet and @offline` | `npm run test:tablet:offline` |

Common secondary tags you can use to slice scenarios:

- `@critical`, `@quick-check`, `@galaxy-tab`, `@ipad-mini`, `@offline`

Module tags (use these to run specific functional areas):

- `@module_finance` (Financial Compliance)
- `@module_offline_sync` (Offline Sync)
- `@module_cti` (CTI Screen Pop)
- `@module_loads` (Loads / BOL upload flows)

Note: `npm run test:integration` excludes module-tagged scenarios by default.
Run module suites directly when the required external env/config is available.

Note: `npm run test:api` also excludes module-tagged scenarios by default.
For example, finance compliance API tests require `API_BASE_URL` and related vars.
Use the `test:module:*` scripts when the required external services and env vars are configured.

### Running Specific Tests

```bash
# By scenario name
npx cucumber-js --name "Access Vehicles page"

# By tag
npx cucumber-js --tags "@smoke"
npx cucumber-js --tags "@critical"
npx cucumber-js --tags "@tablet"
```

### Running Headless (optional)

By default, local demo runs open a visible browser. To switch back to headless mode:

**Windows (PowerShell):**

```powershell
$env:HEADLESS="true"; npm run test:smoke
```

**Mac/Linux:**

```bash
HEADLESS=true npm run test:smoke
```

### Terminal Step Logging

By default, local demo runs print each scenario name and every Gherkin step with execution time.

To disable step timing logs:

**Windows (PowerShell):**

```powershell
$env:DEBUG_TIMING="false"; npm run test:smoke
```

**Mac/Linux:**

```bash
DEBUG_TIMING=false npm run test:smoke
```

---

## 📊 Viewing Reports

### Cucumber HTML Report (Simple)

After running tests, generate the report:

```bash
npm run report:cucumber
```

Open the file `reports/cucumber/index.html` in your browser.

### Allure Report (Advanced, with Charts)

```bash
# Generate report first, then open it
npm run report:allure
npm run report:allure:open

# Or use the combined command with history (recommended)
npm run report:allure:trend:open
```

> 💡 The Allure report will open automatically in your browser.

---

## 🤖 CI (GitHub Actions)

The workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) provides:

| Feature | Details |
| --- | --- |
| **Triggers** | `push` to main, `pull_request`, nightly schedule (03:30 UTC), manual `workflow_dispatch` |
| **Environment** | Ubuntu + PostgreSQL service + Odoo 17 container (Docker) |
| **Test command** | `npm run test:smoke` |
| **Reports** | Cucumber HTML + Allure (with trend history) |
| **Rerun** | Re-run any job from GitHub Actions UI or GitHub mobile app |

Artifacts uploaded per run:

- `allure-results/` — raw Allure data
- `allure-report/` — generated Allure HTML report
- `allure-history/` — trend history snapshot (30-day retention)
- `cucumber-report/` — Cucumber HTML report
- `failure-screenshots/` — captured on failure only

> **Manual trigger:** Open Actions → *CI — Smoke Tests & Reports* → *Run workflow* (works from GitHub mobile app too).

---

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

Baselines are stored in `visual/baseline/`.

1. Compare against baselines (default):

```bash
npm run test:visual
```

On mismatch, the run writes debug images to `reports/visual/*.actual.png` and `reports/visual/*.diff.png`.

---

## 🧫 Test Data Strategy (Community Odoo)

This framework targets a **Community Odoo** environment and uses an
**environment-driven, strategy-based** approach for test data.

- Tests read credentials/URLs from environment variables (`.env` locally, CI secrets in pipelines).
- Data setup/cleanup should be **selectable per environment** (local docker vs shared QA vs CI)
  and **safe by default**.
- The scripts `npm run db:seed` and `npm run db:clean` are placeholders for the strategy layer;
  implementation and hardening come in Deliverable 2.

---

## 🔐 Secrets & environment variables

- Store secrets in environment variables (local `.env` file or CI secret store).
- Do **not** commit `.env` files; use `.env.example` as the template.
- CI should inject `ODOO_USERNAME`, `ODOO_PASSWORD`, DB credentials, etc. via repository/environment secrets.

### Error Screenshots

When a test fails, a screenshot is automatically saved in the folder:

```text
reports/screenshots/
```

This makes debugging much easier — you can see exactly what the screen looked like when the error occurred.

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

> 💡 **For test writers:** Focus on the `features/` folder — that's where all the test scenarios live!

---

## 📚 Documentation for Different Roles

| Document | Who It's For | What's Inside |
| --- | --- | --- |
| **[STEP_LIBRARY.md](docs/STEP_LIBRARY.md)** | Product Owners, Business Analysts | List of all available test steps — write tests without coding! |
| **[RUNBOOK.md](docs/RUNBOOK.md)** | Anyone | Troubleshooting guide and common fixes |
| **[BDD_ARCHITECTURE.md](docs/BDD_ARCHITECTURE.md)** | QA Engineers, Developers | 3-Layer BDD architecture (Atomic → Domain → Composite) |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | QA Engineers, Developers | Complete framework architecture (8-layer structure) |
| **[API_TESTING.md](docs/API_TESTING.md)** | QA Engineers | Guide for API testing |
| **[MOBILE_STRATEGY.md](docs/MOBILE_STRATEGY.md)** | QA Engineers | Mobile testing roadmap |
| **[DATA_STRATEGY.md](docs/DATA_STRATEGY.md)** | QA Engineers | Test data management |
| **[CTI_STRATEGY.md](docs/CTI_STRATEGY.md)** | QA Engineers | Computer Telephony Integration testing |

---

## 🚛 HOS/ELD Compliance Testing Architecture

The framework includes a **deterministic Hours-of-Service (HOS) compliance engine** for testing FMCSA regulations
without real-time waits or hardware ELD devices.

### Key Components

```text
┌──────────────────────────────────────────────────┐
│         HOS Compliance Test Layer                │
│  (hos-compliance.steps.ts)                       │
└────────────────────┬─────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ↓                       ↓
┌─────────────────┐    ┌──────────────────┐
│  HosService     │    │  VirtualClock    │
│  (src/helpers)  │    │  (src/helpers)   │
└────────┬────────┘    └────────┬─────────┘
         │                      │
         ↓                      ↓
┌──────────────────┐   ┌──────────────────┐
│  HosCalculator   │   │  TimeSource      │
│  (compliance     │   │  (interface)     │
│   calculations)  │   │                  │
└──────────────────┘   └──────────────────┘
         │
         ↓
┌──────────────────┐
│  EldProvider     │ ←──── Interface
│  (src/api)       │
└────────┬─────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌────────────┐
│EldMock  │ │ EldApi     │
│Client   │ │ Client     │
│(demo)   │ │(real HW)   │
└─────────┘ └────────────┘
```

### VirtualClock — Deterministic Time Control

**Purpose:** Simulate hours/days instantly without `setTimeout` or real-time waits.

**Key Features:**

- ✅ Advance time by minutes: `clock.advanceMinutes(480)` → instantly jumps 8 hours ahead
- ✅ No flaky tests from real time delays
- ✅ Tests run in seconds instead of hours
- ✅ TypeScript type-safe with proper interface narrowing

**Example Usage:**

```typescript
// Create virtual clock starting at specific timestamp
const clock = new VirtualClock(Date.parse('2026-01-01T08:00:00Z'));

// Simulate 10 hours of driving instantly
await eldMock.simulateDriving('DRIVER-001', 600); // 600 minutes

// Clock automatically advances, HOS calculations update
```

**Recent Improvements:**

- Fixed TypeScript type narrowing for `advanceMinutes()` method (eliminated unsafe casts)
- Improved type safety with proper `TimeSource` interface checking

### EldMockClient — In-Memory ELD Simulator

**Purpose:** Mock Electronic Logging Device without hardware or cloud services.

**Capabilities:**

- Record duty status events (DRIVING, ON_DUTY, OFF_DUTY, SLEEPER_BERTH)
- Simulate driving/rest periods with VirtualClock integration
- Inject malfunctions for compliance testing
- Generate DOT inspection reports (USB format)
- Chronological validation (rejects out-of-order events)

### HosCalculator — FMCSA Rules Engine

**Purpose:** Pure calculation logic for Hours-of-Service compliance.

**Implements:**

- 11-hour driving limit
- 14-hour on-duty limit
- 70-hour/8-day limit
- 34-hour restart rules
- Break requirements

**Benefits:**

- ✅ Deterministic: same inputs = same outputs
- ✅ No side effects or external dependencies
- ✅ Easy to test and verify
- ✅ Portable to any project

### Testing HOS Compliance

**Feature File Example:**

```gherkin
@hos @compliance
Scenario: Driver exceeds 11-hour driving limit
  Given driver "D1" starts OFF_DUTY for 600 minutes
  When driver "D1" starts DRIVING for 660 minutes
  Then HOS service should report violation "DRIVING_LIMIT_EXCEEDED"
  And remaining drive time should be 0 minutes
```

**Behind the Scenes:**

1. VirtualClock advances 660 minutes instantly
2. EldMockClient records events with virtual timestamps
3. HosCalculator evaluates FMCSA rules
4. HosService returns violation status

**No real waits. No hardware. Fully deterministic.**

### Configuration

```bash
# .env settings for HOS/ELD
DEMO_MODE=true              # Enable demo/mock mode
ELD_MODE=mock               # Use EldMockClient (vs "api" for real hardware)
TIMEZONE=America/New_York   # IANA timezone for HOS calculations
HOS_RULESET=FMCSA          # Currently FMCSA only
```

### Related Files

| File | Location | Purpose |
| --- | --- | --- |
| `VirtualClock.ts` | `src/helpers/` | Deterministic time control |
| `HosCalculator.ts` | `src/helpers/` | FMCSA compliance calculations |
| `HosService.ts` | `src/helpers/` | High-level HOS service |
| `EldProvider.ts` | `src/api/clients/` | ELD interface |
| `EldMockClient.ts` | `src/api/clients/` | Mock ELD implementation |
| `EldApiClient.ts` | `src/api/clients/` | Real hardware adapter stub |
| `hos-compliance.steps.ts` | `src/steps/domain/` | Gherkin step definitions |
| `hos_compliance.feature` | `features/integration/` | HOS test scenarios |

---

## ✍️ Writing Tests

Tests are written in **Gherkin** — a simple English-like language that anyone can read and write!

### Example Test

```gherkin
@smoke
Feature: Vehicle Management
  As a fleet manager
  I want to see all vehicles
  So that I can manage my fleet

  Scenario: View the vehicles list
    Given Odoo is accessible at "http://localhost:8069"
    When I navigate to "Vehicles" page
    Then I should see "Vehicles" text
```

### Understanding the Format

| Part | What It Means |
| --- | --- |
| `@smoke` | Tag for grouping (you can run all @smoke tests together) |
| `Feature:` | The area being tested |
| `Scenario:` | One specific test case |
| `Given` | Setup / starting condition |
| `When` | Action you're testing |
| `Then` | Expected result |

### Common Test Steps (Quick Reference)

**Navigation:**

- `Given Odoo is accessible at "http://localhost:8069"` — verify system is up
- `When I navigate to "Vehicles" page` — go to a page
- `When I click "Create" button` — click a button

**Filling Forms:**

- `When I fill "Name" with "John Doe"` — enter text
- `When I select "Truck" from "Type" dropdown` — select from dropdown

**Checking Results:**

- `Then I should see "Success" text` — verify text is visible
- `Then I should see "Save" button` — verify button exists

> 📖 **Full reference:** See [STEP_LIBRARY.md](docs/STEP_LIBRARY.md) for all available steps!

---

## 🧪 Command Reference (Complete List)

### Test Execution

| Command | Description |
| --- | --- |
| `npm run test:smoke` | Run smoke tests (quick validation) |
| `npm run test:api` | Run API tests only |
| `npm run test:api:smoke` | Run API smoke tests |
| `npm run test:web` | Run web UI tests |
| `npm run test:integration` | Run integration tests |
| `npm run test:security` | Run security tests |
| `npm run test:tablet` | Run all tablet tests |
| `npm run test:tablet:galaxy` | Run Galaxy Tab specific tests |
| `npm run test:tablet:ipad` | Run iPad Mini specific tests |
| `npm run test:tablet:offline` | Run tablet offline sync tests |
| `npm run test:accessibility` | Run accessibility tests |
| `npm run test:all` | Run full regression suite (parallel) |
| `npm run test:nightly` | Run smoke + API + integration |
| `npm run test:module:finance` | Run finance compliance scenarios |
| `npm run test:module:offline` | Run offline sync scenarios |
| `npm run test:module:cti` | Run CTI screen pop scenarios |

### Performance Testing

| Command | Description |
| --- | --- |
| `npm run perf:k6:smoke` | Run k6 smoke test (1 min, 10 VUs) |
| `npm run perf:k6:load` | Run k6 load test (9 min, staged load) |

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

### Data Management

| Command            | Description                               |
| ------------------ | ----------------------------------------- |
| `npm run db:seed`  | Seed test data (100 vehicles, 50 drivers) |
| `npm run db:clean` | Clean up test data                        |

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

### Markdown Linting

Markdown documentation follows strict style rules via [markdownlint](https://github.com/DavidAnson/markdownlint).

**Check Markdown files:**

```bash
npx markdownlint-cli "**/*.md" --config .markdownlint.json
```

**Auto-fix Markdown issues:**

```bash
npx markdownlint-cli "**/*.md" --config .markdownlint.json --fix
```

**Configuration:**

- Config file: [.markdownlint.json](.markdownlint.json)
- Line length: 120 characters (MD013)
- Tables and code blocks excluded from line length checks
- Enforces blank lines around lists, headings, and fenced code blocks
- Requires language identifiers for code fences

**Common rules:**

- `MD031/MD032`: Blank lines around fences and lists
- `MD040`: Language specified for code blocks
- `MD013`: Line length limit
- `MD022`: Blank lines around headings

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Remove volumes (reset database)
docker-compose down -v
```

## 🔧 Configuration

### Environment Variables (.env)

| Variable                | Default                 | Description                                  |
| ----------------------- | ----------------------- | -------------------------------------------- |
| `BASE_URL`              | `http://localhost:8069` | Odoo base URL                                |
| `ODOO_USERNAME`         | `admin`                 | Odoo username for UI/API                     |
| `ODOO_PASSWORD`         | `admin`                 | Odoo password for UI/API                     |
| `ODOO_DATABASE`         | `logistics_qa_db`       | Odoo database name                           |
| `HEADLESS`              | `false`                 | Run browser headless                         |
| `BROWSER`               | `chromium`              | Browser type                                 |
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
| `LOG_LEVEL`             | `info`                  | Log level (`debug`/`info`/`warn`/`error`)    |
| `VERBOSE`               | `false`                 | Enable verbose logging                       |

### ENV Contract (Integration Modules)

These environment variables are required by the integration modules added under `features/api`, `features/mobile`, and `features/web`.

| Variable | Required By | Notes |
| --- | --- | --- |
| `API_BASE_URL` | Financial Compliance, Offline Sync | Base URL for REST services under test |
| `API_AUTH_TOKEN` | Financial Compliance, Offline Sync | Bearer token value (without the `Bearer` prefix) |
| `FINANCE_SALARY_ENDPOINT` | Financial Compliance | Salary endpoint path or absolute URL |
| `FINANCE_IFTA_ENDPOINT` | Financial Compliance | IFTA endpoint path or absolute URL |
| `LOAD_STATUS_ENDPOINT` | Offline Sync | Polling endpoint for sync status (path or absolute URL) |
| `ODOO_BASE_URL` | Offline Sync, CTI Screen Pop | Odoo web base URL for UI login |
| `ODOO_USER` | Offline Sync, CTI Screen Pop | Odoo UI username |
| `ODOO_PASS` | Offline Sync, CTI Screen Pop | Odoo UI password |
| `CTI_WS_PATTERN` | CTI Screen Pop | WebSocket URL match pattern used by `page.routeWebSocket()` (supports `*` wildcards or `/regex/flags`) |
| `DEMO_MODE` | HOS / ELD | Enable demo-only behavior (default `true`) |
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

## 📝 Writing Tests

### Feature File Example

```gherkin
@smoke
Feature: My Feature
  As a user
  I want to do something
  So that I achieve a goal

  Scenario: My scenario
    Given Odoo is accessible at "http://localhost:8069"
    When I navigate to "Vehicles" page
    Then I should see "Vehicles" text
```

### Available Steps

**Navigation:**

- `Given Odoo is accessible at {string}`
- `When I navigate to {string} page`
- `When I click {string} link`
- `When I refresh the page`

**Interaction:**

- `When I click {string} button`
- `When I fill {string} with {string}`
- `When I select {string} from {string} dropdown`
- `When I check {string} checkbox`

**Assertions:**

- `Then I should see {string} text`
- `Then I should see {string} button`
- `Then {string} field should contain {string}`
- `Then I should be in form view`

## 🔍 Debugging

### Use Playwright Codegen

```bash
npx playwright codegen http://localhost:8069
```

### Run Single Scenario

```bash
npx cucumber-js --name "Access Vehicles page"
```

### Run with Tags

```bash
npx cucumber-js --tags "@critical"
npx cucumber-js --tags "@smoke and not @skip"
```

## 🛠 Troubleshooting

### ❌ "Odoo not accessible" or page won't load

| Try This | How |
| --- | --- |
| 1. Check Docker is running | Look for the whale icon in your system tray |
| 2. Check containers are up | Run `docker-compose ps` — you should see "Up" status |
| 3. Wait longer | First startup can take 1-2 minutes |
| 4. Check logs | Run `docker-compose logs odoo` to see errors |
| 5. Restart Docker | Run `docker-compose down` then `npm run docker:start` |

### ❌ Tests failing — "element not found"

| Try This | How |
| --- | --- |
| 1. Run with visible browser | Use `$env:HEADLESS="false"; npm run test:smoke` |
| 2. Check element exists | Look at the page — is the button/field actually there? |
| 3. Update selectors | UI may have changed — run `npx playwright codegen http://localhost:8069` |

### ❌ "npm command not found"

Node.js may not be installed correctly:

1. Download from [nodejs.org](https://nodejs.org/)
2. Close and reopen PowerShell
3. Test with `node --version` — should show a version number

### ❌ TypeScript errors

```bash
npm run type-check
```

If you see errors, try:

```bash
npm install
npm run build
```

---

## 📊 Test Reports

Reports are automatically generated when you run tests:

| Report Type | Location | How to View |
| --- | --- | --- |
| **Cucumber HTML** | `reports/cucumber/index.html` | Open file in browser |
| **Error screenshots** | `reports/screenshots/` | Open images to see failures |
| **Allure Report** | `allure-report/` | Run `npm run report:allure:open` |

### Recommended Workflow

```bash
# 1. Run your tests
npm run test:api

# 2. View the report with trend history
npm run report:allure:trend:open
```

The Allure report will open in your browser showing:

- Pass/fail summary
- Trend charts (if you have history)
- Detailed step-by-step execution
- Screenshots for failed tests

---

## 🏷 Test Tags Quick Reference

Use tags to run specific groups of tests:

| Tag | What It Runs | Command |
| --- | --- | --- |
| `@smoke` | Quick sanity checks | `npx cucumber-js --tags "@smoke"` |
| `@critical` | Business-critical paths | `npx cucumber-js --tags "@critical"` |
| `@api` | API tests only | `npx cucumber-js --tags "@api"` |
| `@tablet` | Tablet device tests | `npx cucumber-js --tags "@tablet"` |
| `@skip` | (Skips the test) | — |

**Combining tags:**

```bash
# Run smoke tests except skipped ones
npx cucumber-js --tags "@smoke and not @skip"

# Run either critical or smoke tests
npx cucumber-js --tags "@critical or @smoke"
```

---

## 📞 Need Help

| Question | Where to Look |
| --- | --- |
| "What steps can I use?" | [STEP_LIBRARY.md](docs/STEP_LIBRARY.md) |
| "Something's broken!" | [RUNBOOK.md](docs/RUNBOOK.md) or Troubleshooting section above |
| "I found a bug" | Open an issue in the GitHub repository |
| "I need a new feature" | Contact the QA team or open a feature request |

---

## 🎉 Happy Testing

Remember:

- Start with `npm run test:smoke` to verify everything works
- Use visible browser mode (`HEADLESS=false`) when debugging
- Check the [STEP_LIBRARY.md](docs/STEP_LIBRARY.md) for all available test steps
- When in doubt, check the [RUNBOOK.md](docs/RUNBOOK.md)
