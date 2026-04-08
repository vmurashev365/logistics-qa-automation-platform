/**
 * LoginPage - Page object for Odoo Login page
 * Handles authentication workflows
 */

import { Page } from 'playwright';
import { BasePage } from '../base/BasePage';
import { UI_MAP } from '../../ui-map';

/**
 * LoginPage - Odoo Authentication Page Object
 */
export class LoginPage extends BasePage {
  // Page-specific selectors
  private readonly loginSelectors = {
    loginForm: 'form.oe_login_form, form[action*="login"]',
    emailInput: '#login',
    passwordInput: '#password',
    loginButton: 'button[type="submit"]',
    errorMessage: '.alert-danger',
    odooLogo: '.o_logo, .oe_logo',
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Get the URL for this page
   */
  get url(): string {
    return UI_MAP.pages.login;
  }

  /**
   * Navigate to login page
   * @param baseUrl - Base URL of Odoo instance
   */
  async navigate(baseUrl?: string): Promise<void> {
    const base = baseUrl || process.env.BASE_URL || 'http://localhost:8069';
    await this.page.goto(`${base}${this.url}`, { waitUntil: 'domcontentloaded' });
    await this.waitForLoginForm();
  }

  /**
   * Wait for login form to be visible
   */
  async waitForLoginForm(): Promise<void> {
    await this.page.waitForSelector(this.loginSelectors.loginForm, {
      state: 'visible',
      timeout: 10000,
    });
  }

  /**
   * Check if we're on the login page
   */
  async isOnLoginPage(): Promise<boolean> {
    try {
      const loginForm = this.page.locator(this.loginSelectors.loginForm);
      return await loginForm.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Fill email/username field
   * @param email - Email or username
   */
  async fillEmail(email: string): Promise<void> {
    await this.page.getByRole('textbox', { name: UI_MAP.fields.login }).fill(email);
  }

  /**
   * Fill password field
   * @param password - Password
   */
  async fillPassword(password: string): Promise<void> {
    await this.page.getByRole('textbox', { name: UI_MAP.fields.password }).fill(password);
  }

  /**
   * Click the login button
   */
  async clickLogin(): Promise<void> {
    await this.page.getByRole('button', { name: UI_MAP.buttons.login }).click();
  }

  /**
   * Perform full login
   * @param username - Username or email
   * @param password - Password
   * @param baseUrl - Optional base URL
   */
  async login(username: string, password: string, baseUrl?: string): Promise<void> {
    // Navigate to login page if not already there
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/web/login')) {
      await this.navigate(baseUrl);
    } else {
      // Already on login page, make sure form is ready
      await this.waitForLoginForm();
    }

    // Fill credentials
    await this.fillEmail(username);
    await this.fillPassword(password);

    // Click login
    await this.clickLogin();

    // Wait for navigation to complete - use multiple strategies
    try {
      await this.page.waitForURL(/\/web(?!\/login)/, { timeout: 15000 });
    } catch {
      // Fallback: wait for navbar to appear (indicates successful login)
      await this.page.waitForSelector('.o_main_navbar', { state: 'visible', timeout: 10000 });
    }
    
    // Wait for DOM to be ready (fast, no need for networkidle)
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Attempt login without expecting success (for testing failed logins)
   * @param username - Username or email
   * @param password - Password
   */
  async attemptLogin(username: string, password: string): Promise<void> {
    // Wait for login form
    await this.waitForLoginForm();

    // Fill credentials
    await this.fillEmail(username);
    await this.fillPassword(password);

    // Click login
    await this.clickLogin();

    // Just wait for page to respond (don't expect success)
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Check if login was successful
   */
  async isLoggedIn(): Promise<boolean> {
    try {
      // Check for main navbar (indicates successful login)
      const navbar = this.page.locator('.o_main_navbar');
      return await navbar.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get error message if login failed
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const errorElement = this.page.locator(this.loginSelectors.errorMessage);
      if (await errorElement.isVisible()) {
        return await errorElement.textContent();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Logout from Odoo
   */
  async logout(): Promise<void> {
    // Click user menu - use first matching element
    await this.page.locator('.o_user_menu').first().click();
    
    // Click logout option
    await this.page.getByRole('menuitem', { name: /log out/i }).click();
    
    // Wait for login page
    await this.waitForLoginForm();
  }
}
