import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { OdooJsonRpcClient } from '../src/api/clients/OdooJsonRpcClient';
import { FleetEndpoints } from '../src/api/endpoints/FleetEndpoints';
import { LoginPage } from '../src/pages/web/LoginPage';
import { getEnvConfig } from '../src/support/env';

interface Driver {
  id: number;
  name: string;
}

interface DriverAssignment {
  fleet: FleetEndpoints;
  vehicleId: number;
  plate: string;
  original: Driver;
  replacement: Driver;
}

const test = base.extend<{ assignment: DriverAssignment }>({
  assignment: async ({ baseURL }, use, testInfo) => {
    const config = getEnvConfig();
    const api = new OdooJsonRpcClient(baseURL ?? config.baseUrl);
    const fleet = new FleetEndpoints(api);
    await api.authenticate(config.odooDatabase, config.odooUsername, config.odooPassword);

    const key = randomUUID();
    const plate = `QA-DISCARD-${key}`;
    const partnerIds: number[] = [];
    let vehicleId: number | undefined;
    try {
      const originalName = `QA Original ${key}`;
      const original = { id: await api.create('res.partner', { name: originalName }), name: originalName };
      partnerIds.push(original.id);
      const replacementName = `QA Replacement ${key}`;
      const replacement = { id: await api.create('res.partner', { name: replacementName }), name: replacementName };
      partnerIds.push(replacement.id);
      vehicleId = await fleet.createVehicle({ license_plate: plate, driver_id: original.id });

      await testInfo.attach('Odoo fixture IDs', {
        contentType: 'application/json',
        body: JSON.stringify({ vehicleId, plate, original, replacement }),
      });
      await use({ fleet, vehicleId, plate, original, replacement });
    } finally {
      const errors: unknown[] = [];
      if (vehicleId !== undefined) {
        try {
          await fleet.deleteVehicleAndHistory(vehicleId);
        } catch (error) {
          errors.push(error);
        }
      }
      if (partnerIds.length > 0) {
        try {
          await api.unlink('res.partner', partnerIds);
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length > 0) throw new AggregateError(errors, `Could not clean up test fixture ${plate}`);
    }
  },
});

test('discarding a driver change preserves the existing vehicle assignment', async ({ page, baseURL, assignment }) => {
  const { fleet, vehicleId, plate, original, replacement } = assignment;
  const config = getEnvConfig();
  const form = page.locator('.o_form_view');
  const driver = form.locator('[name="driver_id"] input');
  const licensePlate = form.locator('[name="license_plate"] input');
  const discard = page.getByRole('button', { name: 'Discard changes', exact: true });

  await test.step('Open the existing assignment in Fleet', async () => {
    const url = `/web#action=fleet.fleet_vehicle_action&model=fleet.vehicle&view_type=form&id=${vehicleId}`;
    await new LoginPage(page).login(config.odooUsername, config.odooPassword, baseURL ?? config.baseUrl);
    await page.goto(new URL(url, baseURL ?? config.baseUrl).href);
    await expect(licensePlate).toHaveValue(plate);
    await expect(driver).toHaveValue(original.name);
  });

  await test.step('Select the replacement and discard the pending edit', async () => {
    await driver.fill(replacement.name);
    await form.locator('.o-autocomplete--dropdown-menu').getByText(replacement.name, { exact: true }).click();
    await expect(driver).toHaveValue(replacement.name);
    await expect(discard).toBeVisible();
    expect((await fleet.getVehicleById(vehicleId))?.driver_id).toEqual([original.id, original.name]);
    await discard.click();
    await expect(driver).toHaveValue(original.name);
  });

  await test.step('Reload the form and independently verify the persisted driver', async () => {
    await page.reload();
    await expect(licensePlate).toHaveValue(plate);
    await expect(driver).toHaveValue(original.name);
    expect(await fleet.getVehicleById(vehicleId)).toMatchObject({
      id: vehicleId,
      license_plate: plate,
      driver_id: [original.id, original.name],
    });
  });
});
