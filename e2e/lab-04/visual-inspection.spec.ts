import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Lab 4 ui-spec §11 Visual Evidence Requirements: captures the Staff
// Dashboard, Requester Dashboard and Actions Taken tab at the three standard
// viewports into artifacts/lab-04/screenshots/.
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];
const PASSWORD = 'Password123!';

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('Lab 4 Visual Inspection (Dashboards & Actions Taken)', () => {
  test.beforeAll(() => {
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-04/screenshots/staff-dashboard'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-04/screenshots/requester-dashboard'));
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-04/screenshots/actions-taken'));
  });

  test('Capture Staff & Administrator Dashboard (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, 'staff1@toktickit.com');
      await page.waitForLoadState('networkidle');

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-04/screenshots/staff-dashboard/staff-dashboard-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture Requester Dashboard (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, 'requester1@toktickit.com');
      await page.waitForLoadState('networkidle');

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-04/screenshots/requester-dashboard/requester-dashboard-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('Capture Actions Taken tab (3 viewports)', async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page, 'staff1@toktickit.com');
      await page.goto('/staff/queue');
      await page.locator('[data-testid="list-item"]:visible').first().click();
      await page.waitForLoadState('networkidle');
      await page.locator('button:has-text("Actions Taken")').click();
      await page.waitForTimeout(300);

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(process.cwd(), `artifacts/lab-04/screenshots/actions-taken/actions-taken-${vp.name}.png`);
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });
});
