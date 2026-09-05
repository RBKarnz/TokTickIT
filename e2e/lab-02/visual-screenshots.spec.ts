import { test, expect } from '@playwright/test';
import path from 'path';

const screenshotsBase = path.resolve(process.cwd(), 'artifacts/lab-02/screenshots');

const viewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

test.describe('Automated Visual Screenshots (Lab 2)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await page.evaluate(() => {
      localStorage.setItem('activeRequester', JSON.stringify({
        id: 1,
        name: 'Jennifer Anderson',
        email: 'jennifer.anderson@kmutt.ac.th',
        isActive: true
      }));
    });
  });

  test('Capture My Tickets viewports', async ({ page }) => {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsBase, 'my-tickets', `my-tickets-${vp.name}.png`), fullPage: true });
    }
  });

  test('Capture Create Ticket viewports', async ({ page }) => {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/tickets/create');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsBase, 'create-ticket', `create-ticket-${vp.name}.png`), fullPage: true });
    }
  });

  test('Capture Ticket Detail viewports', async ({ page }) => {
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('http://localhost:5173/tickets/817'); // Using known seeded ticket ID
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsBase, 'ticket-detail', `ticket-detail-${vp.name}.png`), fullPage: true });
    }
  });
});
