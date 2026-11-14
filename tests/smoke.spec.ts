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
    // A failed login stays on /web/login, which also matches /web: require the web client itself.
    await expect(page.locator('.o_main_navbar')).toBeVisible();
    await expect(page).not.toHaveURL(/\/web\/login/);
  });

  test('wrong password keeps the user on the login page', async ({ page }) => {
    await page.goto('/web/login');
    await page.fill('input[name="login"]', process.env.ODOO_USERNAME ?? 'admin');
    await page.fill('input[name="password"]', 'definitely-not-the-password');
    await page.click('button[type="submit"]');
    await expect(page.locator('.alert-danger')).toHaveText('Wrong login/password');
    await expect(page).toHaveURL(/\/web\/login/);
    await expect(page.locator('.o_main_navbar')).toHaveCount(0);
  });
});
