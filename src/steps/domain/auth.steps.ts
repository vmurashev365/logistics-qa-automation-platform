/**
 * Authentication Domain Steps
 * High-level steps for login/logout workflows
 * Uses UI-MAP pattern and LoginPage object
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { UI_MAP } from '../../ui-map';

/**
 * Given I am logged in as admin
 * Logs in with default admin credentials
 */
Given('I am logged in as admin', { timeout: 30000 }, async function (this: CustomWorld) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
  const username = process.env.ODOO_USERNAME || 'admin';
  const password = process.env.ODOO_PASSWORD || 'admin';

  // Check if already logged in by looking for the navbar
  const isLoggedIn = await this.page.locator('.o_main_navbar').isVisible().catch(() => false);
  
  if (isLoggedIn) {
    console.log('   Already logged in, skipping login');
    this.setTestData('isLoggedIn', true);
    this.setTestData('username', username);
    return;
  }

  // Navigate to login page if not already there
  const currentUrl = this.page.url();
  if (!currentUrl.includes('/web/login')) {
    await this.page.goto(`${baseUrl}/web/login`, { waitUntil: 'domcontentloaded' });
  }
  
  // Wait for login form
  await this.page.waitForSelector('form.oe_login_form, form[action*="login"]', { timeout: 10000 });
  
  // Fill credentials
  await this.page.getByRole('textbox', { name: 'Email' }).fill(username);
  await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
  
  // Click login
  await this.page.getByRole('button', { name: 'Log in' }).click();
  
  // Wait for main navbar (successful login)
  await this.page.locator('.o_main_navbar').waitFor({ state: 'visible', timeout: 15000 });
  
  this.setTestData('isLoggedIn', true);
  this.setTestData('username', username);
});

/**
 * Given I am logged in as {string}
 * Logs in with a specific user (expects password in env var)
 */
Given('I am logged in as {string}', { timeout: 30000 }, async function (this: CustomWorld, username: string) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
  
  // Get password from environment (format: USER_<username>_PASSWORD)
  const envKey = `USER_${username.toUpperCase()}_PASSWORD`;
  const password = process.env[envKey] || 'admin';

  // Check if already logged in as this user  
  const isLoggedIn = await this.loginPage.isLoggedIn().catch(() => false);
  if (isLoggedIn) {
    return;
  }

  console.log(`  Logging in as ${username}...`);
  await this.loginPage.login(username, password, baseUrl);
  console.log(`  Login complete for ${username}`);
  this.setTestData('isLoggedIn', true);
  this.setTestData('username', username);
});

/**
 * Given I am logged in with username {string} and password {string}
 * Logs in with explicit credentials
 */
Given('I am logged in with username {string} and password {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  username: string,
  password: string
) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();

  await this.loginPage.login(username, password, baseUrl);
  this.setTestData('isLoggedIn', true);
  this.setTestData('username', username);
});

/**
 * When I login with username {string} and password {string}
 * Performs login action (different from Given - doesn't check if already logged in)
 */
When('I login with credentials {string} and {string}', { timeout: 30000 }, async function (
  this: CustomWorld,
  username: string,
  password: string
) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();

  await this.loginPage.navigate(baseUrl);
  await this.loginPage.fillEmail(username);
  await this.loginPage.fillPassword(password);
  await this.loginPage.clickLogin();

  // Store login attempt info
  this.setTestData('lastLoginAttempt', { username, timestamp: Date.now() });
});

/**
 * When I logout
 * Performs logout from Odoo
 */
When('I logout', async function (this: CustomWorld) {
  await this.loginPage.logout();
  this.setTestData('isLoggedIn', false);
  this.testData.delete('username');
});

/**
 * Then I should be logged in
 * Verifies user is logged in
 */
Then('I should be logged in', async function (this: CustomWorld) {
  const isLoggedIn = await this.loginPage.isLoggedIn();
  expect(isLoggedIn).toBe(true);
});

/**
 * Then I should not be logged in
 * Verifies user is not logged in (on login page)
 */
Then('I should not be logged in', async function (this: CustomWorld) {
  const isOnLoginPage = await this.loginPage.isOnLoginPage();
  expect(isOnLoginPage).toBe(true);
});

/**
 * Then I should see login error
 * Verifies login error message is displayed
 */
Then('I should see login error', async function (this: CustomWorld) {
  const errorMessage = await this.loginPage.getErrorMessage();
  expect(errorMessage).not.toBeNull();
});

/**
 * Then I should see login error {string}
 * Verifies specific login error message
 */
Then('I should see login error {string}', async function (this: CustomWorld, expectedError: string) {
  const errorMessage = await this.loginPage.getErrorMessage();
  expect(errorMessage).toContain(expectedError);
});

/**
 * Then I should see message {string}
 * Verifies a message from UI-MAP is visible
 */
Then('I should see message {string}', async function (this: CustomWorld, messageKey: string) {
  const message = UI_MAP.messages[messageKey as keyof typeof UI_MAP.messages];
  
  if (!message) {
    throw new Error(`MISSING_UI_MAP: Message key "${messageKey}" not found in ui-map/messages.ts`);
  }

  const notification = this.page.locator('.o_notification_content');
  await notification.waitFor({ state: 'visible', timeout: 5000 });
  
  const text = await notification.textContent();
  expect(text?.toLowerCase()).toContain(message.toLowerCase());
});

/**
 * Given I am on the login page
 * Navigates to login page
 */
Given('I am on the login page', async function (this: CustomWorld) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
  await this.loginPage.navigate(baseUrl);
});

/**
 * When I enter email {string}
 * Fills email field on login page
 */
When('I enter email {string}', async function (this: CustomWorld, email: string) {
  await this.loginPage.fillEmail(email);
});

/**
 * When I enter password {string}
 * Fills password field on login page
 */
When('I enter password {string}', async function (this: CustomWorld, password: string) {
  await this.loginPage.fillPassword(password);
});

/**
 * When I click the login button
 * Clicks login button on login page
 */
When('I click the login button', async function (this: CustomWorld) {
  await this.loginPage.clickLogin();
});
