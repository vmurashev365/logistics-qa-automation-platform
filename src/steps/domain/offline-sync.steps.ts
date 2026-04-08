/**
 * Offline Sync (Tablet) Domain Steps
 *
 * Tags: @tablet @offline @integration
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { getOfflineSyncEnv } from '../../helpers/service-env';
import { OfflineSyncHelper } from '../../helpers/OfflineSyncHelper';

Given('the tablet app is loaded online', { timeout: 60000 }, async function (this: CustomWorld) {
  const env = getOfflineSyncEnv();

  // Load Odoo + login (tablet UI is just a responsive surface here).
  await this.loginPage.navigate(env.odooBaseUrl);
  await this.loginPage.login(env.odooUser, env.odooPass, env.odooBaseUrl);

  // Ensure we are online.
  await this.context.setOffline(false);

  this.setTestData('service_env', env);
});

When('I go offline', async function (this: CustomWorld) {
  await this.context.setOffline(true);
});

When('I go back online', async function (this: CustomWorld) {
  await this.context.setOffline(false);
});

When('I mark delivered and upload POD (should queue)', { timeout: 60000 }, async function (this: CustomWorld) {
  const env = getOfflineSyncEnv();

  this.restApi.setBaseUrl(env.apiBaseUrl);
  this.restApi.setAuthorization(env.apiAuthToken, 'Bearer');

  const helper = new OfflineSyncHelper(this.page, this.context, this.restApi, {
    loadStatusEndpoint: env.loadStatusEndpoint,
    timeoutMs: 30000,
    intervalMs: 1000,
  });

  const loadId = await helper.captureCurrentLoadId();
  this.setTestData('offline_load_id', loadId);

  await helper.setOffline(true);
  await helper.markDeliveredAndQueuePod();

  // Basic UX assertion: offline queue indicator visible.
  const indicator = this.page.locator('[data-testid="offline-queue"], .offline-indicator, .o_offline_banner');
  await expect(indicator).toBeVisible({ timeout: 15000 });
});

Then('the load should sync within 30 seconds', { timeout: 60000 }, async function (this: CustomWorld) {
  const env = getOfflineSyncEnv();
  const loadId = this.getTestData<string>('offline_load_id');
  if (!loadId) {
    throw new Error('Missing offline_load_id in world state');
  }

  this.restApi.setBaseUrl(env.apiBaseUrl);
  this.restApi.setAuthorization(env.apiAuthToken, 'Bearer');

  const helper = new OfflineSyncHelper(this.page, this.context, this.restApi, {
    loadStatusEndpoint: env.loadStatusEndpoint,
    timeoutMs: 30000,
    intervalMs: 1000,
  });

  await helper.setOffline(false);
  const status = await helper.waitForLoadSynced(loadId);

  expect(status.synced || String(status.status ?? '').toLowerCase() === 'synced').toBe(true);
});
