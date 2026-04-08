/**
 * Playwright Test Runner Configuration (OPTIONAL)
 *
 * This repository's PRIMARY runner is Cucumber (`cucumber-js`) and the browser automation
 * is driven via `playwright` inside Cucumber hooks/steps.
 *
 * Run Playwright Test specs with: npx playwright test
 * Specs live in the `tests/` directory (see tests/smoke.spec.ts).
 * The primary test runner for BDD scenarios is still Cucumber (npm run test:smoke).
 *
 * @see https://playwright.dev/docs/test-configuration
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Custom device definitions for logistics fleet management.
 * These devices are optimized for trucking logistics use cases.
 */
export const CUSTOM_DEVICES = {
  /**
   * Samsung Galaxy Tab Active4 Pro
   * 
   * Used by fleet drivers as Electronic Logging Device (ELD) mounted on dashboard.
   * - Landscape orientation for dashboard mounting
   * - High brightness for sunlight visibility
   * - Touch-optimized for glove usage
   * - 10.1" display at 1920x1200 native (scaled to 1200x1920 CSS pixels)
   */
  'Galaxy Tab Active4 Pro': {
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-T636B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: {
      width: 1200,  // Landscape: height becomes width
      height: 800,  // 1920/2.4 scale factor
    },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'chromium' as const,
  },
  
  /**
   * Apple iPad Mini 6th Generation
   * 
   * Used by owner-operators for document management at broker offices.
   * - Portrait orientation for document scanning (BOL/POD)
   * - Touch-optimized for quick interactions
   * - 8.3" display at 2266x1488 native (scaled to ~744x1133 CSS pixels)
   */
  'iPad Mini 6': {
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    viewport: {
      width: 744,   // Portrait mode
      height: 1133,
    },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    defaultBrowserType: 'webkit' as const,
  },
} as const;

/**
 * Type for custom device names
 */
export type CustomDeviceName = keyof typeof CUSTOM_DEVICES;

/**
 * Playwright Test Configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Global timeout for each test
  timeout: parseInt(process.env.TIMEOUT || '60000', 10),
  
  // Expect timeout for assertions
  expect: {
    timeout: 10000,
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI for stability
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:8069',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: process.env.SCREENSHOT_ON_FAILURE === 'true' ? 'on' : 'only-on-failure',
    
    // Video recording
    video: 'retain-on-failure',
    
    // Action timeout
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },
  
  // Configure projects for different devices and browsers
  projects: [
    // Desktop browsers (default testing)
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // ===========================================
    // TABLET DEVICES - Fleet Management Use Cases
    // ===========================================
    
    /**
     * Galaxy Tab Active4 Pro - Fleet Driver ELD
     * 
     * Use case: Dashboard-mounted ELD for truck drivers
     * - Landscape orientation
     * - Glove-friendly touch targets (min 48px)
     * - High contrast for sunlight visibility
     * - Optimized for BOL upload and load management
     */
    {
      name: 'galaxy-tab',
      use: {
        ...CUSTOM_DEVICES['Galaxy Tab Active4 Pro'],
        // Driver safety settings
        colorScheme: 'light',           // High visibility in bright conditions
        // Geolocation for ELD compliance (example: Dallas, TX)
        geolocation: { latitude: 32.7767, longitude: -96.7970 },
        permissions: ['geolocation', 'camera'],
      },
    },
    
    /**
     * iPad Mini 6 - Owner-Operator Document Scanner
     * 
     * Use case: Portable device for broker office visits
     * - Portrait orientation for document scanning
     * - Camera permissions for BOL/POD capture
     * - Signature capture support
     */
    {
      name: 'ipad-mini',
      use: {
        ...CUSTOM_DEVICES['iPad Mini 6'],
        // Document scanning optimization
        colorScheme: 'light',           // Better for document visibility
        permissions: ['camera'],
      },
    },
    
    // ===========================================
    // MOBILE PHONES - Reference Devices
    // ===========================================
    
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
  
  // Web server configuration (if needed for local development)
  // webServer: {
  //   command: 'npm run docker:start',
  //   url: 'http://localhost:8069',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120000,
  // },
});

/**
 * Helper to get device configuration by name
 * 
 * @param deviceName - Name of the custom device
 * @returns Device configuration object
 * 
 * @example
 * ```typescript
 * const galaxyTab = getDeviceConfig('Galaxy Tab Active4 Pro');
 * console.log(galaxyTab.viewport); // { width: 1200, height: 800 }
 * ```
 */
export function getDeviceConfig(deviceName: CustomDeviceName) {
  return CUSTOM_DEVICES[deviceName];
}

/**
 * Device viewport dimensions for runtime checks
 */
export const DEVICE_VIEWPORTS = {
  'galaxy-tab': { width: 1200, height: 800 },
  'ipad-mini': { width: 744, height: 1133 },
  'desktop': { width: 1280, height: 720 },
} as const;

/**
 * Type for device project names
 */
export type DeviceProjectName = 'galaxy-tab' | 'ipad-mini' | 'desktop';
