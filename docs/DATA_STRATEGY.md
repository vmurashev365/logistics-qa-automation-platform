# Test data management

The local Compose stack initializes Odoo with Fleet demo data. Smoke uses these reference records and creates
scenario-specific vehicles when it needs them. Use a dedicated test database. Keep credentials in the environment
or local `.env`. See the [environment template](../.env.example).

## Scenario lifecycle

1. Before each scenario the hook looks for exact `MD-` plates in the compiled steps' quoted arguments and table
   cells. It removes matching active and archived vehicles and related history from previous runs.
2. Steps can create vehicles through Fleet's JSON-RPC adapter or through the UI. Odoo requires `model_id`.
   The Fleet creation adapter supplies a model if omitted. In the UI, select a model before saving.
3. At teardown the hook deletes tracked vehicles and runs registered cleanup callbacks, including callbacks for
   contacts or settings changed by the scenario. Cleanup failures are logged. Give concurrent scenarios distinct
   plates, and avoid overlapping runs against the same data.

Fuel and inspection scenarios can use `RUN_SUFFIX` or a suffix derived from `TEST_RUN_ID` to distinguish test
vehicles. See the [hooks](../src/support/hooks.ts), [World](../src/support/custom-world.ts) and
[identifier helper](../src/helpers/test-run.ts).

## Seed fixtures

```bash
npm run db:seed
```

The script authenticates with `BASE_URL`, `ODOO_DATABASE`, `ODOO_USERNAME` and `ODOO_PASSWORD`. It creates or
reuses the `MD-TestFleet` brand and `TestTruck` model. Each invocation creates five driver contacts with
`@test-logistics.local` addresses and ten vehicles numbered `MD-TEST-001` through `MD-TEST-010`.
The first five vehicles receive the five drivers. Repeated runs can create duplicates. [Seed script](../scripts/seed-test-data.ts)

## Preview and clean

```bash
npm run db:clean -- --dry-run
```

Review the candidates, then run `npm run db:clean` to remove them from the configured database.
The script uses Odoo JSON-RPC and the following filters.

- Vehicle plates beginning with `MD-` or `TRUCK-`, including archived vehicles. The adapter removes related
  driver history, odometer readings, service logs and contracts before unlinking vehicles.
- Partners matching the seed email domain, the explicit scenario-driver names, or the legacy `ANONYMIZED_%`
  name pattern. Archived partners are included.
- Vehicle models named `TestTruck` and brands named `MD-TestFleet`.

The filters match existing records regardless of which run created them. The security fixture user
`qa.fleet.user` is retained. Check the candidate list again after an interrupted cleanup.
[Cleanup script](../scripts/clean-test-data.ts) · [Fleet adapter](../src/api/endpoints/FleetEndpoints.ts)
