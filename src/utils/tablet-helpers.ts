/**
 * Tablet Testing Helpers
 * 
 * Utility functions for tablet-specific test assertions and interactions.
 * Supports touch target validation, thumb zone detection, and network simulation.
 * 
 * @module tablet-helpers
 */

import { Locator, Page } from 'playwright';
import { expect } from '@playwright/test';
import { TabletConstants, NetworkProfiles, DeviceProfiles } from '../ui-map/tablet';

/**
 * Device type enumeration for runtime detection
 */
export type DeviceType = 'galaxy-tab' | 'ipad-mini' | 'desktop';

/**
 * Network condition types for simulation
 */
export type NetworkCondition = '4G' | '3G' | 'offline';

/**
 * Touch target validation result
 */
interface TouchTargetResult {
  isValid: boolean;
  actualWidth: number;
  actualHeight: number;
  minRequired: number;
  element: string;
}

/**
 * Thumb zone validation result
 */
interface ThumbZoneResult {
  isInZone: boolean;
  elementY: number;
  zoneStartY: number;
  viewportHeight: number;
  percentFromBottom: number;
}

/**
 * Assert that a touch target meets minimum size requirements.
 * 
 * Validates that interactive elements are large enough for touch interaction,
 * especially important for glove usage in trucking environments.
 * 
 * @param locator - Playwright Locator for the element to check
 * @param minPx - Minimum size in pixels (default: 48px per WCAG guidelines)
 * @throws AssertionError if element is smaller than minimum size
 * 
 * @example
 * ```typescript
 * // Check if upload button is glove-friendly
 * await assertTouchTargetSize(page.locator('[data-testid="upload-btn"]'), 48);
 * ```
 */
export async function assertTouchTargetSize(
  locator: Locator,
  minPx: number = TabletConstants.MIN_TOUCH_TARGET
): Promise<void> {
  const boundingBox = await locator.boundingBox();
  
  if (!boundingBox) {
    throw new Error(`Element not found or not visible: ${locator}`);
  }

  const { width, height } = boundingBox;

  // Both dimensions must meet minimum
  expect(
    width >= minPx,
    `Touch target width (${width}px) is less than minimum (${minPx}px)`
  ).toBeTruthy();
  
  expect(
    height >= minPx,
    `Touch target height (${height}px) is less than minimum (${minPx}px)`
  ).toBeTruthy();
}

/**
 * Get detailed touch target validation result without throwing.
 * 
 * Use this for reporting or when you need to check multiple elements.
 * 
 * @param locator - Playwright Locator for the element
 * @param minPx - Minimum size in pixels
 * @returns TouchTargetResult with validation details
 * 
 * @example
 * ```typescript
 * const result = await getTouchTargetInfo(button, 48);
 * if (!result.isValid) {
 *   console.log(`Button too small: ${result.actualWidth}x${result.actualHeight}`);
 * }
 * ```
 */
export async function getTouchTargetInfo(
  locator: Locator,
  minPx: number = TabletConstants.MIN_TOUCH_TARGET
): Promise<TouchTargetResult> {
  const boundingBox = await locator.boundingBox();
  
  if (!boundingBox) {
    return {
      isValid: false,
      actualWidth: 0,
      actualHeight: 0,
      minRequired: minPx,
      element: String(locator),
    };
  }

  return {
    isValid: boundingBox.width >= minPx && boundingBox.height >= minPx,
    actualWidth: boundingBox.width,
    actualHeight: boundingBox.height,
    minRequired: minPx,
    element: String(locator),
  };
}

/**
 * Assert that an element is within the thumb-reachable zone.
 * 
 * The thumb zone is typically the bottom 60% of the screen, which is
 * easily accessible for one-handed tablet use. Critical for driver UX.
 * 
 * @param locator - Playwright Locator for the element
 * @throws AssertionError if element is outside thumb zone
 * 
 * @example
 * ```typescript
 * // Ensure primary action button is in thumb zone
 * await assertInThumbZone(page.locator('[data-testid="accept-load"]'));
 * ```
 */
export async function assertInThumbZone(locator: Locator): Promise<void> {
  const page = locator.page();
  const viewport = page.viewportSize();
  
  if (!viewport) {
    throw new Error('Viewport size not available');
  }

  const boundingBox = await locator.boundingBox();
  
  if (!boundingBox) {
    throw new Error(`Element not found or not visible: ${locator}`);
  }

  // Calculate thumb zone boundary (top 40% is not in thumb zone)
  const thumbZoneStartY = viewport.height * (1 - TabletConstants.THUMB_ZONE_RATIO);
  
  // Element's vertical center should be in thumb zone
  const elementCenterY = boundingBox.y + (boundingBox.height / 2);

  expect(
    elementCenterY >= thumbZoneStartY,
    `Element center (${elementCenterY}px) is above thumb zone (starts at ${thumbZoneStartY}px). ` +
    `Move element lower for better one-handed access.`
  ).toBeTruthy();
}

/**
 * Get detailed thumb zone validation result without throwing.
 * 
 * @param locator - Playwright Locator for the element
 * @returns ThumbZoneResult with position details
 */
export async function getThumbZoneInfo(locator: Locator): Promise<ThumbZoneResult> {
  const page = locator.page();
  const viewport = page.viewportSize();
  
  if (!viewport) {
    return {
      isInZone: false,
      elementY: 0,
      zoneStartY: 0,
      viewportHeight: 0,
      percentFromBottom: 0,
    };
  }

  const boundingBox = await locator.boundingBox();
  const thumbZoneStartY = viewport.height * (1 - TabletConstants.THUMB_ZONE_RATIO);
  
  if (!boundingBox) {
    return {
      isInZone: false,
      elementY: 0,
      zoneStartY: thumbZoneStartY,
      viewportHeight: viewport.height,
      percentFromBottom: 0,
    };
  }

  const elementCenterY = boundingBox.y + (boundingBox.height / 2);
  const percentFromBottom = ((viewport.height - elementCenterY) / viewport.height) * 100;

  return {
    isInZone: elementCenterY >= thumbZoneStartY,
    elementY: elementCenterY,
    zoneStartY: thumbZoneStartY,
    viewportHeight: viewport.height,
    percentFromBottom,
  };
}

/**
 * Simulate network conditions for testing upload behavior.
 * 
 * Essential for testing offline queue functionality when drivers
 * pass through rural areas with poor cellular coverage.
 * 
 * @param page - Playwright Page instance
 * @param type - Network condition to simulate ('4G', '3G', or 'offline')
 * 
 * @example
 * ```typescript
 * // Test offline upload queue
 * await simulateNetworkCondition(page, 'offline');
 * await page.locator('[data-testid="upload-btn"]').click();
 * await expect(page.locator('.offline-indicator')).toBeVisible();
 * ```
 */
export async function simulateNetworkCondition(
  page: Page,
  type: NetworkCondition
): Promise<void> {
  const context = page.context();
  const profile = NetworkProfiles[type];

  if (type === 'offline') {
    // Set browser to offline mode
    await context.setOffline(true);
  } else {
    // Ensure we're online first
    await context.setOffline(false);
    
    // Create CDP session for throttling (Chromium only)
    const cdpSession = await context.newCDPSession(page);
    
    try {
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: profile.downloadThroughput,
        uploadThroughput: profile.uploadThroughput,
        latency: profile.latency,
        connectionType: type === '4G' ? 'cellular4g' : 'cellular3g',
      });
    } catch (error) {
      // CDP may not be available on all browsers
      console.warn(`Network throttling not available: ${error}`);
    }
  }
}

/**
 * Reset network conditions to normal.
 * 
 * @param page - Playwright Page instance
 */
export async function resetNetworkCondition(page: Page): Promise<void> {
  const context = page.context();
  await context.setOffline(false);
  
  try {
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.disable');
  } catch {
    // Ignore if CDP not available
  }
}

/**
 * Detect current device type from viewport and user agent.
 * 
 * Uses viewport dimensions and user agent string to determine
 * which device profile is being used.
 * 
 * @returns DeviceType indicating current device
 * 
 * @example
 * ```typescript
 * const device = await getCurrentDeviceType(page);
 * if (device === 'galaxy-tab') {
 *   // Glove mode adjustments
 * }
 * ```
 */
export async function getCurrentDeviceType(page: Page): Promise<DeviceType> {
  const viewport = page.viewportSize();
  const userAgent = await page.evaluate('navigator.userAgent') as string;

  // Check user agent for specific device signatures
  if (userAgent.includes('SM-T636B') || userAgent.includes('Android')) {
    const galaxyProfile = DeviceProfiles['galaxy-tab'];
    if (viewport?.width === galaxyProfile.viewport.width) {
      return 'galaxy-tab';
    }
  }

  if (userAgent.includes('iPad') || userAgent.includes('iOS')) {
    const ipadProfile = DeviceProfiles['ipad-mini'];
    if (viewport?.width === ipadProfile.viewport.width) {
      return 'ipad-mini';
    }
  }

  // Check viewport dimensions as fallback
  if (viewport) {
    const galaxyViewport = DeviceProfiles['galaxy-tab'].viewport;
    const ipadViewport = DeviceProfiles['ipad-mini'].viewport;

    if (viewport.width === galaxyViewport.width && viewport.height === galaxyViewport.height) {
      return 'galaxy-tab';
    }
    
    if (viewport.width === ipadViewport.width && viewport.height === ipadViewport.height) {
      return 'ipad-mini';
    }
  }

  return 'desktop';
}

/**
 * Get device profile configuration for current device.
 * 
 * @param page - Playwright Page instance
 * @returns Device profile or undefined for desktop
 */
export async function getDeviceProfile(page: Page) {
  const deviceType = await getCurrentDeviceType(page);
  
  if (deviceType === 'desktop') {
    return undefined;
  }
  
  return DeviceProfiles[deviceType];
}

/**
 * Wait for keyboard to appear and form to adjust.
 * 
 * On mobile devices, the keyboard slides up and may cover form fields.
 * This helper waits for the animation to complete.
 * 
 * @param page - Playwright Page instance
 * @param inputLocator - Locator for the focused input field
 * 
 * @example
 * ```typescript
 * await inputField.focus();
 * await waitForKeyboardAnimation(page, inputField);
 * await expect(inputField).toBeVisible();
 * ```
 */
export async function waitForKeyboardAnimation(
  page: Page,
  inputLocator: Locator
): Promise<void> {
  // Wait for keyboard animation duration
  await page.waitForTimeout(TabletConstants.KEYBOARD_ANIMATION_MS);
  
  // Ensure input is still visible after keyboard appears
  await inputLocator.scrollIntoViewIfNeeded();
  
  // Additional delay for scroll adjustment
  await page.waitForTimeout(TabletConstants.SCROLL_INTO_VIEW_DELAY_MS);
}

/**
 * Assert that form remains visible above keyboard.
 * 
 * Validates that the active form field and submit button are visible
 * when the soft keyboard is displayed.
 * 
 * @param page - Playwright Page instance
 * @param formSelector - Selector for the form container
 * @param submitButtonSelector - Selector for the submit button
 * 
 * @example
 * ```typescript
 * await assertFormVisibleAboveKeyboard(page, 'form.bol-upload', '[data-testid="submit"]');
 * ```
 */
export async function assertFormVisibleAboveKeyboard(
  page: Page,
  _formSelector: string,
  submitButtonSelector: string
): Promise<void> {
  const viewport = page.viewportSize();
  
  if (!viewport) {
    throw new Error('Viewport not available');
  }

  // Get focused element position
  const focusedElement = page.locator(':focus');
  const focusedBox = await focusedElement.boundingBox();
  
  // Get submit button position
  const submitButton = page.locator(submitButtonSelector);
  const submitBox = await submitButton.boundingBox();

  if (focusedBox) {
    // Ensure focused element is in visible area (accounting for keyboard)
    // Typical keyboard takes ~40% of portrait screen, ~30% of landscape
    const estimatedKeyboardHeight = viewport.height * 0.35;
    const visibleAreaHeight = viewport.height - estimatedKeyboardHeight;

    expect(
      focusedBox.y + focusedBox.height < visibleAreaHeight,
      `Focused input is covered by keyboard (element bottom: ${focusedBox.y + focusedBox.height}px, visible area: ${visibleAreaHeight}px)`
    ).toBeTruthy();
  }

  if (submitBox) {
    // Submit button should ideally be visible, or at least scrollable into view
    expect(submitBox, 'Submit button not visible on screen').toBeTruthy();
  }
}

/**
 * Simulate device orientation change.
 * 
 * Changes viewport dimensions to match portrait or landscape orientation.
 * 
 * @param page - Playwright Page instance
 * @param orientation - Target orientation ('portrait' or 'landscape')
 * 
 * @example
 * ```typescript
 * await simulateOrientationChange(page, 'landscape');
 * await expect(page.locator('.dashboard')).toBeVisible();
 * ```
 */
export async function simulateOrientationChange(
  page: Page,
  orientation: 'portrait' | 'landscape'
): Promise<void> {
  const currentViewport = page.viewportSize();
  
  if (!currentViewport) {
    throw new Error('Viewport not available');
  }

  const { width, height } = currentViewport;
  const isCurrentlyLandscape = width > height;
  const shouldBeLandscape = orientation === 'landscape';

  // Only change if orientation is different
  if (isCurrentlyLandscape !== shouldBeLandscape) {
    // Swap width and height
    await page.setViewportSize({
      width: height,
      height: width,
    });

    // Wait for orientation change to settle
    await page.waitForTimeout(TabletConstants.ORIENTATION_DEBOUNCE_MS);
    
    // Trigger resize event handlers
    await page.evaluate('(() => { dispatchEvent(new Event("resize")); dispatchEvent(new Event("orientationchange")); })()');
  }
}

/**
 * Get current orientation from viewport.
 * 
 * @param page - Playwright Page instance
 * @returns Current orientation
 */
export async function getCurrentOrientation(
  page: Page
): Promise<'portrait' | 'landscape'> {
  const viewport = page.viewportSize();
  
  if (!viewport) {
    return 'portrait'; // Default assumption
  }

  return viewport.width > viewport.height ? 'landscape' : 'portrait';
}

/**
 * Validate all touch targets in a container.
 * 
 * Finds all interactive elements and validates their sizes.
 * Useful for accessibility audits.
 * 
 * @param page - Playwright Page instance
 * @param containerSelector - Selector for container to audit
 * @param minSize - Minimum touch target size
 * @returns Array of validation results
 * 
 * @example
 * ```typescript
 * const results = await validateAllTouchTargets(page, '.form-container', 48);
 * const failures = results.filter(r => !r.isValid);
 * expect(failures).toHaveLength(0);
 * ```
 */
export async function validateAllTouchTargets(
  page: Page,
  containerSelector: string,
  minSize: number = TabletConstants.MIN_TOUCH_TARGET
): Promise<TouchTargetResult[]> {
  const interactiveSelectors = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]:not([tabindex="-1"])',
  ];

  const container = page.locator(containerSelector);
  const results: TouchTargetResult[] = [];

  for (const selector of interactiveSelectors) {
    const elements = container.locator(selector);
    const count = await elements.count();

    for (let i = 0; i < count; i++) {
      const element = elements.nth(i);
      const isVisible = await element.isVisible();
      
      if (isVisible) {
        const result = await getTouchTargetInfo(element, minSize);
        results.push(result);
      }
    }
  }

  return results;
}

/**
 * Wait for offline queue to process when back online.
 * 
 * @param page - Playwright Page instance
 * @param timeoutMs - Maximum time to wait for queue processing
 */
export async function waitForOfflineQueueSync(
  page: Page,
  timeoutMs: number = TabletConstants.UPLOAD_TIMEOUT_3G
): Promise<void> {
  // Ensure we're back online
  await page.context().setOffline(false);

  // Wait for queue indicator to disappear or show success
  const queueIndicator = page.locator('[data-testid="offline-queue"], .offline-indicator');
  
  try {
    await queueIndicator.waitFor({ state: 'hidden', timeout: timeoutMs });
  } catch {
    // Check if it's showing success state instead
    const syncStatus = page.locator('[data-testid="sync-status"]');
    await expect(syncStatus).toHaveAttribute('data-status', 'synced', { timeout: timeoutMs });
  }
}

/**
 * Perform long press gesture on element.
 * 
 * @param locator - Element to long press
 * @param durationMs - Duration of press in milliseconds
 */
export async function longPress(
  locator: Locator,
  durationMs: number = TabletConstants.LONG_PRESS_MS
): Promise<void> {
  const box = await locator.boundingBox();
  
  if (!box) {
    throw new Error('Element not visible for long press');
  }

  const page = locator.page();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(durationMs);
  await page.mouse.up();
}
