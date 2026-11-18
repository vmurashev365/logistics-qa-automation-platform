# API testing

The Fleet suite uses Odoo JSON-RPC to create, read, update and delete records. The finance and load-status
integrations use REST. Cucumber hooks launch the configured Playwright browser even for API scenarios,
so install that browser as part of local setup.

| Task | Command |
| --- | --- |
| Run the core Fleet API suite | `npm run test:api` |
| Run the vehicle-list smoke scenario | `npm run test:api:smoke` |
| Run the Fleet creation scenario | `npm run test:api -- --tags @api-002` |
| Compare salary and IFTA calculations to a configured REST service | `npm run test:module:finance` |

## Odoo JSON-RPC

`OdooJsonRpcClient.authenticate(db, login, password)` establishes a session. The hooks initialize the client
from `BASE_URL`, `ODOO_DATABASE`, `ODOO_USERNAME` and `ODOO_PASSWORD`. Its `searchRead` method accepts
a model, domain, fields and optional pagination/context. `create` returns a record ID. `write` and `unlink`
take arrays of IDs. Use `call(model, method, args, kwargs)` for another public model method. Odoo RPC errors
are raised as `OdooApiError`. [Client](../src/api/clients/OdooJsonRpcClient.ts)

```gherkin
Feature: Fleet API operations
  Background:
    Given Odoo API is authenticated

  Scenario: Create vehicle via API
    When I create vehicle via API with:
      | license_plate | MD-API-001 |
      | active        | true       |
    Then the vehicle created via API should be stored in Odoo with:
      | license_plate | MD-API-001 |
      | active        | true       |
```

The Fleet-specific creation step supplies a model through `FleetEndpoints`, tracks the plate for cleanup,
and records the returned ID. The final step reads the persisted fields. For a raw `fleet.vehicle` creation,
supply the required `model_id`. More examples cover updates, searches and deletion in the
[Fleet feature](../features/api/fleet-api.feature) and [adapter](../src/api/endpoints/FleetEndpoints.ts).

### Reading Fleet records from a step

The authenticated client accepts an array of IDs in `read`. Odoo's default searches omit archived records.
Pass `active_test: false` when a check needs to distinguish an archived vehicle from a deleted vehicle.

```typescript
const records = await this.odooApi.searchRead(
  'fleet.vehicle',
  [['license_plate', '=', plate]],
  ['id', 'license_plate', 'model_id', 'active'],
  { context: { active_test: false } }
);
```

## REST responses and retries

`RestApiClient` returns an object with `status`, `headers` and `body`. A completed HTTP response with status
401, 404 or 500 follows this same path. Inspect `response.status` to decide how to handle it. Network, timeout
or parsing errors can throw and enter the retry helper. The default is three total attempts.
A returned HTTP 500 does not trigger that retry. [REST client](../src/api/clients/RestApiClient.ts)

For example, inside a step using the configured REST client and a service-specific endpoint:

```typescript
const response = await this.restApi.get(endpoint);
expect(response.status).toBe(200);
```

The Gherkin assertion `Then API response status should be 200` requires an HTTP result. For JSON-RPC use
assertions on the returned records or on values read back from Odoo. [API steps](../src/steps/atomic/api.steps.ts)

## Optional services

Finance requires `API_AUTH_TOKEN`, `FINANCE_SALARY_ENDPOINT` and `FINANCE_IFTA_ENDPOINT`. Browser
load/POD sync requires `API_AUTH_TOKEN` and `LOAD_STATUS_ENDPOINT` as well as the corresponding UI.
Set `API_BASE_URL` when the service runs separately from Odoo. The default is `BASE_URL`.
Supply the token without the `Bearer` prefix. The stock Compose stack provisions Odoo and PostgreSQL.
See the [environment contract](../src/helpers/service-env.ts) and [mobile strategy](MOBILE_STRATEGY.md).
