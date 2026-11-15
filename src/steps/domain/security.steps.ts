/**
 * Security Step Definitions
 * Steps for security testing scenarios
 * Covers authentication, authorization, session, input validation, GDPR and audit trail
 *
 * Every checking step reads what Odoo did (its JSON-RPC answer, its records, its server log,
 * the page it rendered) and fails from a comparison record attached to the step.
 */

import { randomBytes } from 'crypto';
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { getEnvConfig } from '../../support/env';
import { OdooJsonRpcClient } from '../../api/clients/OdooJsonRpcClient';
import { sleep } from '../../utils/wait';
import { UI_MAP, isValidPageKey, isValidFieldKey } from '../../ui-map';
import { verify, pollUntil, Check } from '../../support/evidence';
import { readOdooServerLog, findFailedLogins, parseOdooLogTimestamp } from '../../helpers/odoo-server-log';

const ODOO = 'Odoo JSON-RPC';
const PAGE = 'the page';

/** Odoo stores datetimes in UTC as "YYYY-MM-DD HH:MM:SS". */
function parseOdooDatetime(value: string): number {
  return Date.parse(`${value.replace(' ', 'T')}Z`);
}

/** Allowed clock difference between the test host and the Odoo container. */
const CLOCK_TOLERANCE_MS = 60_000;

// =============================================================================
// Navigation Steps
// =============================================================================

/**
 * Given I am on the {string} page
 * Navigates to a specific page by UI-MAP key
 */
Given('I am on the {string} page', { timeout: 15000 }, async function (this: CustomWorld, pageKey: string) {
  const baseUrl = this.getBaseUrl();

  // Get page path from UI-MAP or use default
  let pageUrl: string;
  if (isValidPageKey(pageKey)) {
    pageUrl = UI_MAP.pages[pageKey];
  } else {
    pageUrl = `/${pageKey}`;
  }

  const fullUrl = pageUrl.startsWith('/') || pageUrl.startsWith('http')
    ? (pageUrl.startsWith('http') ? pageUrl : `${baseUrl}${pageUrl}`)
    : `${baseUrl}/${pageUrl}`;

  await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
});

/**
 * When I navigate to {string}
 * Navigates to a URL path (without "page" suffix)
 */
When('I navigate to {string}', { timeout: 15000 }, async function (this: CustomWorld, urlPath: string) {
  const baseUrl = this.getBaseUrl();
  const fullUrl = urlPath.startsWith('/') ? `${baseUrl}${urlPath}` : `${baseUrl}/${urlPath}`;

  await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
});

// =============================================================================
// Form Field Steps (alternate formats)
// =============================================================================

/**
 * When I fill {string} field with {string}
 * Alternate format of fill step with "field" keyword
 */
When('I fill {string} field with {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  fieldKey: string,
  value: string
) {
  // Convert to field label using UI-MAP
  const fieldLabel = isValidFieldKey(fieldKey)
    ? UI_MAP.fields[fieldKey]
    : fieldKey;

  // Odoo field names (snake_case)
  const odooFieldName = fieldKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

  // Try textbox role first
  let filled = false;
  const textbox = this.page.getByRole('textbox', { name: new RegExp(fieldLabel, 'i') });
  if (await textbox.isVisible().catch(() => false)) {
    await textbox.fill(value);
    filled = true;
  }

  if (!filled) {
    // Try getByLabel
    const labelField = this.page.getByLabel(fieldLabel);
    if (await labelField.isVisible().catch(() => false)) {
      await labelField.fill(value);
      filled = true;
    }
  }

  if (!filled) {
    // Fall back to input by name (camelCase)
    const nameField = this.page.locator(`input[name="${fieldKey}"]`);
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill(value);
      filled = true;
    }
  }

  if (!filled) {
    // Try Odoo field name (snake_case), as an input or inside the field widget
    const snakeField = this.page.locator(`input[name="${odooFieldName}"], div[name="${odooFieldName}"] input`).first();
    await snakeField.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    if (await snakeField.isVisible().catch(() => false)) {
      await snakeField.fill(value);
      filled = true;
    }
  }

  if (!filled) {
    throw new Error(`Could not find field "${fieldKey}" to fill`);
  }
});

/**
 * Then page title should contain {string}
 * Verifies page title contains expected text
 */
Then('page title should contain {string}', async function (this: CustomWorld, expectedTitle: string) {
  await expect(this.page).toHaveTitle(new RegExp(expectedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), {
    timeout: 5000,
  });
});

// =============================================================================
// Authentication Steps
// =============================================================================

async function postJsonRpcWithoutSession(
  world: CustomWorld,
  path: string,
  params: Record<string, unknown>
): Promise<void> {
  // Plain fetch: no browser context and no cookie jar, so no session can leak into the call.
  const response = await fetch(`${world.getBaseUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params, id: 1 }),
  });
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  world.lastApiResponse = {
    kind: 'http',
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body,
  };
}

When(
  'I call {string} on {string} through JSON-RPC without a session',
  { timeout: 30000 },
  async function (this: CustomWorld, method: string, model: string) {
    await postJsonRpcWithoutSession(this, `/web/dataset/call_kw/${model}/${method}`, {
      model,
      method,
      args: [],
      kwargs: { fields: ['id', 'license_plate'], limit: 1 },
    });
  }
);

When(
  'I call {string} through JSON-RPC without a session',
  { timeout: 30000 },
  async function (this: CustomWorld, path: string) {
    await postJsonRpcWithoutSession(this, path, {});
  }
);

Then(
  'Odoo should refuse the call as {string} and return no data',
  function (this: CustomWorld, expectedMessage: string) {
    const result = this.lastApiResponse;
    const body = (result?.body ?? null) as {
      result?: unknown;
      error?: { data?: { name?: string; message?: string } };
    } | null;

    verify(this, `Odoo refuses the call without a session as "${expectedMessage}"`, [
      { what: 'HTTP response recorded', source: 'HTTP', expected: 'http', actual: result?.kind ?? null },
      { what: 'HTTP status (Odoo answers JSON-RPC errors with 200)', source: 'HTTP', expected: 200, actual: result?.kind === 'http' ? result.status : null },
      { what: 'exception', source: ODOO, expected: 'odoo.http.SessionExpiredException', actual: body?.error?.data?.name ?? null },
      { what: 'message', source: ODOO, expected: expectedMessage, actual: body?.error?.data?.message ?? null },
      { what: 'result returned', source: ODOO, expected: false, actual: body !== null && typeof body === 'object' && 'result' in body },
    ]);
  }
);

Then('the login page should say {string}', { timeout: 10000 }, async function (this: CustomWorld, message: string) {
  const alert = this.page.locator('form.oe_login_form .alert-danger').first();
  await alert.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);

  verify(this, `The login page says "${message}"`, [
    { what: 'login form alert', source: PAGE, expected: message, actual: (await alert.count()) > 0 ? (await alert.innerText()).trim() : null },
    { what: 'path', source: PAGE, expected: '/web/login', actual: new URL(this.page.url()).pathname },
  ]);
});

Then(
  'the browser should refuse to submit the login form with an empty {string} field',
  async function (this: CustomWorld, fieldName: string) {
    const input = this.page.locator(`form.oe_login_form input[name="${fieldName}"]`);

    verify(this, `The login form is not submitted with an empty "${fieldName}"`, [
      { what: `"${fieldName}" is required`, source: PAGE, expected: true, actual: (await input.getAttribute('required')) !== null },
      { what: `"${fieldName}" reported as missing by the browser`, source: PAGE, expected: true, actual: await input.evaluate((el) => (el as unknown as { validity: { valueMissing: boolean } }).validity.valueMissing) },
      { what: 'server error shown (form reached Odoo)', source: PAGE, expected: 0, actual: await this.page.locator('form.oe_login_form .alert-danger').count() },
    ]);
  }
);

Then('I should not be signed in', { timeout: 15000 }, async function (this: CustomWorld) {
  // The browser's own session, asked through its cookies.
  const response = await this.page.request.post(`${this.getBaseUrl()}/web/session/get_session_info`, {
    data: { jsonrpc: '2.0', method: 'call', params: {}, id: 1 },
  });
  const body = (await response.json().catch(() => null)) as {
    result?: { uid?: number | false };
    error?: { data?: { name?: string } };
  } | null;

  verify(this, 'The browser is not signed in to Odoo', [
    { what: 'path', source: PAGE, expected: '/web/login', actual: new URL(this.page.url()).pathname },
    { what: 'Odoo main navbar', source: PAGE, expected: 0, actual: await this.page.locator('.o_main_navbar').count() },
    { what: 'session user id', source: `${ODOO} (browser session)`, expected: null, actual: body?.result?.uid || null },
    { what: 'session answer', source: `${ODOO} (browser session)`, expected: 'odoo.http.SessionExpiredException', actual: body?.error?.data?.name ?? null },
  ]);
});

// =============================================================================
// Authorization Steps
// =============================================================================

const FLEET_USER_LOGIN = 'qa.fleet.user';

async function groupId(world: CustomWorld, module: string, name: string): Promise<number> {
  const found = await world.odooApi.searchRead<{ res_id: number }>(
    'ir.model.data',
    [['module', '=', module], ['name', '=', name], ['model', '=', 'res.groups']],
    ['res_id'],
    { limit: 1 }
  );
  if (found.length === 0) {
    throw new Error(`Odoo has no group ${module}.${name}`);
  }
  return found[0].res_id;
}

/**
 * Given I am signed in as a fleet user without administrator rights
 * Ensures the internal user qa.fleet.user exists with only "Internal User" and "Fleet: Officer"
 * rights, gives it a fresh random password for this scenario and signs in with it in the browser.
 */
Given('I am signed in as a fleet user without administrator rights', { timeout: 60000 }, async function (this: CustomWorld) {
  const internalUser = await groupId(this, 'base', 'group_user');
  const fleetUser = await groupId(this, 'fleet', 'fleet_group_user');
  const settings = await groupId(this, 'base', 'group_system');
  const accessRights = await groupId(this, 'base', 'group_erp_manager');

  // A new password every scenario; it lives only in memory and is never logged or attached.
  const password = randomBytes(18).toString('base64url');
  const groups = [[6, 0, [internalUser, fleetUser]]];
  const existing = await this.odooApi.searchRead<{ id: number }>(
    'res.users',
    [['login', '=', FLEET_USER_LOGIN]],
    ['id'],
    { limit: 1, context: { active_test: false } }
  );
  let userId: number;
  if (existing.length > 0) {
    userId = existing[0].id;
    await this.odooApi.write('res.users', [userId], { password, active: true, groups_id: groups });
  } else {
    userId = await this.odooApi.create('res.users', {
      name: 'QA Fleet User',
      login: FLEET_USER_LOGIN,
      password,
      groups_id: groups,
    });
  }

  const [user] = await this.odooApi.read<{ groups_id: number[] }>('res.users', [userId], ['groups_id']);
  verify(this, `User "${FLEET_USER_LOGIN}" has no administrator rights`, [
    { what: 'member of Administration/Settings', source: ODOO, expected: false, actual: user.groups_id.includes(settings) },
    { what: 'member of Administration/Access Rights', source: ODOO, expected: false, actual: user.groups_id.includes(accessRights) },
    { what: 'member of Fleet/Officer', source: ODOO, expected: true, actual: user.groups_id.includes(fleetUser) },
  ]);

  await this.loginPage.login(FLEET_USER_LOGIN, password, this.getBaseUrl());
  this.setTestData('username', FLEET_USER_LOGIN);
});

Then(
  'Odoo should show an {string} about {string} records',
  { timeout: 20000 },
  async function (this: CustomWorld, title: string, recordName: string) {
    const dialog = this.page.locator('.modal').filter({ has: this.page.locator('.modal-title', { hasText: title }) }).first();
    await dialog.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
    const shown = (await dialog.count()) > 0;
    const bodyText = shown ? (await dialog.locator('.modal-body').innerText()).trim() : null;

    verify(this, `Odoo shows "${title}" for "${recordName}" records`, [
      { what: 'dialog title', source: PAGE, expected: title, actual: shown ? (await dialog.locator('.modal-title').innerText()).trim() : null },
      {
        what: 'dialog names the records',
        source: PAGE,
        expected: `mentions '${recordName}'`,
        actual: bodyText,
        pass: bodyText?.includes(`'${recordName}'`) === true,
      },
    ]);
  }
);

Then('no system parameters should be listed', async function (this: CustomWorld) {
  verify(this, 'No system parameters are listed', [
    { what: 'list views', source: PAGE, expected: 0, actual: await this.page.locator('.o_list_view').count() },
    { what: 'rows', source: PAGE, expected: 0, actual: await this.page.locator('.o_data_row').count() },
  ]);
});

// =============================================================================
// Session Security Steps
// Note: Core session steps like "I logout" and "I should be on {string} page"
// are defined in auth.steps.ts and navigation.steps.ts
// =============================================================================

/**
 * Then I should be redirected to {string} page
 * Verifies redirect occurred to expected page
 */
Then('I should be redirected to {string} page', { timeout: 10000 }, async function (
  this: CustomWorld,
  pageName: string
) {
  await this.page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
  const url = this.page.url().toLowerCase();

  const pagePatterns: Record<string, string[]> = {
    'login': ['login', 'web/login'],
    'vehicles': ['fleet', 'vehicle'],
  };

  const patterns = pagePatterns[pageName] || [pageName];
  const isOnPage = patterns.some(pattern => url.includes(pattern.toLowerCase()));

  expect(isOnPage, `URL ${url} should match one of ${patterns.join(', ')}`).toBe(true);
});

/**
 * Then page URL should contain {string}
 * Verifies URL contains expected string
 */
Then('page URL should contain {string}', async function (this: CustomWorld, expectedText: string) {
  const url = this.page.url();
  expect(url.toLowerCase()).toContain(expectedText.toLowerCase());
});

// =============================================================================
// Input Validation Security Steps
// =============================================================================

// Note: "I search for {string}" step is defined in fleet.steps.ts and works for all scenarios

/**
 * Given the page is watched for script execution
 * Records every alert/confirm/prompt dialog the page opens from now on.
 */
Given('the page is watched for script execution', async function (this: CustomWorld) {
  const dialogs: string[] = [];
  this.page.on('dialog', (dialog) => {
    dialogs.push(`${dialog.type()}: ${dialog.message()}`);
    void dialog.dismiss().catch(() => undefined);
  });
  this.setTestData('pageDialogs', dialogs);
});

/**
 * Then no script from the license plate should have run
 * The plate payload sets window.__xss_triggered when it runs; dialogs are recorded by the watcher.
 */
Then('no script from the license plate should have run', async function (this: CustomWorld) {
  const dialogs = this.getTestData<string[]>('pageDialogs');
  if (!dialogs) {
    throw new Error('The page was not watched. Use: Given the page is watched for script execution');
  }

  verify(this, 'No script from the license plate ran', [
    {
      what: 'window.__xss_triggered',
      source: PAGE,
      expected: false,
      actual: await this.page.evaluate(() => (globalThis as { __xss_triggered?: boolean }).__xss_triggered === true),
    },
    { what: 'dialogs opened by the page', source: PAGE, expected: [], actual: [...dialogs] },
  ]);
});

/**
 * Then no database error should occur
 * Verifies no database error is displayed
 */
Then('no database error should occur', async function (this: CustomWorld) {
  verify(this, 'No database error is shown', [
    { what: 'error dialogs', source: PAGE, expected: 0, actual: await this.page.locator('.o_error_dialog').count() },
    {
      what: 'database error text',
      source: PAGE,
      expected: 0,
      actual: await this.page.getByText(/database error|sql error|internal server error|psycopg2/i).count(),
    },
  ]);
});

Then('Odoo should still answer vehicle queries through JSON-RPC', async function (this: CustomWorld) {
  const count = await this.fleetEndpoints.countVehicles();

  verify(this, 'Odoo still answers vehicle queries', [
    { what: 'fleet.vehicle search_count', source: ODOO, expected: 'a number', actual: count, pass: Number.isInteger(count) && count >= 0 },
  ]);
});

// =============================================================================
// Brute-force protection (login lockout)
//
// Odoo counts failed logins per source address (not per user) since the last successful
// login from that address. After `base.login_cooldown_after` failures (default 5) it refuses
// every login from the address, right password included, until
// `base.login_cooldown_duration` seconds (default 60) have passed since the last failure.
// =============================================================================

const LOCKOUT_AFTER = 'base.login_cooldown_after';
const LOCKOUT_DURATION = 'base.login_cooldown_duration';

/**
 * End a lockout this run may have left on our address: wait until Odoo accepts the
 * administrator's login again. A successful login also resets Odoo's failure count.
 */
async function waitUntilAdministratorCanSignIn(waitSeconds: number): Promise<void> {
  const env = getEnvConfig();
  const deadline = Date.now() + waitSeconds * 1000;
  for (;;) {
    try {
      const client = new OdooJsonRpcClient({ baseUrl: env.baseUrl, retries: 1 });
      await client.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
      return;
    } catch (error) {
      if (Date.now() > deadline) {
        throw new Error(
          `Odoo still refuses the administrator's login ${waitSeconds} s after the lockout: ${(error as Error).message}`
        );
      }
      await sleep(1000);
    }
  }
}

/**
 * Given Odoo is configured to lock out logins from one address after {int} failed attempts for {int} seconds
 * Sets Odoo's two lockout parameters for this scenario and restores them afterwards.
 */
Given(
  'Odoo is configured to lock out logins from one address after {int} failed attempts for {int} seconds',
  { timeout: 30000 },
  async function (this: CustomWorld, attempts: number, seconds: number) {
    const read = (key: string): Promise<string | false> =>
      this.odooApi.call<string | false>('ir.config_parameter', 'get_param', [key]);
    // set_param with false removes the parameter, which puts Odoo back on its default
    const write = (key: string, value: string | false): Promise<unknown> =>
      this.odooApi.call('ir.config_parameter', 'set_param', [key, value]);

    const original = { after: await read(LOCKOUT_AFTER), duration: await read(LOCKOUT_DURATION) };
    this.addCleanup('restore the login lockout settings', async () => {
      // First end the lockout while it is still short: restoring a longer duration while the
      // failures are still counted would lock this address out for that longer time.
      await waitUntilAdministratorCanSignIn(seconds + 10);
      await write(LOCKOUT_AFTER, original.after);
      await write(LOCKOUT_DURATION, original.duration);
    });

    await write(LOCKOUT_AFTER, String(attempts));
    await write(LOCKOUT_DURATION, String(seconds));

    verify(this, `Odoo locks out logins after ${attempts} failed attempts for ${seconds} seconds`, [
      { what: LOCKOUT_AFTER, source: ODOO, expected: String(attempts), actual: await read(LOCKOUT_AFTER) },
      { what: LOCKOUT_DURATION, source: ODOO, expected: String(seconds), actual: await read(LOCKOUT_DURATION) },
    ]);
    this.setTestData('lockoutSeconds', seconds);
  }
);

/**
 * When the login lockout period has passed
 * Waits until the configured lockout time has passed since the last failed login.
 */
When('the login lockout period has passed', { timeout: 90000 }, async function (this: CustomWorld) {
  const seconds = this.getTestData<number>('lockoutSeconds');
  const lastFailureAt = this.getTestData<number>('lastFailedLoginAt');
  if (seconds === undefined || lastFailureAt === undefined) {
    throw new Error('No lockout was configured or no failed login was attempted in this scenario');
  }
  // Odoo measures from the failure it recorded just before we saw the error; 1.5 s of margin.
  const waitMs = lastFailureAt + seconds * 1000 + 1500 - Date.now();
  if (waitMs > 0) {
    await sleep(waitMs);
  }
});

/**
 * Then I should be signed in as {string}
 * The web client is shown and the browser's own session belongs to the user.
 */
Then('I should be signed in as {string}', { timeout: 20000 }, async function (this: CustomWorld, login: string) {
  const navbar = this.page.locator('.o_main_navbar');
  await navbar.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  const response = await this.page.request.post(`${this.getBaseUrl()}/web/session/get_session_info`, {
    data: { jsonrpc: '2.0', method: 'call', params: {}, id: 1 },
  });
  const body = (await response.json().catch(() => null)) as { result?: { username?: string } } | null;

  verify(this, `The browser is signed in as "${login}"`, [
    { what: 'Odoo main navbar visible', source: PAGE, expected: true, actual: await navbar.isVisible() },
    { what: 'session user', source: `${ODOO} (browser session)`, expected: login, actual: body?.result?.username ?? null },
  ]);
  this.setTestData('username', login);
});

// =============================================================================
// GDPR / Data Privacy Steps
// =============================================================================

async function partnerIdByName(world: CustomWorld, name: string): Promise<number | null> {
  const partners = await world.odooApi.searchRead<{ id: number }>(
    'res.partner',
    [['name', '=', name]],
    ['id'],
    { limit: 1, order: 'id' }
  );
  return partners.length > 0 ? partners[0].id : null;
}

/**
 * Given driver {string} exists in the system
 * Ensures driver exists for GDPR tests
 */
Given('driver {string} exists in the system', { timeout: 30000 }, async function (
  this: CustomWorld,
  driverName: string
) {
  if ((await partnerIdByName(this, driverName)) === null) {
    await this.odooApi.create('res.partner', {
      name: driverName,
      email: `${driverName.toLowerCase().replace(/\s/g, '.')}@test.com`,
    });
  }
});

/**
 * Given driver {string} has personal data stored
 * Verifies the driver record holds personal data (an email address) before anonymisation.
 */
Given('driver {string} has personal data stored', async function (this: CustomWorld, driverName: string) {
  const id = await partnerIdByName(this, driverName);
  const [partner] = id === null ? [] : await this.odooApi.read<{ email: string | false }>('res.partner', [id], ['email']);

  verify(this, `Driver "${driverName}" has personal data`, [
    { what: 'partner record', source: ODOO, expected: true, actual: id !== null },
    { what: 'email', source: ODOO, expected: 'an email address', actual: partner?.email ?? null, pass: typeof partner?.email === 'string' && partner.email.length > 0 },
  ]);
  this.setTestData('gdprPartnerId', id);
});

/**
 * When I request data anonymization for driver {string}
 * Pending: Odoo 17 Community with Fleet has no anonymisation feature to request, and the step
 * must not rename the partner itself (that would test the test, not Odoo). The scenario is
 * tagged @wip and stays out of the suites until such a feature is installed and called here.
 */
When('I request data anonymization for driver {string}', function (this: CustomWorld, driverName: string) {
  this.attach(
    `Not automated: no data-anonymisation feature is installed in Odoo to request for "${driverName}".`,
    'text/plain'
  );
  return 'pending';
});

/**
 * Then driver {string} personal data should be anonymized
 * The driver's record no longer carries the original name or email.
 */
Then('driver {string} personal data should be anonymized', async function (this: CustomWorld, driverName: string) {
  const id = this.getTestData<number | null>('gdprPartnerId') ?? null;
  const [partner] = id === null ? [] : await this.odooApi.read<{ name: string; email: string | false }>('res.partner', [id], ['name', 'email']);

  verify(this, `Driver "${driverName}" is anonymised`, [
    { what: 'partner record', source: ODOO, expected: true, actual: partner !== undefined },
    { what: 'name differs from the original', source: ODOO, expected: `not "${driverName}"`, actual: partner?.name ?? null, pass: partner !== undefined && partner.name !== driverName },
    { what: 'email', source: ODOO, expected: false, actual: partner?.email ?? null },
  ]);
});

const EXPORT_PROFILE = {
  email: 'test.driver.export@test.com',
  phone: '+1234567890',
  street: '123 Test Street',
  city: 'Test City',
  countryCode: 'US',
};
const EXPORT_FIELDS = ['name', 'email', 'phone', 'street', 'city', 'country_id'] as const;

/**
 * Given driver {string} exists with full profile
 * Creates the driver, or resets an existing one, with a known full profile.
 */
Given('driver {string} exists with full profile', { timeout: 30000 }, async function (
  this: CustomWorld,
  driverName: string
) {
  const countries = await this.odooApi.searchRead<{ id: number }>('res.country', [['code', '=', EXPORT_PROFILE.countryCode]], ['id'], { limit: 1 });
  if (countries.length === 0) {
    throw new Error(`Odoo has no country with code ${EXPORT_PROFILE.countryCode}`);
  }
  const values = {
    email: EXPORT_PROFILE.email,
    phone: EXPORT_PROFILE.phone,
    street: EXPORT_PROFILE.street,
    city: EXPORT_PROFILE.city,
    country_id: countries[0].id,
  };

  let id = await partnerIdByName(this, driverName);
  if (id === null) {
    id = await this.odooApi.create('res.partner', { name: driverName, ...values });
  } else {
    await this.odooApi.write('res.partner', [id], values);
  }
  this.setTestData('exportPartnerId', id);
});

/**
 * When I export driver {string} with Odoo's data export
 * Uses export_data, the method behind Odoo's "Export" action.
 */
When("I export driver {string} with Odoo's data export", { timeout: 30000 }, async function (
  this: CustomWorld,
  driverName: string
) {
  const id = await partnerIdByName(this, driverName);
  if (id === null) {
    throw new Error(`Driver "${driverName}" does not exist`);
  }
  const exported = await this.odooApi.call<{ datas: unknown[][] }>('res.partner', 'export_data', [[id], [...EXPORT_FIELDS]]);
  this.setTestData('exportPartnerId', id);
  this.setTestData('exportedRows', exported.datas);
});

/**
 * Then the export should contain the stored name, email, phone, street, city and country of driver {string}
 * Compares each exported column with what Odoo stores for the driver.
 */
Then(
  'the export should contain the stored name, email, phone, street, city and country of driver {string}',
  { timeout: 30000 },
  async function (this: CustomWorld, driverName: string) {
    const id = this.getTestData<number>('exportPartnerId');
    const rows = this.getTestData<unknown[][]>('exportedRows');
    if (id === undefined || !rows) {
      throw new Error(`Driver "${driverName}" was not exported in this scenario`);
    }
    const [stored] = await this.odooApi.read<Record<string, unknown>>('res.partner', [id], [...EXPORT_FIELDS]);
    const storedValue = (field: string): unknown => {
      const value = stored[field];
      return Array.isArray(value) ? value[1] : value;
    };

    const checks: Check[] = [
      { what: 'exported rows', source: 'export_data', expected: 1, actual: rows.length },
      { what: 'stored name', source: ODOO, expected: driverName, actual: stored.name },
      { what: 'stored email', source: ODOO, expected: EXPORT_PROFILE.email, actual: stored.email },
    ];
    EXPORT_FIELDS.forEach((field, column) => {
      checks.push({ what: field, source: 'export_data vs stored record', expected: storedValue(field), actual: rows[0]?.[column] ?? null });
    });
    verify(this, `The export of driver "${driverName}" holds the stored personal data`, checks);
  }
);

// =============================================================================
// Audit Trail Steps
// =============================================================================

/**
 * When I create a vehicle with plate {string}
 * Creates a vehicle through the vehicle form, with an existing model
 */
When('I create a vehicle with plate {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  plate: string
) {
  await this.vehiclesListPage.clickCreateVehicle();
  await this.vehicleFormPage.waitForFormReady();
  await this.vehicleFormPage.fillField('licensePlate', plate);
  await this.vehicleFormPage.chooseModel('Audi/A1');
  await this.vehicleFormPage.clickSave();

  // Store for cleanup
  this.trackVehicle(plate);
  this.setTestData('auditTestVehicle', plate);
});

/**
 * Then the history of vehicle {string} should record {string} by the signed-in user during this scenario
 * Reads the vehicle's chatter (mail.message), Odoo's record history.
 */
Then(
  'the history of vehicle {string} should record {string} by the signed-in user during this scenario',
  { timeout: 30000 },
  async function (this: CustomWorld, plate: string, entry: string) {
    const startedAt = this.getTestData<number>('scenarioStartedAt') ?? 0;
    const login = this.getTestData<string>('username');
    if (!login) {
      throw new Error('Nobody signed in during this scenario');
    }

    const vehicles = await pollUntil(
      () => this.fleetEndpoints.findVehiclesByPlateIncludingArchived(plate),
      (found) => found.length > 0
    );
    const vehicleId = vehicles[0]?.id;
    const users = await this.odooApi.searchRead<{ partner_id: [number, string] }>('res.users', [['login', '=', login]], ['partner_id'], { limit: 1 });
    const messages = vehicleId === undefined
      ? []
      : await this.odooApi.searchRead<{ body: string; date: string; author_id: [number, string] | false }>(
          'mail.message',
          [['model', '=', 'fleet.vehicle'], ['res_id', '=', vehicleId]],
          ['body', 'date', 'author_id'],
          { order: 'id' }
        );
    const recorded = messages.filter((message) => message.body.replace(/<[^>]+>/g, '').trim() === entry);
    const first = recorded[0];
    const at = first ? parseOdooDatetime(first.date) : null;

    verify(this, `The history of vehicle "${plate}" records "${entry}"`, [
      { what: 'vehicles with this plate', source: ODOO, expected: 1, actual: vehicles.length },
      { what: `history entries "${entry}"`, source: `${ODOO} (mail.message)`, expected: 1, actual: recorded.length },
      { what: 'author', source: `${ODOO} (mail.message)`, expected: users[0]?.partner_id[1] ?? `the partner of ${login}`, actual: first?.author_id ? first.author_id[1] : null },
      {
        what: 'recorded at (UTC)',
        source: `${ODOO} (mail.message)`,
        expected: `after ${new Date(startedAt).toISOString()}`,
        actual: first?.date ?? null,
        pass: at !== null && at >= startedAt - CLOCK_TOLERANCE_MS && at <= Date.now() + CLOCK_TOLERANCE_MS,
      },
    ]);
  }
);

/**
 * When I attempt to login with invalid credentials {int} times
 * Uses a login name unique to this run, so its log entries cannot come from an earlier run.
 */
When('I attempt to login with invalid credentials {int} times', { timeout: 30000 }, async function (
  this: CustomWorld,
  attempts: number
) {
  const runTag = Date.now().toString(36);
  const logins: string[] = [];
  for (let i = 0; i < attempts; i++) {
    const login = `invalid_user_${runTag}_${i}`;
    await this.loginPage.navigate(this.getBaseUrl());
    await this.loginPage.attemptLogin(login, 'wrong_password');
    await this.page.locator('form.oe_login_form .alert-danger').waitFor({ state: 'visible', timeout: 10000 });
    logins.push(login);
  }

  this.setTestData('failedLogins', logins);
  this.setTestData('lastFailedLoginAt', Date.now());
});

/**
 * Then the Odoo server log should record each failed login with its source IP address and time
 */
Then(
  'the Odoo server log should record each failed login with its source IP address and time',
  { timeout: 60000 },
  async function (this: CustomWorld) {
    const logins = this.getTestData<string[]>('failedLogins');
    if (!logins || logins.length === 0) {
      throw new Error('No failed logins were attempted in this scenario');
    }
    const startedAt = this.getTestData<number>('scenarioStartedAt') ?? 0;
    const lastLogin = logins[logins.length - 1];
    const log = await pollUntil(
      () => readOdooServerLog(),
      (text) => findFailedLogins(text, lastLogin).length > 0,
      10000,
      1000
    );

    const checks: Check[] = [];
    for (const login of logins) {
      const entry = findFailedLogins(log, login)[0];
      const at = entry ? parseOdooLogTimestamp(entry.timestamp) : null;
      checks.push(
        { what: `"Login failed" entry for ${login}`, source: 'Odoo server log', expected: 1, actual: findFailedLogins(log, login).length },
        {
          what: `source IP of ${login}`,
          source: 'Odoo server log',
          expected: 'an IP address',
          actual: entry?.ip ?? null,
          pass: entry !== undefined && /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-f:]+$/i.test(entry.ip),
        },
        {
          what: `time of ${login} (UTC)`,
          source: 'Odoo server log',
          expected: `after ${new Date(startedAt).toISOString()}`,
          actual: entry?.timestamp ?? null,
          pass: at !== null && at >= startedAt - CLOCK_TOLERANCE_MS && at <= Date.now() + CLOCK_TOLERANCE_MS,
        }
      );
    }
    verify(this, 'The Odoo server log records every failed login', checks);
  }
);
