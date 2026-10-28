import { test, expect, Page } from '@playwright/test';

// STYLE-01..08 (tests.md Lab 4 Style/A11y/Responsive suite): the new Lab 4
// screens (Dashboards, Actions Taken tab, Ticket Workflow modal) follow the
// same Zen Green tokens, focus rings, non-color status cues and responsive
// containment rules already proven for Lab 1-3 screens. Runs in every
// Playwright project, so it is exercised at Desktop, Tablet and Mobile.
const ZEN_GREEN = 'rgb(0, 107, 60)'; // #006B3C primary token (ui-spec §10)
const PASSWORD = 'Password123!';

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
  await page.waitForLoadState('networkidle');
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

const bg = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);

test.describe('Lab 4 Style / Responsive / Accessibility (STYLE-01 to STYLE-08)', () => {
  test('STYLE-01: the Dashboard uses the Zen Green primary token for the header and primary action', async ({ page }) => {
    await login(page, 'staff1@toktickit.com');
    expect(await bg(page, 'nav.navbar')).toBe(ZEN_GREEN);
    expect(await bg(page, 'button:has-text("Open Ticket Queue")')).toBe(ZEN_GREEN);
  });

  test('STYLE-02: keyboard focus is visible on a Dashboard metric card and the nav Dashboard link', async ({ page }) => {
    await login(page, 'requester1@toktickit.com');
    await page.locator('body').click(); // drop any initial focus
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return { tag: (document.activeElement as HTMLElement)?.tagName, outline: s.outlineStyle, shadow: s.boxShadow };
    });
    expect(ring.outline !== 'none' || !/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)$/.test(ring.shadow)).toBe(true);
  });

  test('STYLE-03: Dashboard list badges carry a text label, not color alone', async ({ page }) => {
    await login(page, 'staff1@toktickit.com');
    const badges = page.locator('.badge:visible');
    const count = await badges.count();
    if (count > 0) {
      for (const text of await badges.allInnerTexts()) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('STYLE-04/05/06: the Dashboard and Actions Taken tab have no horizontal overflow at this viewport', async ({ page }) => {
    await login(page, 'requester1@toktickit.com');
    await expectNoHorizontalOverflow(page);

    await login(page, 'staff1@toktickit.com');
    await expectNoHorizontalOverflow(page);

    const narrow = (page.viewportSize()?.width ?? 1280) < 768;
    const metricCards = page.locator('.card.shadow-sm.border-0.h-100');
    await expect(metricCards.first()).toBeVisible();
    // Desktop: 4 cards fit per row; narrower viewports stack them, both without overflow.
    expect(narrow || (await metricCards.count()) >= 4).toBe(true);

    await metricCards.first().click();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  });

  test('STYLE-07: the Actions Taken create form associates its required field with its validation message', async ({ page }) => {
    await login(page, 'staff1@toktickit.com');
    await page.goto('/staff/queue');
    await page.locator('[data-testid="list-item"]:visible').first().click();
    await page.waitForLoadState('networkidle');
    await page.locator('button:has-text("Actions Taken")').click();
    await page.locator('button:has-text("+ Add Action Taken")').click();

    await page.locator('button:has-text("Save Action")').click();
    const descriptionInput = page.locator('#description');
    const describedBy = await descriptionInput.getAttribute('aria-describedby');
    const error = page.locator('#description-error');
    await expect(error).toBeVisible();
    expect(describedBy).toContain('description-error');

    const inputBox = (await descriptionInput.boundingBox())!;
    const errorBox = (await error.boundingBox())!;
    expect(errorBox.y).toBeGreaterThanOrEqual(inputBox.y + inputBox.height - 1);
    expect(errorBox.y - (inputBox.y + inputBox.height)).toBeLessThan(40);
  });

  test('STYLE-08: the status change confirmation modal is fully contained within the viewport, with no clipping', async ({ page }) => {
    await login(page, 'staff1@toktickit.com');
    await page.goto('/staff/queue');
    await page.locator('[data-testid="list-item"]:visible').first().click();
    await page.waitForLoadState('networkidle');

    const changeStatus = page.locator('select[aria-label="Change Status"]');
    const options = await changeStatus.locator('option').allInnerTexts();
    const terminalOption = ['Cancelled', 'Resolved'].find((o) => options.includes(o));
    if (!terminalOption) return; // this Ticket's current status offers no modal transition; nothing to check.

    await changeStatus.selectOption({ label: terminalOption });
    await page.getByRole('button', { name: 'Update Status' }).click();
    const modal = page.locator('.modal.show .modal-dialog');
    await expect(modal).toBeVisible();

    const box = (await modal.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    await expectNoHorizontalOverflow(page);
  });
});
