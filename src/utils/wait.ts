/**
 * Wait Utilities
 * Helper functions for waiting on conditions, elements, and states
 */

import { Page, Locator } from 'playwright';

/**
 * Wait options configuration
 */
export interface WaitOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}

/**
 * Default wait options
 */
const DEFAULT_WAIT_OPTIONS: Required<WaitOptions> = {
  timeout: 30000,
  interval: 100,
  message: 'Condition not met within timeout',
};

/**
 * Wait for a condition to be true
 * @param condition - Function that returns a boolean or Promise<boolean>
 * @param options - Wait options (timeout, interval, message)
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout, interval, message } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch {
      // Condition threw an error, continue waiting
    }
    await sleep(interval);
  }

  throw new Error(`${message} (waited ${timeout}ms)`);
}

/**
 * Wait for an element to be visible
 * @param locator - Playwright locator
 * @param options - Wait options
 */
export async function waitForVisible(
  locator: Locator,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await locator.waitFor({ state: 'visible', timeout });
}

/**
 * Wait for an element to be hidden
 * @param locator - Playwright locator
 * @param options - Wait options
 */
export async function waitForHidden(
  locator: Locator,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await locator.waitFor({ state: 'hidden', timeout });
}

/**
 * Wait for an element to be attached to DOM
 * @param locator - Playwright locator
 * @param options - Wait options
 */
export async function waitForAttached(
  locator: Locator,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await locator.waitFor({ state: 'attached', timeout });
}

/**
 * Wait for URL to match pattern
 * @param page - Playwright page
 * @param urlPattern - String or RegExp to match URL
 * @param options - Wait options
 */
export async function waitForUrl(
  page: Page,
  urlPattern: string | RegExp,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Wait for network to be idle
 * @param page - Playwright page
 * @param options - Wait options
 */
export async function waitForNetworkIdle(
  page: Page,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for DOM content to be loaded
 * @param page - Playwright page
 * @param options - Wait options
 */
export async function waitForDomContentLoaded(
  page: Page,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await page.waitForLoadState('domcontentloaded', { timeout });
}

/**
 * Wait for page load to complete
 * @param page - Playwright page
 * @param options - Wait options
 */
export async function waitForLoad(
  page: Page,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  await page.waitForLoadState('load', { timeout });
}

/**
 * Wait for text to appear on page
 * @param page - Playwright page
 * @param text - Text to wait for
 * @param options - Wait options
 */
export async function waitForText(
  page: Page,
  text: string,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout, message } = { 
    ...DEFAULT_WAIT_OPTIONS, 
    message: `Text "${text}" not found`,
    ...options 
  };
  
  await waitForCondition(
    async () => {
      const content = await page.textContent('body');
      return content?.includes(text) ?? false;
    },
    { timeout, message }
  );
}

/**
 * Wait for element count to match
 * @param locator - Playwright locator
 * @param count - Expected count
 * @param options - Wait options
 */
export async function waitForCount(
  locator: Locator,
  count: number,
  options: WaitOptions = {}
): Promise<void> {
  const { timeout, message } = {
    ...DEFAULT_WAIT_OPTIONS,
    message: `Element count did not match ${count}`,
    ...options
  };

  await waitForCondition(
    async () => (await locator.count()) === count,
    { timeout, message }
  );
}

/**
 * Sleep for specified duration
 * @param ms - Duration in milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or timeout
 * @param fn - Function to retry
 * @param options - Wait options
 */
export async function retry<T>(
  fn: () => T | Promise<T>,
  options: WaitOptions = {}
): Promise<T> {
  const { timeout, interval, message } = { ...DEFAULT_WAIT_OPTIONS, ...options };
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      await sleep(interval);
    }
  }

  throw new Error(`${message}: ${lastError?.message}`);
}

export default {
  waitForCondition,
  waitForVisible,
  waitForHidden,
  waitForAttached,
  waitForUrl,
  waitForNetworkIdle,
  waitForDomContentLoaded,
  waitForLoad,
  waitForText,
  waitForCount,
  sleep,
  retry,
};
