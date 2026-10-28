import { test, expect, Page } from '@playwright/test';

// E2E-07..09 (tests.md Lab 4 E2E suite): Role Dashboards (AC-18, AC-20).
// Lives in its own lab-04 folder, separate from the lab-03 suite, which only
// carries the login-helper fixes needed because /dashboard is now the
// universal post-login landing page.

async function login(page: Page, email: string, password = 'Password123!') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
}

test.describe('Role Dashboards (E2E-07 to E2E-09)', () => {
  test('E2E-07: Login landing page routing for all three roles', async ({ page }) => {
    await login(page, 'requester1@toktickit.com');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText(/Welcome back/i);

    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    await login(page, 'staff1@toktickit.com');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText(/Welcome back/i);

    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    await login(page, 'admin@toktickit.com');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText(/Welcome back/i);
  });

  test('E2E-08: Staff dashboard metric drill-down navigation', async ({ page }) => {
    await login(page, 'staff1@toktickit.com');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.locator('button:has-text("Unassigned")').click();
    await expect(page).toHaveURL(/\/staff\/queue\?ownership=unassigned&statusGroup=open/);
    await expect(page.locator('text=Filtered from Dashboard')).toBeVisible();
  });

  test('E2E-09: Requester dashboard metric drill-down navigation', async ({ page }) => {
    await login(page, 'requester1@toktickit.com');
    await expect(page).toHaveURL(/\/dashboard/);

    await page.locator('button:has-text("Waiting for Me")').click();
    await expect(page).toHaveURL(/\/tickets\?status=WAITING_FOR_REQUESTER/);
    await expect(page.locator('text=Filtered from Dashboard')).toBeVisible();
  });
});
