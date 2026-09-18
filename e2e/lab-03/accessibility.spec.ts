import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Automated Accessibility Scans (WCAG 2.1 Level AA)', () => {
  test('A11Y-01: Login Screen (/login)', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText(/TokTickIT/i);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('A11Y-02: Change Password Screen (/change-password)', async ({ page }) => {
    // Ensure firstlogin user has mustChangePassword=true
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('admin@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/users/);

    await page.locator('input[placeholder*="Search"]').fill('firstlogin@toktickit.com');
    await page.waitForTimeout(300);
    await page.locator('table tbody tr').filter({ hasText: 'firstlogin@toktickit.com' }).locator('button:has-text("Edit")').click();
    await page.locator('span:has-text("Set New Initial Password")').click();
    await page.locator('input#reset-password').fill('Password123!');
    await page.locator('input#reset-confirm-password').fill('Password123!');
    await page.locator('button:has-text("Set Initial Password")').click();
    await expect(page.locator('.alert-success:has-text("Initial password set successfully")')).toBeVisible();

    await page.context().clearCookies();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('firstlogin@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/change-password/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('A11Y-03: Requester My Tickets List (/tickets)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('A11Y-04: Requester Ticket Detail (/tickets/:id)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);

    // Open first ticket detail
    const firstTicket = page.locator('table tbody tr, .card a').first();
    await firstTicket.click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('A11Y-05: IT Staff Queue (/staff/queue)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('staff1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/staff\/queue/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('A11Y-06: IT Staff Ticket Detail (/staff/tickets/:id)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('staff1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Click first ticket
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('A11Y-07: Administrator User Management (/admin/users)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('admin@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/users/);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
