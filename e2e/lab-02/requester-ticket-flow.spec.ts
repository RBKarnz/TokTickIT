import { test, expect } from '@playwright/test';

test.describe('Requester Ticket Flow (E2E-01)', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate via Lab 3 session
    await page.goto('http://localhost:5173/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);
  });

  test('Creates a ticket successfully and views it', async ({ page }) => {
    // 1. Go to My Tickets and Verify
    await expect(page.locator('h1')).toContainText('My Tickets');
    
    // 2. Go to Create Ticket
    await page.goto('http://localhost:5173/tickets/create');
    await expect(page.locator('h1')).toContainText('Create');

    // 3. Fill the form
    await page.locator('select[name="categoryId"]').selectOption({ index: 1 });
    await page.locator('select[name="relatedSystemId"]').selectOption({ index: 1 });
    await page.locator('input[name="summary"]').fill('System login failing');
    await page.locator('textarea[name="description"]').fill('I cannot log in since yesterday morning.');
    
    // 4. Submit
    await page.locator('button[type="submit"]').click();

    // 5. Verify success and ticket details
    await expect(page.locator('text=Successfully')).toBeVisible();
    await page.goto('http://localhost:5173/');
    
    // 6. View details
    const firstTicket = page.locator('table tbody tr').first();
    await firstTicket.click();
    await expect(page.locator('text=Ticket Details')).toBeVisible();
  });
});

