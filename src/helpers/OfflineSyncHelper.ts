/**
 * OfflineSyncHelper
 *
 * Implements the end-to-end offline queue + sync polling flow for tablet tests.
 */

import type { Page, BrowserContext } from 'playwright';
import { expect } from '@playwright/test';
import type { RestApiClient } from '../api/clients/RestApiClient';
import { TabletSelectors } from '../ui-map/tablet';
import type { LoadStatusResponse } from '../types/offline-sync';

export interface OfflineSyncHelperConfig {
  loadStatusEndpoint: string;
  /** Total poll timeout in ms. */
  timeoutMs: number;
  /** Poll interval in ms. */
  intervalMs: number;
}

export class OfflineSyncHelper {
  constructor(
    private readonly page: Page,
    private readonly context: BrowserContext,
    private readonly restApi: RestApiClient,
    private readonly config: OfflineSyncHelperConfig
  ) {}

  async setOffline(offline: boolean): Promise<void> {
    await this.context.setOffline(offline);
  }

  /**
   * Select the first load card and return a load id string.
   * This relies on TabletSelectors.loadManagement.*.
   */
  async captureCurrentLoadId(): Promise<string> {
    const card = this.page.locator(TabletSelectors.loadManagement.loadCard).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    const loadIdLocator = card.locator(TabletSelectors.loadManagement.loadId).first();
    await expect(loadIdLocator).toBeVisible({ timeout: 15000 });

    const raw = (await loadIdLocator.textContent())?.trim();
    if (!raw) {
      throw new Error('Unable to read load id from the first load card');
    }

    return raw;
  }

  /**
   * Upload a POD file via the upload modal.
   * Uses a tiny deterministic PNG payload to avoid external fixtures.
   */
  async uploadPodViaModal(): Promise<void> {
    // Open upload flow (button label is part of product UX contract)
    await this.page.getByRole('button', { name: /upload\s+pod/i }).click({ timeout: 15000 });

    const modal = this.page.locator(TabletSelectors.uploadModal.container);
    await expect(modal).toBeVisible({ timeout: 15000 });

    const fileInput = this.page.locator(TabletSelectors.uploadModal.fileInput).first();

    // 1x1 transparent PNG
    const base64Png =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ak9lN0AAAAASUVORK5CYII=';

    await fileInput.setInputFiles({
      name: 'pod.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64Png, 'base64'),
    });

    const uploadButton = this.page.locator(TabletSelectors.uploadModal.uploadButton).first();
    await uploadButton.click({ timeout: 15000 });
  }

  /**
   * Mark the load delivered and upload POD while offline.
   * Verifies the UI indicates the action is queued.
   */
  async markDeliveredAndQueuePod(): Promise<void> {
    await this.page.getByRole('button', { name: /mark\s+delivered/i }).click({ timeout: 15000 });
    await this.uploadPodViaModal();

    // "Queued" UX contract: either explicit text, or a visible offline queue banner.
    const queueIndicator = this.page.locator(TabletSelectors.offlineQueue.indicator);
    await expect(queueIndicator).toBeVisible({ timeout: 15000 });
    await expect(queueIndicator).toContainText(/queued|offline/i, { timeout: 15000 });
  }

  /**
   * Poll REST API until the load is synced or timeout occurs.
   */
  async waitForLoadSynced(loadId: string): Promise<LoadStatusResponse> {
    const started = Date.now();

    const query = new URLSearchParams({ load_id: loadId }).toString();

    while (Date.now() - started < this.config.timeoutMs) {
      const endpointWithQuery = `${this.config.loadStatusEndpoint}${this.config.loadStatusEndpoint.includes('?') ? '&' : '?'}${query}`;
      const response = await this.restApi.get<unknown>(endpointWithQuery);

      if (response.status >= 200 && response.status < 300) {
        const body = response.body;
        if (isLoadStatusResponse(body)) {
          if (body.synced || String(body.status ?? '').toLowerCase() === 'synced') {
            return body;
          }
        }
      }

      await this.page.waitForTimeout(this.config.intervalMs);
    }

    throw new Error(`Load did not reach synced state within ${this.config.timeoutMs}ms (load_id=${loadId})`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isLoadStatusResponse(value: unknown): value is LoadStatusResponse {
  if (!isRecord(value)) return false;

  const loadId = value['load_id'];
  const synced = value['synced'];

  return typeof loadId === 'string' && typeof synced === 'boolean';
}
