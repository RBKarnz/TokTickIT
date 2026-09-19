import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

test.describe('Responsive State & Visual Inspection (21 Visual Snapshots)', () => {
  test.beforeAll(() => {
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/login'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/change-password'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/requester-tickets'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/requester-ticket-detail'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/staff-queue'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/staff-ticket-detail'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-03/screenshots/user-management'));
  });

  test('Capture Login Screen (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText(/TokTickIT/i);

      // Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/login/login-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture Change Password Screen (3 viewports)', async ({ page }) => {
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

    for (const vp of VIEWPORTS) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('firstlogin@toktickit.com');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/change-password/);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/change-password/change-password-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture Requester Tickets List Screen (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('requester1@toktickit.com');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/tickets|\/$/);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/requester-tickets/requester-tickets-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture Requester Ticket Detail Screen (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('requester1@toktickit.com');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/tickets|\/$/);

      const firstTicket = page.locator('tr:has-text("TKT-"):visible, .card:has-text("TKT-"):visible').first();
      await firstTicket.waitFor({ state: 'visible' });
      await firstTicket.click();
      await expect(page).toHaveURL(/\/tickets\/\d+/);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/requester-ticket-detail/requester-ticket-detail-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture IT Staff Queue Screen (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('staff1@toktickit.com');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/staff\/queue/);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/staff-queue/staff-queue-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture IT Staff Ticket Detail Screen (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('staff1@toktickit.com');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/staff\/queue/);

      const firstTicket = page.locator('tr:has-text("TKT-"):visible, .card:has-text("TKT-"):visible').first();
      await firstTicket.waitFor({ state: 'visible' });
      await firstTicket.click();
      await expect(page).toHaveURL(/\/tickets\/\d+/);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/staff-ticket-detail/staff-ticket-detail-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture Administrator User Management Screen (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.context().clearCookies();
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.locator('input[type="email"]').fill('admin@toktickit.com');
      await page.locator('input[type="password"]').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/admin\/users/);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-03/screenshots/user-management/user-management-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});
