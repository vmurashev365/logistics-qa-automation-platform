/**
 * Assertion Step Definitions
 * Atomic steps for verifying UI state and content
 * Uses UI-MAP pattern for field resolution
 */

import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { UI_MAP, isValidFieldKey, getFieldAliases } from '../../ui-map';

/**
 * Then I should see {string} text
 * Verifies text is visible on the page
 */
Then('I should see {string} text', { timeout: 30000 }, async function (this: CustomWorld, text: string) {
  // Wait for the text to be visible (using body containsText from codegen)
  await expect(this.page.locator('body')).toContainText(text, { timeout: 15000 });
});

/**
 * Then I should not see {string} text
 * Verifies text is not visible on the page
 */
Then('I should not see {string} text', async function (this: CustomWorld, text: string) {
  const locator = this.page.getByText(text).first();
  await expect(locator).not.toBeVisible({ timeout: 5000 });
});

/**
 * Then I should see {string} heading
 * Verifies a heading with specific text is visible
 */
Then('I should see {string} heading', async function (this: CustomWorld, headingText: string) {
  const heading = this.page.getByRole('heading', { name: headingText });
  await expect(heading).toBeVisible({ timeout: 10000 });
});

/**
 * Then I should see {string} button
 * Verifies a button with specific text is visible
 */
Then('I should see {string} button', async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await expect(button).toBeVisible({ timeout: 10000 });
});

/**
 * Then I should not see {string} button
 * Verifies a button is not visible
 */
Then('I should not see {string} button', async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await expect(button).not.toBeVisible({ timeout: 5000 });
});

/**
 * Then {string} button should be enabled
 * Verifies a button is enabled
 */
Then('{string} button should be enabled', async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await expect(button).toBeEnabled({ timeout: 10000 });
});

/**
 * Then {string} button should be disabled
 * Verifies a button is disabled
 */
Then('{string} button should be disabled', async function (this: CustomWorld, buttonName: string) {
  const button = this.page.getByRole('button', { name: new RegExp(buttonName, 'i') });
  await expect(button).toBeDisabled({ timeout: 10000 });
});

/**
 * Then I should see {string} link
 * Verifies a link is visible
 */
Then('I should see {string} link', async function (this: CustomWorld, linkText: string) {
  const link = this.page.getByRole('link', { name: linkText });
  await expect(link).toBeVisible({ timeout: 10000 });
});

/**
 * Then {string} field should be visible
 * Verifies an input field is visible
 */
Then('{string} field should be visible', async function (this: CustomWorld, label: string) {
  const field = this.page.getByLabel(new RegExp(label, 'i'));
  await expect(field).toBeVisible({ timeout: 10000 });
});

/**
 * Then {string} field should contain {string}
 * Verifies an input field contains specific value
 * Supports UI-MAP field keys
 */
Then('{string} field should contain {string}', { timeout: 15000 }, async function (this: CustomWorld, fieldKey: string, expectedValue: string) {
  // Try to resolve from UI-MAP first
  let fieldLabel: string;
  
  if (isValidFieldKey(fieldKey)) {
    fieldLabel = UI_MAP.fields[fieldKey];
  } else {
    // Fallback to direct label (backward compatibility)
    fieldLabel = fieldKey;
  }
  
  // Get all possible aliases for this field
  const aliases = getFieldAliases(fieldKey);
  const labelsToTry = aliases.length > 0 ? aliases : [fieldLabel];
  
  // Odoo field label aliases
  const odooAliases: Record<string, string> = {
    'License Plate': 'License Plate?',
  };
  
  // Add Odoo aliases to the list
  for (const label of [...labelsToTry]) {
    if (odooAliases[label]) {
      labelsToTry.push(odooAliases[label]);
    }
  }
  
  // Try each label until one works
  let verified = false;
  for (const label of labelsToTry) {
    try {
      // Try textbox role first
      let field = this.page.getByRole('textbox', { name: label });
      if (await field.isVisible({ timeout: 1500 })) {
        await expect(field).toHaveValue(expectedValue, { timeout: 5000 });
        verified = true;
        break;
      }
      
      // Fallback to getByLabel
      field = this.page.getByLabel(label);
      if (await field.isVisible({ timeout: 1500 })) {
        await expect(field).toHaveValue(expectedValue, { timeout: 5000 });
        verified = true;
        break;
      }
    } catch {
      // Try next alias
    }
  }
  
  if (!verified) {
    // Final fallback: try by name attribute (snake_case)
    const snakeCaseKey = fieldKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    const fieldByName = this.page.locator(`[name="${snakeCaseKey}"] input, input[name="${snakeCaseKey}"]`);
    if (await fieldByName.isVisible({ timeout: 2000 })) {
      await expect(fieldByName).toHaveValue(expectedValue, { timeout: 5000 });
      verified = true;
    }
  }
  
  if (!verified) {
    throw new Error(`Could not verify field "${fieldKey}" (tried labels: ${labelsToTry.join(', ')})`);
  }
});

/**
 * Then {string} field should be empty
 * Verifies an input field is empty
 */
Then('{string} field should be empty', async function (this: CustomWorld, label: string) {
  const field = this.page.getByLabel(new RegExp(label, 'i'));
  await expect(field).toHaveValue('', { timeout: 10000 });
});

/**
 * Then {string} field should be required
 * Verifies an input field is required
 */
Then('{string} field should be required', async function (this: CustomWorld, label: string) {
  const field = this.page.getByLabel(new RegExp(label, 'i'));
  await expect(field).toHaveAttribute('required', '', { timeout: 10000 });
});

/**
 * Then {string} field should be readonly
 * Verifies an input field is readonly
 */
Then('{string} field should be readonly', async function (this: CustomWorld, label: string) {
  const field = this.page.getByLabel(new RegExp(label, 'i'));
  const isReadonly = await field.getAttribute('readonly');
  const isDisabled = await field.isDisabled();
  expect(isReadonly !== null || isDisabled).toBeTruthy();
});

/**
 * Then {string} checkbox should be checked
 * Verifies a checkbox is checked
 */
Then('{string} checkbox should be checked', async function (this: CustomWorld, label: string) {
  const checkbox = this.page.getByLabel(new RegExp(label, 'i'));
  await expect(checkbox).toBeChecked({ timeout: 10000 });
});

/**
 * Then {string} checkbox should be unchecked
 * Verifies a checkbox is not checked
 */
Then('{string} checkbox should be unchecked', async function (this: CustomWorld, label: string) {
  const checkbox = this.page.getByLabel(new RegExp(label, 'i'));
  await expect(checkbox).not.toBeChecked({ timeout: 10000 });
});

/**
 * Then the page should contain {string}
 * Verifies page body contains specific text
 */
Then('the page should contain {string}', async function (this: CustomWorld, text: string) {
  const body = this.page.locator('body');
  await expect(body).toContainText(text, { timeout: 10000 });
});

/**
 * Then the page should not contain {string}
 * Verifies page body does not contain specific text
 */
Then('the page should not contain {string}', async function (this: CustomWorld, text: string) {
  const body = this.page.locator('body');
  await expect(body).not.toContainText(text, { timeout: 5000 });
});

/**
 * Then I should see {int} {string} elements
 * Verifies count of elements
 */
Then('I should see {int} {string} elements', async function (this: CustomWorld, count: number, elementText: string) {
  const elements = this.page.getByText(elementText);
  await expect(elements).toHaveCount(count, { timeout: 10000 });
});

/**
 * Then I should see at least {int} {string} elements
 * Verifies minimum count of elements
 */
Then('I should see at least {int} {string} elements', async function (this: CustomWorld, minCount: number, elementText: string) {
  const elements = this.page.getByText(elementText);
  const actualCount = await elements.count();
  expect(actualCount).toBeGreaterThanOrEqual(minCount);
});

/**
 * Then I should see a table with {int} rows
 * Verifies table row count
 */
Then('I should see a table with {int} rows', async function (this: CustomWorld, expectedRows: number) {
  const rows = this.page.locator('table tbody tr');
  await expect(rows).toHaveCount(expectedRows, { timeout: 10000 });
});

/**
 * Then I should see an error message
 * Verifies an error message/notification is visible
 */
Then('I should see an error message', async function (this: CustomWorld) {
  // Check for various error indicators
  const errorSelectors = [
    '.o_notification.bg-danger',
    '.alert-danger',
    '.error-message',
    '[role="alert"]',
  ];
  
  let errorFound = false;
  for (const selector of errorSelectors) {
    const error = this.page.locator(selector).first();
    if (await error.isVisible({ timeout: 1000 }).catch(() => false)) {
      errorFound = true;
      break;
    }
  }
  
  expect(errorFound).toBeTruthy();
});

/**
 * Then I should see a success message
 * Verifies a success message/notification is visible
 */
Then('I should see a success message', async function (this: CustomWorld) {
  const successSelectors = [
    '.o_notification.bg-success',
    '.alert-success',
    '.success-message',
  ];
  
  let successFound = false;
  for (const selector of successSelectors) {
    const success = this.page.locator(selector).first();
    if (await success.isVisible({ timeout: 1000 }).catch(() => false)) {
      successFound = true;
      break;
    }
  }
  
  expect(successFound).toBeTruthy();
});

/**
 * Then I should see notification {string}
 * Verifies a notification with specific text is visible
 */
Then('I should see notification {string}', async function (this: CustomWorld, notificationText: string) {
  const notification = this.page.locator('.o_notification, .alert').filter({ hasText: notificationText });
  await expect(notification.first()).toBeVisible({ timeout: 10000 });
});

/**
 * Then {string} tab should be active
 * Verifies a tab is selected/active
 */
Then('{string} tab should be active', async function (this: CustomWorld, tabName: string) {
  const tab = this.page.getByRole('tab', { name: new RegExp(tabName, 'i'), selected: true });
  await expect(tab).toBeVisible({ timeout: 10000 });
});

/**
 * Then I should be in form view
 * Verifies we're in Odoo form view
 */
Then('I should be in form view', async function (this: CustomWorld) {
  const formView = this.page.locator('.o_form_view');
  await expect(formView).toBeVisible({ timeout: 10000 });
});

/**
 * Then I should be in list view
 * Verifies we're in Odoo list view
 */
Then('I should be in list view', { timeout: 15000 }, async function (this: CustomWorld) {
  const listView = this.page.locator('.o_list_view');
  await expect(listView).toBeVisible({ timeout: 10000 });
});

/**
 * Then I should be in kanban view
 * Verifies we're in Odoo kanban view
 */
Then('I should be in kanban view', async function (this: CustomWorld) {
  const kanbanView = this.page.locator('.o_kanban_view');
  await expect(kanbanView).toBeVisible({ timeout: 10000 });
});

/**
 * Then the breadcrumb should contain {string}
 * Verifies breadcrumb contains specific text
 */
Then('the breadcrumb should contain {string}', async function (this: CustomWorld, breadcrumbText: string) {
  const breadcrumb = this.page.locator('.o_breadcrumb');
  await expect(breadcrumb).toContainText(breadcrumbText, { timeout: 10000 });
});

/**
 * Then modal should be open
 * Verifies a modal dialog is visible
 */
Then('modal should be open', async function (this: CustomWorld) {
  const modal = this.page.locator('.modal.show, .modal:visible');
  await expect(modal).toBeVisible({ timeout: 10000 });
});

/**
 * Then modal should be closed
 * Verifies no modal dialog is visible
 */
Then('modal should be closed', async function (this: CustomWorld) {
  const modal = this.page.locator('.modal.show');
  await expect(modal).not.toBeVisible({ timeout: 5000 });
});

/**
 * Then I should see loading indicator
 * Verifies loading indicator is visible
 */
Then('I should see loading indicator', async function (this: CustomWorld) {
  const loadingSelectors = [
    '.o_loading',
    '.spinner',
    '[role="progressbar"]',
  ];
  
  let loadingFound = false;
  for (const selector of loadingSelectors) {
    const loading = this.page.locator(selector).first();
    if (await loading.isVisible({ timeout: 1000 }).catch(() => false)) {
      loadingFound = true;
      break;
    }
  }
  
  expect(loadingFound).toBeTruthy();
});

/**
 * Then loading should complete
 * Verifies loading indicator is no longer visible
 */
Then('loading should complete', async function (this: CustomWorld) {
  const loading = this.page.locator('.o_loading');
  await expect(loading).not.toBeVisible({ timeout: 30000 });
});
