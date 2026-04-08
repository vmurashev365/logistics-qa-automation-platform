/**
 * Navigation Step Definitions
 * Atomic steps for page navigation and URL handling
 * Uses UI-MAP pattern for page resolution
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../../support/custom-world';
import { UI_MAP, isValidPageKey, MENU_NAVIGATION } from '../../ui-map';

/**
 * URL mapping for page navigation
 * Maps friendly page names to Odoo URLs
 * Now uses UI-MAP with backward compatibility
 */
const legacyPageUrls: Record<string, string> = {
  'Vehicles': '/web#model=fleet.vehicle&view_type=list',
  'Vehicle Form': '/web#model=fleet.vehicle&view_type=form',
  'Fleet Dashboard': '/web#action=fleet.fleet_vehicle_action',
  'Login': '/web/login',
  'Home': '/web',
};

/**
 * Resolve page URL from UI-MAP key or legacy name
 */
function resolvePageUrl(pageName: string): string | undefined {
  // Try UI-MAP first (lowercase keys)
  const uiMapKey = pageName.toLowerCase().replace(/\s+/g, '');
  if (isValidPageKey(uiMapKey)) {
    return UI_MAP.pages[uiMapKey];
  }
  
  // Try direct UI-MAP key
  if (isValidPageKey(pageName)) {
    return UI_MAP.pages[pageName];
  }
  
  // Fallback to legacy page URLs
  return legacyPageUrls[pageName];
}

/**
 * Given Odoo is accessible at {string}
 * Verifies Odoo is running and accessible
 */
Given('Odoo is accessible at {string}', async function (this: CustomWorld, url: string) {
  try {
    // Navigate to the base URL
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Check for Odoo-specific elements (login page or main app)
    await this.page.locator('.o_web_client, .oe_login_form, .o_login_auth').first().waitFor({ state: 'visible', timeout: 10000 });
    
    // Store base URL in test data
    this.setTestData('baseUrl', url);
    
  } catch (error) {
    throw new Error(`Failed to access Odoo at ${url}: ${(error as Error).message}`);
  }
});

/**
 * Given I login with username {string} and password {string}
 * Logs into Odoo with provided credentials
 */
Given('I login with username {string} and password {string}', { timeout: 30000 }, async function (this: CustomWorld, username: string, password: string) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
  
  // Check if already logged in
  const isLoggedIn = await this.page.locator('.o_main_navbar').isVisible().catch(() => false);
  
  if (isLoggedIn) {
    return;
  }
  
  // Navigate to login page if not already there
  const currentUrl = this.page.url();
  if (!currentUrl.includes('/web/login')) {
    await this.page.goto(`${baseUrl}/web/login`, { waitUntil: 'domcontentloaded' });
  }
  
  // Wait for login form
  await this.page.waitForSelector('form.oe_login_form, form[action*="login"]', { timeout: 5000 });
  
  // Fill login credentials
  await this.page.getByRole('textbox', { name: 'Email' }).fill(username);
  await this.page.getByRole('textbox', { name: 'Password' }).fill(password);
  
  // Click login button and wait for navigation
  await this.page.getByRole('button', { name: 'Log in' }).click();
  
  // Wait for main navbar to appear (indicates successful login)
  await this.page.locator('.o_main_navbar').waitFor({ state: 'visible', timeout: 15000 });
  
  this.setTestData('username', username);
  this.setTestData('isLoggedIn', true);
});

/**
 * When I navigate to {string} page
 * Navigates to a named page using menu navigation (from codegen)
 * Supports both UI-MAP keys and legacy page names
 */
When('I navigate to {string} page', { timeout: 30000 }, async function (this: CustomWorld, pageName: string) {
  const normalizedPageKey = pageName.toLowerCase().replace(/\s+/g, '');

  // Tablet/mobile optimized navigation: use bottom nav tabs when present
  if (normalizedPageKey === 'loads') {
    const loadsTabSelector = UI_MAP.tablet?.selectors?.navigation?.loadsTab;
    if (loadsTabSelector) {
      const loadsTab = this.page.locator(loadsTabSelector).first();
      const isLoadsTabVisible = await loadsTab.isVisible({ timeout: 1500 }).catch(() => false);

      if (isLoadsTabVisible) {
        await loadsTab.click();

        const loadCardSelector = UI_MAP.tablet?.selectors?.loadManagement?.loadCard;
        if (loadCardSelector) {
          await this.page.locator(loadCardSelector).first().waitFor({ state: 'visible', timeout: 15000 });
        } else {
          await this.page.waitForLoadState('domcontentloaded');
        }

        this.setTestData('currentPage', pageName);
        return;
      }
    }
  }

  // Check if user is logged in (Home Menu visible means logged in)
  const isLoggedIn = await this.page.getByTitle('Home Menu').isVisible({ timeout: 1000 }).catch(() => false);
  
  // If not logged in, use direct URL navigation (for testing unauthorized access)
  if (!isLoggedIn) {
    const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
    const path = resolvePageUrl(pageName) || `/web#model=fleet.vehicle&view_type=list`;
    await this.page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    return;
  }
  
  // Try to resolve menu navigation from UI-MAP
  const uiMapKey = normalizedPageKey;
  const menuNav = MENU_NAVIGATION[uiMapKey] || MENU_NAVIGATION[pageName];
  
  // Legacy menu navigation mapping (backward compatibility)
  const legacyMenuNavigation: Record<string, { app: string; menuItem?: string }> = {
    'Vehicles': { app: 'Fleet' },
    'Fleet': { app: 'Fleet' },
    'Fleet Dashboard': { app: 'Fleet' },
  };
  
  const nav = menuNav || legacyMenuNavigation[pageName];
  
  if (nav) {
    // Navigate via Odoo menu
    await this.page.getByTitle('Home Menu').click();
    // Use .first() to handle duplicate Fleet menu items in Odoo 17
    await this.page.getByRole('menuitem', { name: nav.app }).first().click();
    
    // Wait for list/kanban view to load
    await this.page.locator('.o_list_view, .o_kanban_view, .o_form_view').first().waitFor({ state: 'visible', timeout: 15000 });
    
    // If there's a submenu item, click it
    if (nav.menuItem) {
      await this.page.getByRole('menuitem', { name: nav.menuItem }).first().click();
      await this.page.locator('.o_list_view, .o_kanban_view').first().waitFor({ state: 'visible', timeout: 10000 });
    }
  } else {
    // Fallback to URL navigation
    const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
    const path = resolvePageUrl(pageName);
    
    if (!path) {
      const availablePages = [
        ...Object.keys(UI_MAP.pages),
        ...Object.keys(legacyPageUrls),
        ...Object.keys(MENU_NAVIGATION),
      ];
      throw new Error(`Unknown page: "${pageName}". Available: ${[...new Set(availablePages)].join(', ')}`);
    }
    
    await this.page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
    await this.page.locator('.o_web_client').waitFor({ state: 'visible', timeout: 10000 });
  }
  
  this.setTestData('currentPage', pageName);
});

/**
 * When I navigate to URL {string}
 * Navigates directly to a specific URL path
 */
When('I navigate to URL {string}', async function (this: CustomWorld, urlPath: string) {
  const baseUrl = this.getTestData<string>('baseUrl') || this.getBaseUrl();
  const fullUrl = urlPath.startsWith('http') ? urlPath : `${baseUrl}${urlPath}`;
  
  await this.page.goto(fullUrl, { waitUntil: 'domcontentloaded' });
});

/**
 * When I refresh the page
 * Reloads the current page
 */
When('I refresh the page', async function (this: CustomWorld) {
  await this.page.reload({ waitUntil: 'domcontentloaded' });
});

/**
 * When I go back
 * Navigates back in browser history
 */
When('I go back', async function (this: CustomWorld) {
  await this.page.goBack({ waitUntil: 'domcontentloaded' });
});

/**
 * When I go forward
 * Navigates forward in browser history
 */
When('I go forward', async function (this: CustomWorld) {
  await this.page.goForward({ waitUntil: 'domcontentloaded' });
});

/**
 * When I click {string} link
 * Clicks a link by its text
 */
When('I click {string} link', async function (this: CustomWorld, linkText: string) {
  const link = this.page.getByRole('link', { name: linkText });
  await link.click();
});

/**
 * When I click {string} menu item
 * Clicks a menu item by its text
 */
When('I click {string} menu item', async function (this: CustomWorld, menuText: string) {
  const menuItem = this.page.getByRole('menuitem', { name: menuText });
  
  if (await menuItem.isVisible()) {
    await menuItem.click();
  } else {
    // Try generic text match
    await this.page.getByText(menuText).first().click();
  }
  
  await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
});

/**
 * Then I should be on {string} page
 * Verifies current page by checking URL
 */
Then('I should be on {string} page', async function (this: CustomWorld, pageName: string) {
  const expectedPath = resolvePageUrl(pageName);
  
  if (!expectedPath) {
    throw new Error(`Unknown page: "${pageName}"`);
  }
  
  const currentUrl = this.page.url();
  
  // Extract key parts from expected path for comparison
  // e.g., from '/web#model=fleet.vehicle&view_type=list' extract 'fleet.vehicle'
  const modelMatch = expectedPath.match(/model=([^&]+)/);
  if (modelMatch) {
    expect(currentUrl).toContain(modelMatch[1]);
  } else {
    expect(currentUrl).toContain(expectedPath);
  }
});

/**
 * Then the URL should contain {string}
 * Verifies URL contains specific text
 */
Then('the URL should contain {string}', async function (this: CustomWorld, urlPart: string) {
  const currentUrl = this.page.url();
  expect(currentUrl).toContain(urlPart);
});

/**
 * Then the page title should be {string}
 * Verifies page title
 */
Then('the page title should be {string}', async function (this: CustomWorld, expectedTitle: string) {
  const title = await this.page.title();
  expect(title).toBe(expectedTitle);
});

/**
 * Then the page title should contain {string}
 * Verifies page title contains specific text
 */
Then('the page title should contain {string}', async function (this: CustomWorld, titlePart: string) {
  const title = await this.page.title();
  expect(title).toContain(titlePart);
});

/**
 * When I wait for page to load
 * Explicitly waits for page load states
 */
When('I wait for page to load', async function (this: CustomWorld) {
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForLoadState('load');
  await this.page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
});

/**
 * When I wait for form to load
 * Waits for Odoo form view to be ready
 */
When('I wait for form to load', async function (this: CustomWorld) {
  await this.page.locator('.o_form_view').waitFor({ state: 'visible', timeout: 10000 });
  // Extra wait for form fields to be initialized
  await this.page.waitForTimeout(500);
});

/**
 * When I wait {int} seconds
 * Waits for specified number of seconds
 */
When('I wait {int} seconds', async function (this: CustomWorld, seconds: number) {
  await this.page.waitForTimeout(seconds * 1000);
});
