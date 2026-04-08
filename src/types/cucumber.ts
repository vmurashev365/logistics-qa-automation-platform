/**
 * Type definitions for Cucumber World and related interfaces
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { World as CucumberWorld } from '@cucumber/cucumber';

/**
 * World parameters passed from cucumber configuration
 */
export interface WorldParameters {
  baseUrl: string;
  headless: boolean;
  slowMo: number;
  timeout: number;
}

/**
 * Test data storage interface
 */
export interface TestDataStorage {
  [key: string]: unknown;
}

/**
 * Extended World interface with Playwright support
 */
export interface ICustomWorld extends CucumberWorld<WorldParameters> {
  // Playwright instances
  browser: Browser;
  context: BrowserContext;
  page: Page;

  // World parameters
  parameters: WorldParameters;

  // Test data storage
  testData: Map<string, unknown>;

  // Scenario metadata
  scenarioName: string;
  featureName: string;

  // Helper methods
  getBaseUrl(): string;
  setTestData<T>(key: string, value: T): void;
  getTestData<T>(key: string): T | undefined;
  hasTestData(key: string): boolean;
  clearTestData(): void;
  initializePageObjects(): void;
}

/**
 * Step context type for step definitions
 */
export type StepContext = ICustomWorld;

/**
 * Page object interface
 */
export interface IBasePage {
  readonly page: Page;
  waitForPageLoad(): Promise<void>;
  waitForNetworkIdle(): Promise<void>;
}

/**
 * Odoo-specific page interface
 */
export interface IOdooPage extends IBasePage {
  waitForOdooReady(): Promise<void>;
  isLoggedIn(): Promise<boolean>;
}

/**
 * Scenario result type
 */
export interface ScenarioResult {
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: Error;
}

/**
 * Hook attachment type
 */
export type AttachmentMediaType = 
  | 'text/plain'
  | 'application/json'
  | 'image/png'
  | 'image/jpeg'
  | 'video/webm';

/**
 * URL mapping for navigation
 */
export interface UrlMapping {
  [pageName: string]: string;
}

/**
 * Element selector type
 */
export type SelectorType = 'role' | 'label' | 'text' | 'placeholder' | 'testId' | 'css' | 'xpath';

/**
 * Selector definition
 */
export interface SelectorDefinition {
  type: SelectorType;
  value: string;
  options?: Record<string, unknown>;
}
