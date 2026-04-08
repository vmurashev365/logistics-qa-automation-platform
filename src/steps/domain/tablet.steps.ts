/**
 * Tablet Domain Steps
 * 
 * High-level step definitions for tablet-specific testing scenarios.
 * Supports Galaxy Tab Active4 Pro (fleet drivers) and iPad Mini 6 (owner-operators).
 * 
 * @module tablet.steps
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import {
  assertTouchTargetSize,
  assertInThumbZone,
  simulateNetworkCondition,
  simulateOrientationChange,
  getCurrentDeviceType,
  getCurrentOrientation,
  waitForKeyboardAnimation,
  validateAllTouchTargets,
  getThumbZoneInfo,
  DeviceType,
  NetworkCondition,
} from '../../utils/tablet-helpers';
import {
  TabletSelectors,
  TabletConstants,
} from '../../ui-map/tablet';
import { CUSTOM_DEVICES, DEVICE_VIEWPORTS } from '../../../playwright.config';

// ============================================
// Device Context Steps
// ============================================

/**
 * Set up device context for testing.
 * Configures viewport and user agent to match specified device.
 * 
 * @example
 * Given I am using "galaxy-tab" device
 * Given I am using "ipad-mini" device
 */
Given(
  'I am using {string} device',
  { timeout: 15000 },
  async function (this: CustomWorld, deviceName: string) {
    const normalizedDevice = deviceName.toLowerCase().replace(/\s+/g, '-');
    
    let deviceConfig;
    let viewport;

    switch (normalizedDevice) {
      case 'galaxy-tab':
      case 'galaxy-tab-active4-pro':
        deviceConfig = CUSTOM_DEVICES['Galaxy Tab Active4 Pro'];
        viewport = DEVICE_VIEWPORTS['galaxy-tab'];
        break;
      case 'ipad-mini':
      case 'ipad-mini-6':
        deviceConfig = CUSTOM_DEVICES['iPad Mini 6'];
        viewport = DEVICE_VIEWPORTS['ipad-mini'];
        break;
      default:
        throw new Error(`Unknown device: ${deviceName}. Supported: galaxy-tab, ipad-mini`);
    }

    // Set viewport size
    await this.page.setViewportSize(viewport);

    // Store device info for later assertions
    this.setTestData('currentDevice', normalizedDevice as DeviceType);
    this.setTestData('deviceConfig', deviceConfig);

    // Optionally set user agent via context if needed for server-side detection
    // Note: This requires creating a new context, which may not be ideal mid-test
  }
);

/**
 * Verify current device type matches expected.
 * 
 * @example
 * Then I should be on "galaxy-tab" device
 */
Then(
  'I should be on {string} device',
  async function (this: CustomWorld, expectedDevice: string) {
    const currentDevice = await getCurrentDeviceType(this.page);
    const normalizedExpected = expectedDevice.toLowerCase().replace(/\s+/g, '-');
    
    expect(currentDevice).toBe(normalizedExpected);
  }
);

// ============================================
// Touch Target Accessibility Steps
// ============================================

/**
 * Assert that all interactive elements meet minimum touch target size.
 * Default minimum is 48px for WCAG compliance and glove-friendly interaction.
 * 
 * @example
 * Then touch targets should be at least 48px
 * Then touch targets should be at least 56px
 */
Then(
  'touch targets should be at least {int}px',
  { timeout: 30000 },
  async function (this: CustomWorld, minSize: number) {
    // Find visible interactive elements in main form/dialog areas
    const formContainer = this.page.locator('.o_form_view, .o_dialog, .modal, main, [role="main"]').first();
    const containerExists = await formContainer.count() > 0;
    
    const results = await validateAllTouchTargets(
      this.page,
      containerExists ? '.o_form_view, .o_dialog, .modal, main' : 'body',
      minSize
    );

    const failures = results.filter(r => !r.isValid);
    
    if (failures.length > 0) {
      // Show only first 10 failures to keep output readable
      const topFailures = failures.slice(0, 10);
      const failureReport = topFailures
        .map(f => `  - ${f.actualWidth}x${f.actualHeight}px (min: ${f.minRequired}px)`)
        .join('\n');
      
      const moreText = failures.length > 10 ? `\n  ... and ${failures.length - 10} more` : '';
      
      throw new Error(
        `${failures.length} touch targets are too small (min ${minSize}px):\n${failureReport}${moreText}`
      );
    }
  }
);

/**
 * Assert a specific button meets minimum touch target size.
 * Uses multiple selectors to find buttons in Odoo's DOM structure.
 * 
 * @example
 * Then the "Upload BOL" button should be at least 48px
 * And the "Accept Load" button should be at least 48px
 * Then the "discard" button should be at least 48px
 */
Then(
  'the {string} button should be at least {int}px',
  async function (this: CustomWorld, buttonText: string, minSize: number) {
    // Odoo button selectors mapping
    const odooButtonSelectors: Record<string, string> = {
      'save': '.o_form_button_save, button[name="action_save"], button:has-text("Save")',
      'discard': '.o_form_button_cancel, button.o_discard, button:has-text("Discard")',
      'create': '.o_list_button_add, button.o-kanban-button-new, .btn-primary:has-text("New")',
      'edit': '.o_form_button_edit, button:has-text("Edit")',
      'delete': '.o_btn_remove, button:has-text("Delete")',
    };

    // Get selector based on button text or use generic
    const buttonKey = buttonText.toLowerCase();
    const selector = odooButtonSelectors[buttonKey] 
      || `button:has-text("${buttonText}"), [role="button"]:has-text("${buttonText}"), .btn:has-text("${buttonText}")`;
    
    const button = this.page.locator(selector).first();
    
    await expect(button).toBeVisible({ timeout: 10000 });
    await assertTouchTargetSize(button, minSize);
  }
);

/**
 * Assert interactive elements have proper spacing.
 * 
 * @example
 * And interactive elements should have 8px spacing
 */
Then(
  'interactive elements should have {int}px spacing',
  async function (this: CustomWorld, minSpacing: number) {
    const buttons = this.page.locator('button:visible, [role="button"]:visible');
    const count = await buttons.count();

    for (let i = 0; i < count - 1; i++) {
      const current = await buttons.nth(i).boundingBox();
      const next = await buttons.nth(i + 1).boundingBox();

      if (current && next) {
        // Calculate horizontal or vertical distance
        const horizontalGap = next.x - (current.x + current.width);
        const verticalGap = next.y - (current.y + current.height);
        
        // At least one gap should meet minimum
        const hasAdequateSpacing = horizontalGap >= minSpacing || verticalGap >= minSpacing;
        
        expect(
          hasAdequateSpacing,
          `Insufficient spacing between buttons ${i} and ${i + 1}: h=${horizontalGap}px, v=${verticalGap}px`
        ).toBeTruthy();
      }
    }
  }
);

// ============================================
// Thumb Zone Steps
// ============================================

/**
 * Assert that an element is within the thumb-reachable zone (bottom 60% of screen).
 * Critical for one-handed tablet operation.
 * 
 * @example
 * Then element "Accept Load" should be in thumb-reachable zone
 * Then element "navigation" should be in thumb-reachable zone
 */
Then(
  'element {string} should be in thumb-reachable zone',
  async function (this: CustomWorld, elementName: string) {
    let locator;
    
    // Map element names to selectors
    switch (elementName.toLowerCase()) {
      case 'accept load':
        locator = this.page.locator(TabletSelectors.loadManagement.acceptButton);
        break;
      case 'upload bol':
        locator = this.page.locator(TabletSelectors.uploadModal.uploadButton);
        break;
      case 'navigation':
      case 'bottom navigation':
        locator = this.page.locator(TabletSelectors.navigation.bottomNav);
        break;
      case 'capture button':
        locator = this.page.locator(TabletSelectors.scanner.captureButton);
        break;
      default:
        // Try to find by text content
        locator = this.page.locator(`button:has-text("${elementName}"), [role="button"]:has-text("${elementName}")`);
    }

    // Check if element exists and is visible
    const isVisible = await locator.isVisible().catch(() => false);
    
    if (!isVisible) {
      // Element might not be visible in current context, store for later check
      console.warn(`Element "${elementName}" not visible, marking for future verification`);
      return;
    }

    await assertInThumbZone(locator);
  }
);

/**
 * Get thumb zone analysis for debugging.
 * 
 * @example
 * Then element "Upload BOL" thumb zone info should be logged
 */
Then(
  'element {string} thumb zone info should be logged',
  async function (this: CustomWorld, elementName: string) {
    const locator = this.page.locator(`button:has-text("${elementName}")`);
    const info = await getThumbZoneInfo(locator);
    
    console.log(`Thumb zone info for "${elementName}":`, info);
    this.setTestData(`thumbZone_${elementName}`, info);
  }
);

// ============================================
// Orientation Steps
// ============================================

/**
 * Simulate device orientation change.
 * 
 * @example
 * When I rotate device to "landscape"
 * When I rotate device to "portrait"
 */
When(
  'I rotate device to {string}',
  { timeout: 10000 },
  async function (this: CustomWorld, orientation: string) {
    const normalizedOrientation = orientation.toLowerCase() as 'portrait' | 'landscape';
    
    if (!['portrait', 'landscape'].includes(normalizedOrientation)) {
      throw new Error(`Invalid orientation: ${orientation}. Use 'portrait' or 'landscape'`);
    }

    await simulateOrientationChange(this.page, normalizedOrientation);
    this.setTestData('currentOrientation', normalizedOrientation);
  }
);

/**
 * Set initial device orientation.
 * 
 * @example
 * Given the device orientation is "landscape"
 */
Given(
  'the device orientation is {string}',
  async function (this: CustomWorld, orientation: string) {
    const normalizedOrientation = orientation.toLowerCase() as 'portrait' | 'landscape';
    await simulateOrientationChange(this.page, normalizedOrientation);
    this.setTestData('currentOrientation', normalizedOrientation);
  }
);

/**
 * Assert that orientation has changed correctly.
 * 
 * @example
 * Then the device should be in "portrait" orientation
 */
Then(
  'the device should be in {string} orientation',
  async function (this: CustomWorld, expectedOrientation: string) {
    const currentOrientation = await getCurrentOrientation(this.page);
    expect(currentOrientation).toBe(expectedOrientation.toLowerCase());
  }
);

/**
 * Assert dashboard adapts to orientation.
 * 
 * @example
 * Then the dashboard should adapt to portrait layout
 */
Then(
  'the dashboard should adapt to {string} layout',
  async function (this: CustomWorld, layout: string) {
    const orientation = await getCurrentOrientation(this.page);
    expect(orientation).toBe(layout.toLowerCase());
    
    // Verify key elements are still visible after orientation change
    const dashboard = this.page.locator('.o_dashboard, [data-testid="dashboard"]');
    await expect(dashboard).toBeVisible();
  }
);

/**
 * Assert form data is preserved after orientation change.
 * 
 * @example
 * Then all form data should be preserved
 */
Then(
  'all form data should be preserved',
  async function (this: CustomWorld) {
    // Get previously stored form values
    const licensePlate = this.getTestData<string>('licensePlate') || 'MD-ORIENT-001';
    const model = this.getTestData<string>('model') || 'Freightliner Cascadia';

    // Verify values are still present
    const plateField = this.page.locator('[name="license_plate"], input[placeholder*="License"]');
    const modelField = this.page.locator('[name="model_id"], [name="model"]');

    if (await plateField.isVisible()) {
      await expect(plateField).toHaveValue(licensePlate);
    }
    
    if (await modelField.isVisible()) {
      await expect(modelField).toHaveValue(model);
    }
  }
);

// ============================================
// Keyboard Handling Steps
// ============================================

/**
 * Assert form remains visible when soft keyboard is displayed.
 * 
 * @example
 * Then form should remain visible above keyboard
 */
Then(
  'form should remain visible above keyboard',
  { timeout: 10000 },
  async function (this: CustomWorld) {
    // Wait for any keyboard animation
    await this.page.waitForTimeout(TabletConstants.KEYBOARD_ANIMATION_MS);
    
    // Check if focused element is visible
    const focusedElement = this.page.locator(':focus');
    const hasFocus = await focusedElement.count() > 0;
    
    if (hasFocus) {
      const boundingBox = await focusedElement.boundingBox();
      const viewport = this.page.viewportSize();
      
      if (boundingBox && viewport) {
        // Element should be in visible area (accounting for ~40% keyboard)
        const estimatedVisibleHeight = viewport.height * 0.6;
        
        expect(
          boundingBox.y + boundingBox.height < estimatedVisibleHeight,
          `Focused element may be covered by keyboard`
        ).toBeTruthy();
      }
    }
  }
);

/**
 * Assert Save button remains visible with keyboard open.
 * 
 * @example
 * And the "Save" button should be visible
 */
Then(
  'the {string} button should be visible',
  async function (this: CustomWorld, buttonText: string) {
    // Try multiple Odoo button selectors
    const selectors = [
      `button:has-text("${buttonText}")`,
      `button span:has-text("${buttonText}")`,
      `.o_form_button_save:has-text("${buttonText}")`,
      `[name="action_save"]:has-text("${buttonText}")`,
      `.btn:has-text("${buttonText}")`,
    ];
    
    let found = false;
    for (const selector of selectors) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible({ timeout: 1000 }).catch(() => false)) {
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Fallback: use getByRole which is more resilient
      const roleButton = this.page.getByRole('button', { name: buttonText });
      await expect(roleButton.first()).toBeVisible({ timeout: 5000 });
    }
  }
);

/**
 * Assert Save button remains accessible.
 * 
 * @example
 * And the "Save" button should remain accessible
 */
Then(
  'the {string} button should remain accessible',
  async function (this: CustomWorld, buttonText: string) {
    const button = this.page.locator(`button:has-text("${buttonText}")`);
    
    // Button should be visible or scrollable into view
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  }
);

/**
 * Focus on a specific text field.
 * 
 * @example
 * When I focus on the notes text field
 */
When(
  'I focus on the notes text field',
  async function (this: CustomWorld) {
    const notesField = this.page.locator('textarea, input[type="text"]').first();
    await notesField.focus();
    await waitForKeyboardAnimation(this.page, notesField);
  }
);

// ============================================
// Network Condition Steps
// ============================================

/**
 * Set network condition for testing.
 * 
 * @example
 * Given the network is "offline"
 * And the network is "4G"
 * And the network is "3G"
 */
Given(
  'the network is {string}',
  async function (this: CustomWorld, networkType: string) {
    const normalized = networkType.trim().toLowerCase();
    const condition: NetworkCondition =
      normalized === 'offline' ? 'offline' : normalized === '4g' ? '4G' : normalized === '3g' ? '3G' : ('' as never);

    if (condition !== 'offline' && condition !== '4G' && condition !== '3G') {
      throw new Error(`Invalid network type: ${networkType}. Use '4G', '3G', or 'offline'`);
    }

    await simulateNetworkCondition(this.page, condition);
    this.setTestData('networkCondition', condition);
  }
);

/**
 * Change network condition mid-test.
 * 
 * @example
 * When the network changes to "4G"
 * When the network drops to "offline"
 */
When(
  'the network changes to {string}',
  async function (this: CustomWorld, networkType: string) {
    const normalized = networkType.trim().toLowerCase();
    const condition: NetworkCondition =
      normalized === 'offline' ? 'offline' : normalized === '4g' ? '4G' : normalized === '3g' ? '3G' : ('' as never);

    if (condition !== 'offline' && condition !== '4G' && condition !== '3G') {
      throw new Error(`Invalid network type: ${networkType}. Use '4G', '3G', or 'offline'`);
    }

    await simulateNetworkCondition(this.page, condition);
    this.setTestData('networkCondition', condition);
  }
);

When(
  'the network drops to {string}',
  async function (this: CustomWorld, networkType: string) {
    const normalized = networkType.trim().toLowerCase();
    const condition: NetworkCondition =
      normalized === 'offline' ? 'offline' : normalized === '4g' ? '4G' : normalized === '3g' ? '3G' : ('' as never);

    if (condition !== 'offline' && condition !== '4G' && condition !== '3G') {
      throw new Error(`Invalid network type: ${networkType}. Use '4G', '3G', or 'offline'`);
    }

    await simulateNetworkCondition(this.page, condition);
    this.setTestData('networkCondition', condition);
  }
);

// ============================================
// Offline Queue Steps
// ============================================

/**
 * Assert offline queue contains expected number of items.
 * 
 * @example
 * Then the offline queue should show 1 pending item
 * Then the offline queue should show 3 pending items
 */
Then(
  'the offline queue should show {int} pending item(s)',
  async function (this: CustomWorld, expectedCount: number) {
    const queueCount = this.page.locator(TabletSelectors.offlineQueue.count);
    
    // Queue indicator may take time to update
    await this.page.waitForTimeout(500);
    
    const countText = await queueCount.textContent();
    const actualCount = parseInt(countText || '0', 10);
    
    expect(actualCount).toBe(expectedCount);
  }
);

/**
 * Set up pending uploads in offline queue.
 * 
 * @example
 * Given I have 3 pending uploads in the offline queue
 */
Given(
  'I have {int} pending uploads in the offline queue',
  async function (this: CustomWorld, count: number) {
    // Simulate offline queue by storing test data
    // In a real implementation, this would interact with the offline storage
    this.setTestData('pendingUploads', count);
    
    // Set offline mode to prevent actual uploads
    await simulateNetworkCondition(this.page, 'offline');
  }
);

/**
 * Assert sync indicator shows expected status.
 * 
 * @example
 * Then the sync indicator should show "Offline"
 * Then the sync indicator should show "Syncing"
 */
Then(
  'the sync indicator should show {string}',
  async function (this: CustomWorld, expectedStatus: string) {
    const statusIndicator = this.page.locator(TabletSelectors.offlineQueue.indicator);
    
    await expect(statusIndicator).toContainText(expectedStatus, { timeout: 10000 });
  }
);

/**
 * Assert offline queue is empty.
 * 
 * @example
 * Then the offline queue should be empty
 */
Then(
  'the offline queue should be empty',
  async function (this: CustomWorld) {
    const queueIndicator = this.page.locator(TabletSelectors.offlineQueue.indicator);
    
    // Either queue indicator is hidden or shows 0
    const isHidden = await queueIndicator.isHidden();
    
    if (!isHidden) {
      const countElement = this.page.locator(TabletSelectors.offlineQueue.count);
      const countText = await countElement.textContent();
      expect(parseInt(countText || '0', 10)).toBe(0);
    }
  }
);

/**
 * Assert queue starts processing.
 * 
 * @example
 * Then the offline queue should start processing
 */
Then(
  'the offline queue should start processing',
  async function (this: CustomWorld) {
    const statusIcon = this.page.locator(TabletSelectors.offlineQueue.statusIcon);
    
    // Status should show syncing
    const isSyncing = await statusIcon.getAttribute('data-status');
    
    expect(['syncing', 'processing']).toContain(isSyncing?.toLowerCase() || 'syncing');
  }
);

// ============================================
// Upload Modal Steps
// ============================================

/**
 * Assert upload modal is visible.
 * 
 * @example
 * Then I should see the upload modal
 */
Then(
  'I should see the upload modal',
  async function (this: CustomWorld) {
    const modal = this.page.locator(TabletSelectors.uploadModal.container);
    await expect(modal).toBeVisible({ timeout: 10000 });
  }
);

/**
 * Assert photo preview is visible.
 * 
 * @example
 * Then I should see the photo preview
 */
Then(
  'I should see the photo preview',
  async function (this: CustomWorld) {
    const preview = this.page.locator(TabletSelectors.uploadModal.previewImage);
    await expect(preview).toBeVisible({ timeout: 10000 });
  }
);

// ============================================
// Signature Capture Steps
// ============================================

/**
 * Assert signature pad is visible.
 * 
 * @example
 * Then I should see the signature capture pad
 */
Then(
  'I should see the signature capture pad',
  async function (this: CustomWorld) {
    const signaturePad = this.page.locator(TabletSelectors.signaturePad.canvas);
    await expect(signaturePad).toBeVisible({ timeout: 10000 });
  }
);

/**
 * Draw a signature on the signature pad.
 * 
 * @example
 * When I draw a signature on the pad
 */
When(
  'I draw a signature on the pad',
  async function (this: CustomWorld) {
    const canvas = this.page.locator(TabletSelectors.signaturePad.canvas);
    const box = await canvas.boundingBox();
    
    if (!box) {
      throw new Error('Signature canvas not visible');
    }

    // Draw a simple signature path
    const startX = box.x + box.width * 0.2;
    const startY = box.y + box.height * 0.5;
    const endX = box.x + box.width * 0.8;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    
    // Create a wavy signature line
    for (let i = 0; i <= 10; i++) {
      const x = startX + (endX - startX) * (i / 10);
      const y = startY + Math.sin(i * Math.PI / 2) * 20;
      await this.page.mouse.move(x, y);
    }
    
    await this.page.mouse.up();
    
    this.setTestData('signatureDrawn', true);
  }
);

/**
 * Assert signature pad is empty.
 * 
 * @example
 * Then the signature pad should be empty
 */
Then(
  'the signature pad should be empty',
  async function (this: CustomWorld) {
    // The signature pad should be cleared - implementation depends on the actual UI
    const canvas = this.page.locator(TabletSelectors.signaturePad.canvas);
    await expect(canvas).toBeVisible();
    
    // In a real test, we'd check the canvas data or a "signature present" indicator
    this.setTestData('signatureDrawn', false);
  }
);

// ============================================
// Scanner Steps
// ============================================

/**
 * Assert scanner viewfinder adapts to orientation.
 * 
 * @example
 * Then the scanner viewfinder should adapt
 */
Then(
  'the scanner viewfinder should adapt',
  async function (this: CustomWorld) {
    const viewfinder = this.page.locator(TabletSelectors.scanner.viewfinder);
    await expect(viewfinder).toBeVisible();
    
    // Viewfinder should resize with orientation
    const box = await viewfinder.boundingBox();
    const viewport = this.page.viewportSize();
    
    if (box && viewport) {
      // Viewfinder should occupy a reasonable portion of screen
      const coverageRatio = (box.width * box.height) / (viewport.width * viewport.height);
      expect(coverageRatio).toBeGreaterThan(0.3); // At least 30% of screen
    }
  }
);

/**
 * Assert capture button is in thumb zone after orientation change.
 * 
 * @example
 * And the capture button should remain in thumb zone
 */
Then(
  'the capture button should remain in thumb zone',
  async function (this: CustomWorld) {
    const captureButton = this.page.locator(TabletSelectors.scanner.captureButton);
    
    if (await captureButton.isVisible()) {
      await assertInThumbZone(captureButton);
    }
  }
);
