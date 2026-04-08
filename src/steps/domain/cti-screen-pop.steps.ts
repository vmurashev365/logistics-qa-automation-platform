/**
 * CTI Screen Pop Domain Steps
 *
 * Tags: @web @integration
 *
 * Uses Playwright WebSocket routing to inject deterministic CTI events.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { getCtiEnv } from '../../helpers/service-env';
import { CtiWebSocketMock } from '../../helpers/CtiWebSocketMock';
import { getEnvConfig } from '../../support/env';
import type { OdooDomain } from '../../types/api';

Given('I am logged in as Odoo dispatcher', { timeout: 60000 }, async function (this: CustomWorld) {
  const env = getCtiEnv();

  await this.loginPage.navigate(env.odooBaseUrl);
  await this.loginPage.login(env.odooUser, env.odooPass, env.odooBaseUrl);

  this.setTestData('service_env', env);
});

Given('CTI WebSocket is mocked', { timeout: 30000 }, async function (this: CustomWorld) {
  const env = getCtiEnv();
  const mock = await CtiWebSocketMock.install(this.page, env.ctiWsPattern);
  this.setTestData('cti_ws_mock', mock);
});

When('I inject incoming call event with caller_id {string}', async function (this: CustomWorld, callerId: string) {
  const mock = this.getTestData<CtiWebSocketMock>('cti_ws_mock');
  if (!mock) {
    throw new Error('CTI WebSocket mock not installed. Use step: CTI WebSocket is mocked');
  }

  await mock.sendIncomingCall(callerId);
  this.setTestData('last_caller_id', callerId);
});

Then('I should see the Incoming Call modal', { timeout: 15000 }, async function (this: CustomWorld) {
  const modal = this.page.locator('.modal:has-text("Incoming Call"), .o_dialog:has-text("Incoming Call")');
  await expect(modal).toBeVisible({ timeout: 15000 });
});

Then('the modal should show the driver name for caller {string}', { timeout: 30000 }, async function (this: CustomWorld, callerId: string) {
  // Lookup driver name via Odoo (precondition: callerId must exist in data).
  if (!this.odooApi.isAuthenticated()) {
    const env = getEnvConfig();
    await this.odooApi.authenticate(env.odooDatabase, env.odooUsername, env.odooPassword);
  }

  const domain: OdooDomain = ['|', ['phone', '=', callerId], ['mobile', '=', callerId]];

  const partners = await this.odooApi.searchRead<{ id: number; name: string; phone?: string; mobile?: string }>(
    'res.partner',
    domain,
    ['id', 'name', 'phone', 'mobile'],
    { limit: 1 }
  );

  if (partners.length === 0) {
    throw new Error(
      `ISTQB Precondition Failed: no res.partner found with phone/mobile = ${callerId}. ` +
      `Seed a driver/contact with that caller id for CTI tests.`
    );
  }

  const expectedName = partners[0].name;
  const modal = this.page.locator('.modal:has-text("Incoming Call"), .o_dialog:has-text("Incoming Call")');

  await expect(modal).toContainText(expectedName, { timeout: 30000 });
});
