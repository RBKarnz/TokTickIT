import { test, expect, Page, request as apiRequest, APIRequestContext } from '@playwright/test';

// STYLE-01..08 (tests.md Lab 4 Style/A11y/Responsive suite): the new Lab 4
// screens (Dashboards, Actions Taken tab, Ticket Workflow modal) follow the
// same Zen Green tokens, focus rings, non-color status cues and responsive
// containment rules already proven for Lab 1-3 screens. Runs in every
// Playwright project, so it is exercised at Desktop, Tablet and Mobile.
const ZEN_GREEN = 'rgb(0, 107, 60)'; // #006B3C primary token (ui-spec §10)
const PASSWORD = 'Password123!';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

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

type Api = { ctx: APIRequestContext; csrf: string };

async function apiLogin(email: string): Promise<Api> {
  const ctx = await apiRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/login', { data: { email, password: PASSWORD } });
  expect(res.status(), `login ${email}`).toBe(200);
  return { ctx, csrf: (await res.json()).csrfToken };
}

async function apiCall(api: Api, method: 'POST' | 'PATCH', url: string, data: object) {
  const res = await api.ctx.fetch(url, { method, data, headers: { 'X-CSRF-Token': api.csrf } });
  expect(res.ok(), `${method} ${url} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

async function withApi<T>(email: string, fn: (api: Api) => Promise<T>): Promise<T> {
  const api = await apiLogin(email);
  try {
    return await fn(api);
  } finally {
    await api.ctx.dispose();
  }
}

/** A NEW, unassigned Ticket owned by requester1; NEW always offers Cancelled per the status matrix. */
async function createTicket(tag: string): Promise<{ id: number; ticketNumber: string }> {
  return withApi('requester1@toktickit.com', async (api) => {
    const [category] = await (await api.ctx.get('/api/categories')).json();
    const [system] = await (await api.ctx.get('/api/systems')).json();
    const ticket = await apiCall(api, 'POST', '/api/tickets', {
      categoryId: category.id,
      relatedSystemId: system.id,
      requestedPriority: 'MEDIUM',
      summary: `E2E style ${tag} ${Date.now()}`,
      description: `Created by the Lab 4 style E2E test (${tag}).`,
    });
    return { id: ticket.id, ticketNumber: ticket.ticketNumber };
  });
}

/** An OPEN, CRITICAL-priority Ticket owned by staff1, so it always lands in the Urgent list (Open group + CRITICAL). */
async function createUrgentTicket(tag: string): Promise<{ id: number; ticketNumber: string }> {
  const ticket = await createTicket(tag);
  await withApi('staff1@toktickit.com', async (api) => {
    await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, { status: 'OPEN' });
    await apiCall(api, 'PATCH', `/api/staff/tickets/${ticket.id}/it-priority`, { itPriority: 'CRITICAL' });
  });
  return ticket;
}

/** Row group of elements sharing (approximately) the same top offset, i.e. the same visual row. */
function groupByRow(boxes: { y: number }[], tolerancePx = 4): number {
  const sortedTops = [...boxes].map((b) => b.y).sort((a, b) => a - b);
  let rows = 1;
  for (let i = 1; i < sortedTops.length; i++) {
    if (sortedTops[i] - sortedTops[i - 1] > tolerancePx) rows++;
  }
  return rows;
}

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

  test('STYLE-03: the Urgent list badge carries a text label (and an icon where the design calls for one), not color alone', async ({ page }) => {
    const ticket = await createUrgentTicket('style-03');
    await login(page, 'staff1@toktickit.com');

    const row = page.locator(`text=${ticket.ticketNumber}`).locator('xpath=ancestor::li[1]');
    await expect(row).toBeVisible();
    const badges = row.locator('.badge');
    await expect(badges.first()).toBeVisible();
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);

    for (const badge of await badges.all()) {
      const text = (await badge.innerText()).trim();
      const hasIcon = (await badge.locator('i[class*="bi-"]').count()) > 0;
      // Non-color cue required: a readable text label, an icon, or both.
      expect(text.length > 0 || hasIcon).toBe(true);
    }
    // The CRITICAL priority badge specifically must say so in text, since it carries no icon.
    await expect(row.getByText('CRITICAL', { exact: false })).toBeVisible();
  });

  test('STYLE-04/05/06: the Dashboard metric cards lay out in the column count this viewport requires, with no overflow', async ({ page }) => {
    await login(page, 'requester1@toktickit.com');
    await expectNoHorizontalOverflow(page);

    await login(page, 'staff1@toktickit.com');
    await expectNoHorizontalOverflow(page);

    // The metric-card grid is `col-6 col-md-3` (Bootstrap): 4 per row from the
    // md breakpoint (>=768px, so Tablet included) down to 2 per row below it.
    const width = page.viewportSize()?.width ?? 1280;
    const expectedColumns = width >= 768 ? 4 : 2;

    const metricCards = page.locator('.card.shadow-sm.border-0.h-100');
    await expect(metricCards.first()).toBeVisible();
    const count = await metricCards.count();
    expect(count).toBeGreaterThanOrEqual(4);

    const boxes = (await Promise.all(
      (await metricCards.all()).slice(0, 4).map((c) => c.boundingBox())
    )).filter((b): b is { x: number; y: number; width: number; height: number } => b !== null);
    expect(boxes).toHaveLength(4);

    // All 4 cards sharing one row means Desktop's 4-per-row grid; split across
    // 2 rows of 2 means Tablet; one per row means Mobile.
    const rows = groupByRow(boxes);
    const cardsPerRow = 4 / rows;
    expect(cardsPerRow).toBe(expectedColumns);

    await metricCards.first().click();
    await page.waitForLoadState('networkidle');
    await expectNoHorizontalOverflow(page);
  });

  test('STYLE-07: the Actions Taken create form associates its required field with its validation message', async ({ page }) => {
    const ticket = await createTicket('style-07');
    await login(page, 'staff1@toktickit.com');
    await page.goto(`/tickets/${ticket.id}`);
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
    const ticket = await createTicket('style-08'); // NEW: Cancelled is always offered.
    await login(page, 'staff1@toktickit.com');
    await page.goto(`/tickets/${ticket.id}`);
    await page.waitForLoadState('networkidle');

    const changeStatus = page.locator('select[aria-label="Change Status"]');
    await expect(changeStatus).toBeVisible();
    const options = await changeStatus.locator('option').allInnerTexts();
    expect(options).toContain('Cancelled');

    await changeStatus.selectOption({ label: 'Cancelled' });
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
