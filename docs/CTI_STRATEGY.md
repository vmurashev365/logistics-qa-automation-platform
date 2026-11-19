# CTI testing strategy

`npm run test:module:cti` selects three Fleet call-lifecycle scenarios and one browser screen-pop scenario.
They exercise different parts of the dispatch workflow.

## Fleet call lifecycle

Use `npm run test:module:cti -- --tags @cti-integration` for the three vehicle-lifecycle scenarios.
Set `CTI_MODE=mock` (the default). The Cucumber hooks create an `AsteriskMockClient` in the test process.
The scenarios simulate incoming calls, inspect the event log and check caller associations set up during
the scenario. They use the configured Odoo instance for Fleet setup. Call events require no PBX connection.
[Scenarios](../features/integration/vehicle-lifecycle.feature) · [Mock client](../src/api/clients/AsteriskMockClient.ts)

## Browser screen pop

Use `npm run test:module:cti -- --tags @web` for the dispatcher UI scenario. It also runs in `npm run test:web`.
Configure a CTI-enabled Odoo frontend and a contact whose `phone` or `mobile` matches `+18005551234`.
The dispatcher step signs in using `BASE_URL`, `ODOO_USERNAME` and `ODOO_PASSWORD`.

1. After login the step installs a Playwright WebSocket route using `CTI_WS_PATTERN`. The frontend must open
   a matching connection after installation. The template uses the URL fragment `/ws/cti`.
2. The mock sends an `incoming_call` event containing the caller ID and a timestamp.
3. The scenario checks the Incoming Call modal, looks up the contact in `res.partner`, and checks that
   the modal shows that contact's name.

If injection times out, check the connection URL and when the frontend opens it. If the contact lookup fails,
check the phone number in the configured database. A separate mock HTTP server is unnecessary for both suites.
[Browser scenario](../features/web/cti_screen_pop.feature) · [WebSocket route](../src/helpers/CtiWebSocketMock.ts)

## Future PBX integration

Testing outbound dialing, IVR, call transfer and conference calls with real telephony would require
a PBX adapter, credentials and a test line. These are proposed extensions. Current automated evidence covers
the simulated call events and, on a compatible frontend, the incoming-call modal.
