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
 * Wait up to `timeoutMs` for the locator to be visible; true if it became visible.
 * Playwright's locator.isVisible() does not wait (its timeout option is ignored), so a
 * "wait a little for X" check must use this instead.
 */
export async function isVisibleWithin(locator: Locator, timeoutMs: number): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/**
 * The first of `candidates` (in the given order) that is visible once any of them has appeared
 * within `timeoutMs`, or null if none appears. The candidates are awaited together, so several
 * alternatives (e.g. labels that differ between Odoo versions) cost one timeout, not one each.
 */
export async function firstVisible(candidates: Locator[], timeoutMs: number): Promise<Locator | null> {
  if (candidates.length === 0) return null;
  const anyOf = candidates.slice(1).reduce((all, candidate) => all.or(candidate), candidates[0]);
  if (!(await isVisibleWithin(anyOf, timeoutMs))) return null;
  for (const candidate of candidates) {
    if (await candidate.first().isVisible()) return candidate.first();
  }
  return null;
}

// No "wait for network idle": Odoo keeps connections open (bus, polling), so networkidle
// never arrives and such a wait only burns its whole timeout. Wait for the element instead.

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
  isVisibleWithin,
  firstVisible,
  waitForDomContentLoaded,
  waitForLoad,
  waitForText,
  waitForCount,
  sleep,
  retry,
};
