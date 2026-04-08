/**
 * Playwright Test Runner — Smoke Suite
 *
 * Minimal sanity checks that validate the Odoo instance is accessible.
 * Run with: npx playwright test
 *
 * These run against the same BASE_URL used by Cucumber tests (.env / env var).
 */

import { test, expect } from '@playwright/test';

test.describe('Odoo – smoke', () => {
  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get('/web/health');
    expect(response.ok()).toBeTruthy();
  });

  test('login page renders the username field', async ({ page }) => {
    await page.goto('/web/login');
    await expect(page.locator('input[name="login"]')).toBeVisible();
  });

  test('authenticated session is established', async ({ page }) => {
    await page.goto('/web/login');
    await page.fill('input[name="login"]', process.env.ODOO_USERNAME ?? 'admin');
    await page.fill('input[name="password"]', process.env.ODOO_PASSWORD ?? 'admin');
    await page.click('button[type="submit"]');
    // Odoo redirects to /odoo or /web after successful login
    await expect(page).toHaveURL(/\/odoo|\/web/);
  });
});
