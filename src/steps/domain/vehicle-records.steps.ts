/**
 * Vehicle record steps.
 *
 * Checks that read what Odoo actually stored or shows, instead of looking for a word on the page.
 * Every checking step attaches its comparison record (see support/evidence.ts) and fails from it.
 */

import { When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { verify, pollUntil, Check } from '../../support/evidence';
import type { Vehicle } from '../../types/api';

const ODOO = 'Odoo JSON-RPC';
const PAGE = 'the page';

/** Odoo returns many2one values as [id, display name] or false. */
function many2oneName(value: unknown): string | null {
  return Array.isArray(value) && typeof value[1] === 'string' ? value[1] : null;
}

/** Form fields whose label differs from their technical name. */
const FORM_FIELD_NAMES: Record<string, string> = {
  Model: 'model_id',
  'License Plate': 'license_plate',
};

function hashParam(url: string, name: string): string | null {
  const hash = url.split('#')[1] ?? '';
  return new URLSearchParams(hash).get(name);
}

async function vehiclesWithPlate(world: CustomWorld, plate: string): Promise<Vehicle[]> {
  return world.fleetEndpoints.findVehiclesByPlateIncludingArchived(plate);
}

// ---------------------------------------------------------------------------
// UI actions
// ---------------------------------------------------------------------------

When('I choose vehicle model {string}', { timeout: 20000 }, async function (this: CustomWorld, model: string) {
  await this.vehicleFormPage.chooseModel(model);
});

// ---------------------------------------------------------------------------
// What the UI shows
// ---------------------------------------------------------------------------

Then('the vehicles list should be shown', { timeout: 20000 }, async function (this: CustomWorld) {
  // The waits below add up to less than the step timeout, so a missing list is reported by
  // the comparison record, not by a bare step timeout.
  const views = this.page.locator('.o_kanban_view, .o_list_view').first();
  await views.waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
  const breadcrumb = this.page.locator('.o_breadcrumb');
  await expect(breadcrumb).toHaveText('Vehicles', { timeout: 5000 }).catch(() => undefined);
  // "No form is open" cannot be awaited: Odoo gives no signal that it is done. A click that
  // opens a form (e.g. "New") returns before the form renders, so read the state after a
  // settle window; an action still in flight shows up within it.
  await this.page.waitForTimeout(1000);

  verify(this, 'The vehicles list is shown', [
    {
      what: 'breadcrumb',
      source: PAGE,
      expected: 'Vehicles',
      actual: ((await breadcrumb.allInnerTexts())[0] ?? '').replace(/\s+/g, ' ').trim(),
    },
    { what: 'model in the URL', source: PAGE, expected: 'fleet.vehicle', actual: hashParam(this.page.url(), 'model') },
    { what: 'list or kanban view visible', source: PAGE, expected: true, actual: await views.isVisible() },
    { what: 'open forms', source: PAGE, expected: 0, actual: await this.page.locator('.o_form_view').count() },
  ]);
});

Then('an empty vehicle form should be open', { timeout: 15000 }, async function (this: CustomWorld) {
  const form = this.page.locator('.o_form_view');
  await form.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
  const plate = this.page.locator('div[name="license_plate"] input');

  verify(this, 'An empty vehicle form is open', [
    { what: 'form visible', source: PAGE, expected: true, actual: await form.isVisible() },
    { what: 'model in the URL', source: PAGE, expected: 'fleet.vehicle', actual: hashParam(this.page.url(), 'model') },
    { what: 'record id in the URL', source: PAGE, expected: null, actual: hashParam(this.page.url(), 'id') },
    { what: 'license plate', source: PAGE, expected: '', actual: (await plate.count()) > 0 ? await plate.inputValue() : null },
  ]);
});

Then(
  'Odoo should refuse to save the vehicle because {string} is missing',
  { timeout: 15000 },
  async function (this: CustomWorld, label: string) {
    const fieldName = FORM_FIELD_NAMES[label];
    if (!fieldName) {
      throw new Error(`Unknown vehicle form field "${label}". Known: ${Object.keys(FORM_FIELD_NAMES).join(', ')}`);
    }
    const notification = this.page.locator('.o_notification').filter({ hasText: 'Invalid fields' }).first();
    await notification.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const notificationText = (await notification.count()) > 0 ? (await notification.innerText()).replace(/\s+/g, ' ').trim() : null;
    const field = this.page.locator(`.o_form_view div[name="${fieldName}"]`).first();

    verify(this, `Odoo refuses to save a vehicle without "${label}"`, [
      {
        what: 'notification',
        source: PAGE,
        expected: `Invalid fields: ${label}`,
        actual: notificationText,
        pass: notificationText !== null && notificationText.includes('Invalid fields') && notificationText.includes(label),
      },
      {
        what: `"${label}" marked invalid`,
        source: PAGE,
        expected: true,
        actual: (await field.count()) > 0 && (await field.evaluate((el) => el.classList.contains('o_field_invalid'))),
      },
      { what: 'record id in the URL', source: PAGE, expected: null, actual: hashParam(this.page.url(), 'id') },
    ]);
  }
);

Then(
  'the vehicle form should show license plate {string}',
  { timeout: 20000 },
  async function (this: CustomWorld, plate: string) {
    const form = this.page.locator('.o_form_view');
    await form.waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
    const input = this.page.locator('div[name="license_plate"] input');
    await expect(input).toHaveValue(plate, { timeout: 5000 }).catch(() => undefined);
    const stored = await vehiclesWithPlate(this, plate);

    verify(this, `The vehicle form shows vehicle "${plate}"`, [
      { what: 'vehicles with this plate', source: ODOO, expected: 1, actual: stored.length },
      { what: 'form visible', source: PAGE, expected: true, actual: await form.isVisible() },
      { what: 'license plate', source: PAGE, expected: plate, actual: (await input.count()) > 0 ? await input.inputValue() : null },
      {
        what: 'record id in the URL',
        source: PAGE,
        expected: stored[0]?.id !== undefined ? String(stored[0].id) : 'the stored vehicle id',
        actual: hashParam(this.page.url(), 'id'),
      },
    ]);
  }
);

Then(
  'the vehicles list should show the plate {string} as text',
  { timeout: 20000 },
  async function (this: CustomWorld, plate: string) {
    // hasText matches text content, so an injected <img> would not match: it would be an element.
    const records = this.page.locator('.o_kanban_record, .o_data_row').filter({ hasText: plate });
    await records.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
    const shown = await records.count();

    verify(this, `The vehicles list shows "${plate}" as text`, [
      { what: 'records showing the plate as text', source: PAGE, expected: 'at least 1', actual: shown, pass: shown > 0 },
      { what: 'img elements with src="x" in the page', source: PAGE, expected: 0, actual: await this.page.locator('img[src="x"]').count() },
    ]);
  }
);

Then(
  'the vehicles search for {string} should find no vehicles',
  { timeout: 20000 },
  async function (this: CustomWorld, term: string) {
    // Waits add up to less than the step timeout: a search that was not applied, or records
    // that are still shown, are reported by the comparison record below.
    const facet = this.page.locator('.o_searchview_facet').filter({ hasText: term }).first();
    await facet.waitFor({ state: 'visible', timeout: 5000 }).catch(() => undefined);
    const emptyHelper = this.page.locator('.o_view_nocontent');
    await emptyHelper.waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);

    verify(this, `Searching vehicles for "${term}" finds nothing`, [
      { what: 'search facet with the term', source: PAGE, expected: 1, actual: await facet.count() },
      { what: '"no records" helper visible', source: PAGE, expected: true, actual: await emptyHelper.isVisible() },
      {
        what: 'vehicle records shown',
        source: PAGE,
        expected: 0,
        actual: await this.page.locator('.o_kanban_record:not(.o_kanban_ghost), .o_data_row').count(),
      },
    ]);
  }
);

Then(
  'the vehicles list view should count as many vehicles as the API returned',
  { timeout: 30000 },
  async function (this: CustomWorld) {
    const result = this.lastApiResponse;
    if (!result || !Array.isArray(result.body)) {
      throw new Error('No vehicle list from the API in this scenario. Use: When I get list of vehicles via API');
    }
    await this.page.locator('.o_switch_view.o_list').first().click({ timeout: 5000 });
    await this.page.locator('.o_list_view').waitFor({ state: 'visible', timeout: 10000 });

    // Odoo shows the total in the pager, and no pager at all when the list is empty: then the
    // "no records" helper and the absence of rows are what says "0".
    const limit = this.page.locator('.o_pager_limit').first();
    const emptyHelper = this.page.locator('.o_view_nocontent');
    await limit.or(emptyHelper).first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);

    let shown: number | null = null;
    let readFrom = 'list pager';
    if (await limit.isVisible()) {
      shown = Number((await limit.innerText()).trim());
    } else if ((await emptyHelper.isVisible()) && (await this.page.locator('.o_data_row').count()) === 0) {
      shown = 0;
      readFrom = 'empty list';
    }

    verify(this, 'The vehicles list view counts the vehicles the API returned', [
      { what: 'vehicle count', source: `${PAGE} (${readFrom}) vs ${ODOO}`, expected: result.body.length, actual: shown },
    ]);
  }
);

// ---------------------------------------------------------------------------
// What Odoo stored
// ---------------------------------------------------------------------------

Then(
  'vehicle {string} should be saved in Odoo with model {string}',
  { timeout: 20000 },
  async function (this: CustomWorld, plate: string, model: string) {
    const stored = await pollUntil(() => vehiclesWithPlate(this, plate), (found) => found.length > 0);
    if (stored.length > 0) {
      this.trackVehicle(plate);
    }

    verify(this, `Vehicle "${plate}" is saved with model "${model}"`, [
      { what: 'vehicles with this plate', source: ODOO, expected: 1, actual: stored.length },
      { what: 'active', source: ODOO, expected: true, actual: stored[0]?.active ?? null },
      { what: 'model', source: ODOO, expected: model, actual: many2oneName(stored[0]?.model_id) },
    ]);
  }
);

Then('no vehicle {string} should exist in Odoo', { timeout: 15000 }, async function (this: CustomWorld, plate: string) {
  const stored = await vehiclesWithPlate(this, plate);
  if (stored.length > 0) {
    this.trackVehicle(plate);
  }

  verify(this, `No vehicle "${plate}" exists`, [
    { what: 'vehicles with this plate, archived included', source: ODOO, expected: 0, actual: stored.length },
  ]);
});

Then(
  'vehicle {string} should have driver {string} in Odoo',
  { timeout: 20000 },
  async function (this: CustomWorld, plate: string, driver: string) {
    const stored = await pollUntil(
      () => vehiclesWithPlate(this, plate),
      (found) => found.length === 1 && many2oneName(found[0].driver_id) === driver
    );

    verify(this, `Vehicle "${plate}" has driver "${driver}"`, [
      { what: 'vehicles with this plate', source: ODOO, expected: 1, actual: stored.length },
      { what: 'driver', source: ODOO, expected: driver, actual: many2oneName(stored[0]?.driver_id) },
    ]);
  }
);

Then(
  'the vehicle created via API should be stored in Odoo with:',
  { timeout: 15000 },
  async function (this: CustomWorld, table: DataTable) {
    const id = this.getTestData<number>('lastCreatedVehicleId');
    if (id === undefined) {
      throw new Error('No vehicle was created via API in this scenario');
    }
    const expected = table.rowsHash();
    const records = await this.odooApi.read<Record<string, unknown>>('fleet.vehicle', [id], Object.keys(expected));
    const record = records[0];

    const checks: Check[] = [{ what: 'records with the returned id', source: ODOO, expected: 1, actual: records.length }];
    for (const [field, value] of Object.entries(expected)) {
      const raw = record?.[field];
      const actual = Array.isArray(raw) ? many2oneName(raw) : raw === undefined ? null : String(raw);
      checks.push({ what: field, source: ODOO, expected: value, actual });
    }
    verify(this, `The vehicle created via API (id ${id}) is stored as requested`, checks);
  }
);

Then('API response should contain vehicle with plate {string}', function (this: CustomWorld, plate: string) {
  const result = this.lastApiResponse;
  const body = result?.body;
  const vehicles = (Array.isArray(body) ? body : body ? [body] : []) as Vehicle[];

  verify(this, `The API returned vehicle "${plate}"`, [
    { what: 'API call recorded', source: ODOO, expected: true, actual: result !== undefined },
    { what: 'vehicles returned', source: ODOO, expected: 1, actual: vehicles.length },
    { what: 'license plate', source: ODOO, expected: plate, actual: vehicles[0]?.license_plate ?? null },
  ]);
});

Then('API response should return no vehicle', function (this: CustomWorld) {
  const result = this.lastApiResponse;
  const body = result?.body;
  const count = Array.isArray(body) ? body.length : body ? 1 : 0;

  verify(this, 'The API returned no vehicle', [
    { what: 'API call recorded', source: ODOO, expected: true, actual: result !== undefined },
    { what: 'vehicles returned', source: ODOO, expected: 0, actual: count },
  ]);
});

Then('the API response should list exactly the plates {string}', function (this: CustomWorld, list: string) {
  const body = this.lastApiResponse?.body;
  const expected = list.split(',').map((plate) => plate.trim()).sort();
  const actual = Array.isArray(body)
    ? (body as Array<{ license_plate?: string }>).map((record) => record.license_plate ?? '').sort()
    : null;

  verify(this, `The API returned exactly ${expected.join(', ')}`, [
    { what: 'license plates', source: ODOO, expected, actual },
  ]);
});

Then('the vehicle list from the API should include {string}', function (this: CustomWorld, plate: string) {
  const body = this.lastApiResponse?.body;
  const plates = Array.isArray(body) ? (body as Vehicle[]).map((vehicle) => vehicle.license_plate) : null;

  verify(this, `The vehicle list from the API includes "${plate}"`, [
    {
      what: 'vehicles with this plate in the list',
      source: ODOO,
      expected: 1,
      actual: plates ? plates.filter((value) => value === plate).length : null,
    },
  ]);
});
