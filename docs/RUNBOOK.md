# QA framework runbook

## Local startup

From a fresh checkout, install Node.js 20 or later, start Docker, and run the following from the repository root.
The Docker npm scripts use `docker-compose`. If your installation uses `docker compose`, run `docker compose up -d`.

```powershell
npm ci
npx playwright install chromium
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm run docker:start
docker compose ps
```

On Linux or macOS, use `cp -n .env.example .env` for the configuration file. Wait for a successful response from
[Odoo health](http://localhost:8069/web/health). Check the Fleet login at `/web/login` using the configured
credentials. Compose initializes Odoo 17 with Fleet demo data on port 8069 and PostgreSQL 15 on port 5432.

## Select a test

| Task | Command |
| --- | --- |
| Inspect the smoke selection without executing steps | `npm run test:smoke -- --dry-run` |
| Open the Vehicles page in one scenario | `npm run test:smoke -- --tags @smoke-001` |
| Run the CI smoke suite locally | `npm run test:smoke` |
| Exercise Fleet web scenarios | `npm run test:web -- --tags @fleet` |
| Check responsive layouts on the local Fleet UI | `npm run test:tablet -- --tags @quick-check` |
| Exercise the mock HOS rules | `npm run test:integration -- --tags @hos` |

Cucumber adds positional file arguments to the configured `features/**/*.feature` glob. Specifying a file and
line can still select scenarios in other files. Use a unique tag or an anchored scenario name and inspect the
dry-run summary when narrowing the run. In a dry run, `skipped` is expected for bound steps. Look for `undefined`
and `ambiguous` in the output. The [suite table](../README.md) lists dependencies for optional modules.

## Diagnose a local failure

- **Odoo startup.** Check `docker compose ps` and `docker compose logs postgres`. The local Odoo configuration writes
  its application log inside the container. Read it with `docker compose exec odoo tail -n 100 /var/log/odoo/odoo.log`.
- **Authentication.** Check `BASE_URL`, `ODOO_DATABASE`, `ODOO_USERNAME` and `ODOO_PASSWORD`. Both browser login and
  JSON-RPC use these values. Named-user login steps use the corresponding `USER_<LOGIN>_PASSWORD`.
- **Browser startup.** Install the browser selected by `BROWSER`. Cucumber defaults to Chromium in headed mode.
  In PowerShell, set `$env:HEADLESS = 'true'` for headless execution. In Bash, use `HEADLESS=true npm run test:smoke`.
- **Timing and selectors.** `DEBUG_TIMING=true` logs step durations. `SLOW_MO` slows browser actions and `TIMEOUT`
  sets their default timeout in milliseconds. Individual Cucumber steps can specify their own timeout.
  Check the failed step, screenshot and corresponding [page object](../src/pages) before changing a timeout.
- **Reporting.** Open `reports/cucumber/cucumber-report.html` after a run. Use `npm run report:cucumber` to build
  `reports/cucumber/index.html` from the JSON results. For Allure install Java and run `npm run report:allure:trend:open`.
  Look in `reports/screenshots/` for failure screenshots and `reports/videos/` if `VIDEO_RECORDING=true`.
- **Security audit log.** The failed-login audit scenario reads `ODOO_LOG_FILE` in `ODOO_CONTAINER`. The local
  defaults are `/var/log/odoo/odoo.log` and `logistics-qa-odoo`. An explicitly empty `ODOO_LOG_FILE` selects
  the container output for deployments that log to stdout or stderr.
- **Undefined steps.** Compare the phrase to a registered definition. Some BOL and offline POD scenarios have gaps
  even on a configured Loads deployment. See the [step library](STEP_LIBRARY.md) and [mobile strategy](MOBILE_STRATEGY.md).

## Database checks

The default is `DB_ENABLED=true`. Configure `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DATABASE`,
`POSTGRES_USER` and `POSTGRES_PASSWORD` for direct checks. They must point to the database used by Odoo.
For the bundled stack, check connectivity from the PostgreSQL container with the following command.

```bash
docker compose exec postgres psql -U odoo -d logistics_qa_db -c "SELECT current_database()"
```

For leftover test records, review `npm run db:clean -- --dry-run` before using `npm run db:clean` on the
dedicated test database. `npm run docker:stop` preserves volumes. `npm run docker:reset` removes them and
starts a fresh stack. See the [data strategy](DATA_STRATEGY.md) for cleanup scope.

## Build and configuration reference

Use `npm run type-check` to check TypeScript and `npm run lint` to run ESLint.
The [environment template](../.env.example), [npm scripts](../package.json) and
[CI workflow](../.github/workflows/ci.yml) define the settings used by the project.
