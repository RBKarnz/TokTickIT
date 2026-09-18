import { test, expect } from '@playwright/test';

test.describe('Authentication & Role Workflows (E2E-01 to E2E-08)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('E2E-01: Role-based landing redirects correctly', async ({ page }) => {
    // 1. Requester landing
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);
    await expect(page.locator('h1, h2')).toContainText(/My Tickets|Tickets/i);

    // Logout
    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Staff landing
    await page.locator('input[type="email"]').fill('staff1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('h1, h2')).toContainText(/Ticket Queue/i);

    // Logout
    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Admin landing
    await page.locator('input[type="email"]').fill('admin@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('h1, h2')).toContainText(/User Management/i);
  });

  test('E2E-02 & E2E-08: Initial password login forces change password, prevents URL bypass, and lands after success', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('firstlogin@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    // Forced navigation to /change-password
    await expect(page).toHaveURL(/\/change-password/);
    await expect(page.locator('h1, h2')).toContainText(/Change Password/i);

    // E2E-08: Direct URL bypass attempt
    await page.goto('/tickets');
    await expect(page).toHaveURL(/\/change-password/);

    // Complete password change satisfying policy
    const newPass = 'UpdatedPass123!';
    await page.locator('input#current').fill('Password123!');
    await page.locator('input#newPwd').fill(newPass);
    await page.locator('input#confirm').fill(newPass);
    await page.locator('button[type="submit"]').click();

    // After success, redirects to role landing
    await expect(page).not.toHaveURL(/\/change-password/);
  });

  test('E2E-03: Invalid credentials shows generic safe error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.alert-danger, [role="alert"]')).toBeVisible();
    await expect(page.locator('.alert-danger, [role="alert"]')).toContainText(/invalid email or password/i);
  });

  test('E2E-04: Inactive account receives safe generic error', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester.inactive@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.alert-danger, [role="alert"]')).toBeVisible();
    await expect(page.locator('.alert-danger, [role="alert"]')).toContainText(/invalid email or password/i);
  });

  test('E2E-05: Logout revokes session and blocks protected routes', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('staff1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/staff\/queue/);

    // Logout
    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    // Attempt direct navigation back to protected queue
    await page.goto('/staff/queue');
    await expect(page).toHaveURL(/\/login/);
  });

  test('E2E-06: Role navigation isolation across roles', async ({ page }) => {
    // 1. Requester navigation
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);
    await expect(page.locator('nav.navbar')).toBeVisible();
    await expect(page.locator('nav.navbar')).not.toContainText('Ticket Queue');
    await expect(page.locator('nav.navbar')).not.toContainText('User Management');

    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    // 2. Staff navigation
    await page.locator('input[type="email"]').fill('staff1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.locator('nav.navbar')).toContainText('Ticket Queue');
    await expect(page.locator('nav.navbar')).not.toContainText('User Management');

    await page.locator('button:has-text("Logout")').click();
    await expect(page).toHaveURL(/\/login/);

    // 3. Admin navigation
    await page.locator('input[type="email"]').fill('admin@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.locator('nav.navbar')).toContainText('User Management');
    await expect(page.locator('nav.navbar')).not.toContainText('Ticket Queue');
  });

  test('E2E-07: Requester cannot reach Internal Notes on Ticket Detail', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();

    await page.goto('/tickets');
    const firstTicket = page.locator('table tbody tr').first();
    if (await firstTicket.isVisible()) {
      await firstTicket.click();
      await expect(page.locator('body')).not.toContainText('Internal Notes');
    }
  });

  test('Core Regression: Authenticated ticket creation without dev requester selector', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);

    await page.goto('/tickets/create');
    await expect(page).toHaveURL(/\/tickets\/create/);
    await expect(page.locator('h1, h2')).toContainText(/Create/i);

    // Verify there is no requester selector dropdown in the UI
    await expect(page.locator('select[name="requesterId"], #requester-selector')).toHaveCount(0);

    // Fill valid form
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('select[name="relatedSystemId"]').selectOption({ index: 1 });
    await page.locator('input[name="summary"]').fill('E2E Authenticated Ticket Creation');
    await page.locator('textarea[name="description"]').fill('Verifying authenticated ticket ownership without client requesterId override.');
    await page.locator('button[type="submit"]').click();

    // Verify success
    await expect(page.locator('.alert-success').or(page.getByText('successfully', { exact: false }))).toBeVisible();
  });
});
