/**
 * BasePage - Abstract base class for all page objects
 * Provides common functionality and utilities for page interactions
 */

import { Page, Locator } from 'playwright';
import { waitForNetworkIdle, waitForVisible, sleep } from '../../utils/wait';

/**
 * Abstract base page class
 * All page objects should extend this class
 */
export abstract class BasePage {
  protected readonly page: Page;
  protected readonly defaultTimeout: number;

  constructor(page: Page, defaultTimeout: number = 30000) {
    this.page = page;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Navigate to a specific URL
   * @param url - Full URL or path to navigate to
   */
  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to finish loading
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('load');
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle(): Promise<void> {
    await waitForNetworkIdle(this.page, { timeout: this.defaultTimeout });
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    return this.page.url();
  }

  /**
   * Check if element is visible
   * @param locator - Playwright locator
   */
  async isVisible(locator: Locator): Promise<boolean> {
    return await locator.isVisible();
  }

  /**
   * Check if element is enabled
   * @param locator - Playwright locator
   */
  async isEnabled(locator: Locator): Promise<boolean> {
    return await locator.isEnabled();
  }

  /**
   * Click on element
   * @param locator - Playwright locator
   */
  async click(locator: Locator): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.click();
  }

  /**
   * Fill text into input field
   * @param locator - Playwright locator
   * @param value - Text to fill
   */
  async fill(locator: Locator, value: string): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.fill(value);
  }

  /**
   * Clear and fill text into input field
   * @param locator - Playwright locator
   * @param value - Text to fill
   */
  async clearAndFill(locator: Locator, value: string): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.clear();
    await locator.fill(value);
  }

  /**
   * Get text content from element
   * @param locator - Playwright locator
   */
  async getText(locator: Locator): Promise<string> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    return (await locator.textContent()) || '';
  }

  /**
   * Get input value from element
   * @param locator - Playwright locator
   */
  async getValue(locator: Locator): Promise<string> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    return await locator.inputValue();
  }

  /**
   * Select option by value
   * @param locator - Playwright locator
   * @param value - Option value to select
   */
  async selectByValue(locator: Locator, value: string): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.selectOption({ value });
  }

  /**
   * Select option by label
   * @param locator - Playwright locator
   * @param label - Option label to select
   */
  async selectByLabel(locator: Locator, label: string): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.selectOption({ label });
  }

  /**
   * Check checkbox
   * @param locator - Playwright locator
   */
  async check(locator: Locator): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.check();
  }

  /**
   * Uncheck checkbox
   * @param locator - Playwright locator
   */
  async uncheck(locator: Locator): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.uncheck();
  }

  /**
   * Hover over element
   * @param locator - Playwright locator
   */
  async hover(locator: Locator): Promise<void> {
    await waitForVisible(locator, { timeout: this.defaultTimeout });
    await locator.hover();
  }

  /**
   * Take screenshot
   * @param name - Screenshot name
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      path: `reports/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Wait for specified milliseconds
   * @param ms - Milliseconds to wait
   */
  async wait(ms: number): Promise<void> {
    await sleep(ms);
  }

  /**
   * Get element by role
   * @param role - ARIA role
   * @param options - Options including name
   */
  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): Locator {
    return this.page.getByRole(role, options);
  }

  /**
   * Get element by label
   * @param label - Label text
   */
  getByLabel(label: string | RegExp): Locator {
    return this.page.getByLabel(label);
  }

  /**
   * Get element by text
   * @param text - Text content
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Get element by placeholder
   * @param placeholder - Placeholder text
   */
  getByPlaceholder(placeholder: string | RegExp): Locator {
    return this.page.getByPlaceholder(placeholder);
  }

  /**
   * Get element by test ID
   * @param testId - Test ID attribute value
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Get element by CSS selector
   * @param selector - CSS selector
   */
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }
}

export default BasePage;
