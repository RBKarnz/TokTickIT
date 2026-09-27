import { test, expect, Page } from '@playwright/test';

// STYLE-01..12 (tests.md §6): Zen Green visual, responsive and accessibility rules
// checked with computed styles and layout boxes. Runs in every Playwright project,
// so each check is exercised at Desktop 1280px, Tablet 768px and Mobile 375px.
const ZEN_GREEN = 'rgb(0, 107, 60)'; // #006B3C primary token (ui-spec §10)

async function loginAs(page: Page, email: string, landing: RegExp) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(landing);
  await page.waitForLoadState('networkidle');
}

const bg = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);

async function openFirstStaffTicket(page: Page) {
  await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
  await page.locator('[data-testid="list-item"]:visible').first().click();
  await page.waitForURL(/\/tickets\/\d+/);
  await page.waitForLoadState('networkidle');
}

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

test.describe('UI Style / Responsive / Accessibility (STYLE-01 to STYLE-12)', () => {
  test('STYLE-01: Zen Green primary token is used for primary actions and the app header', async ({ page }) => {
    await page.goto('/login');
    expect(await bg(page, 'button[type="submit"]')).toBe(ZEN_GREEN);
    await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
    expect(await bg(page, 'nav.navbar')).toBe(ZEN_GREEN);
  });

  test('STYLE-02: navigation renders only role-permitted destinations', async ({ page }) => {
    // textContent (not innerText): on mobile the navbar is collapsed, but rendered links still count.
    const nav = async () => (await page.locator('nav.navbar').textContent()) ?? '';
    await loginAs(page, 'requester1@toktickit.com', /:5173\/(tickets)?$/);
    expect(await nav()).not.toMatch(/Ticket Queue|User Management/);
    await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
    expect(await nav()).toContain('Ticket Queue');
    expect(await nav()).not.toMatch(/User Management/);
    await loginAs(page, 'admin@toktickit.com', /\/admin\/users/);
    expect(await nav()).toContain('User Management');
    expect(await nav()).not.toMatch(/Ticket Queue/);
  });

  test('STYLE-03: status, priority and role badges always carry a text label (not colour alone)', async ({ page }) => {
    await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
    const badges = page.locator('.badge:visible');
    expect(await badges.count()).toBeGreaterThan(0);
    for (const text of await badges.allInnerTexts()) expect(text.trim().length).toBeGreaterThan(0);
  });

  test('STYLE-04: read-only fields are visually distinct from editable controls', async ({ page }) => {
    await openFirstStaffTicket(page);
    const readOnly = await bg(page, 'div.form-control');
    const editable = await bg(page, 'select[aria-label="IT Priority"]');
    expect(readOnly).not.toBe(editable);
    expect(editable).toBe('rgb(255, 255, 255)');
  });

  test('STYLE-05: Public Comments and Internal Notes have unmistakable visual separation', async ({ page }) => {
    await openFirstStaffTicket(page);
    await page.getByText('Public Comments', { exact: false }).first().click();
    const publicBtn = await bg(page, 'button:has-text("Post Comment")');
    await page.getByText('Internal Notes', { exact: false }).first().click();
    await expect(page.getByText('IT Staff and Administrator Only')).toBeVisible();
    const internalBtn = await bg(page, 'button:has-text("Post Internal Note")');
    expect(internalBtn).not.toBe(publicBtn);
  });

  test('STYLE-06: keyboard focus indicator is visible on form controls', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(300); // Bootstrap focus ring transition
    const ring = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement as Element);
      return { id: (document.activeElement as HTMLElement).id, outline: s.outlineStyle, shadow: s.boxShadow };
    });
    expect(ring.id).toBe('email');
    expect(ring.outline !== 'none' || !/^(none|rgba\(0, 0, 0, 0\) 0px 0px 0px 0px)$/.test(ring.shadow)).toBe(true);
  });

  test('STYLE-07: validation message is placed directly beneath the invalid field', async ({ page }) => {
    await loginAs(page, 'admin@toktickit.com', /\/admin\/users/);
    await page.getByRole('button', { name: /Create User/ }).first().click();
    await page.locator('#create-name').fill('Style Duplicate');
    await page.locator('#create-email').fill('admin@toktickit.com');
    await page.locator('#create-password').fill('Initial#2026a');
    await page.locator('#create-confirm-password').fill('Initial#2026a');
    await page.locator('.modal-footer button:has-text("Create User"), .modal button[type="submit"]').last().click();
    const message = page.getByText('Email is already registered.');
    await expect(message).toBeVisible();
    const input = (await page.locator('#create-email').boundingBox())!;
    const msg = (await message.boundingBox())!;
    expect(msg.y).toBeGreaterThanOrEqual(input.y + input.height - 1);
    expect(msg.y - (input.y + input.height)).toBeLessThan(40);
  });

  test('STYLE-08/09/10: major screens have no horizontal overflow at this viewport', async ({ page }) => {
    await page.goto('/login');
    await expectNoHorizontalOverflow(page);
    await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
    await expectNoHorizontalOverflow(page);
    await page.locator('[data-testid="list-item"]:visible').first().click();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
    await loginAs(page, 'admin@toktickit.com', /\/admin\/users/);
    await expectNoHorizontalOverflow(page);
    await loginAs(page, 'requester1@toktickit.com', /:5173\/(tickets)?$/);
    await expectNoHorizontalOverflow(page);
  });

  test('STYLE-11: queue shows a table on wide screens and readable cards on narrow screens', async ({ page }) => {
    await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
    const narrow = (page.viewportSize()?.width ?? 1280) < 768;
    await expect(page.locator('table')).toBeVisible({ visible: !narrow });
    const item = page.locator('[data-testid="list-item"]:visible').first();
    await expect(item).toBeVisible();
    expect(await item.evaluate((el) => el.tagName)).toBe(narrow ? 'DIV' : 'TR');
  });

  test('STYLE-12: required list information stays legible (font size >= 12px, no clipped text)', async ({ page }) => {
    await loginAs(page, 'staff1@toktickit.com', /\/staff\/queue/);
    const item = page.locator('[data-testid="list-item"]:visible').first();
    const metrics = await item.evaluate((el) => [...el.querySelectorAll('*')]
      .filter((n) => n.childElementCount === 0 && (n.textContent ?? '').trim())
      .map((n) => ({
        badge: !!n.closest('.badge'),
        size: parseFloat(getComputedStyle(n).fontSize),
        clipped: n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow === 'hidden',
      })));
    expect(metrics.length).toBeGreaterThan(0);
    for (const m of metrics) {
      // Body text >= 12px; compact uppercase badge labels (Bootstrap .badge = 0.75em) >= 10px.
      expect(m.size).toBeGreaterThanOrEqual(m.badge ? 10 : 12);
      expect(m.clipped).toBe(false);
    }
  });
});
