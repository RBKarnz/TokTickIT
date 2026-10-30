import { test, expect, request as apiRequest, type APIRequestContext, type Page } from '@playwright/test';

// E2E-01, E2E-02, E2E-06, E2E-11 (tests.md Lab 4 E2E suite): Actions Taken
// lifecycle (AC-01, AC-06, AC-07, AC-09, AC-15). Each test creates its own
// Ticket through the API so no step depends on queue ordering or seed state.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const PASSWORD = 'Password123!';

type Api = { ctx: APIRequestContext; csrf: string };

async function apiLogin(email: string): Promise<Api> {
  const ctx = await apiRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/login', { data: { email, password: PASSWORD } });
  expect(res.status(), `login ${email}`).toBe(200);
  return { ctx, csrf: (await res.json()).csrfToken };
}

async function apiCall(api: Api, method: 'POST' | 'PUT' | 'PATCH', url: string, data: object) {
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

async function createTicket(tag: string): Promise<{ id: number; ticketNumber: string }> {
  return withApi('requester1@toktickit.com', async (api) => {
    const [category] = await (await api.ctx.get('/api/categories')).json();
    const [system] = await (await api.ctx.get('/api/systems')).json();
    const ticket = await apiCall(api, 'POST', '/api/tickets', {
      categoryId: category.id,
      relatedSystemId: system.id,
      requestedPriority: 'MEDIUM',
      summary: `E2E ${tag} ${Date.now()}`,
      description: `Created by the Lab 4 actions-taken-flow E2E test (${tag}).`,
    });
    return { id: ticket.id, ticketNumber: ticket.ticketNumber };
  });
}

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function openTicketActionsTab(page: Page, ticket: { id: number; ticketNumber: string }) {
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.locator(`h5:has-text("${ticket.ticketNumber}")`)).toBeVisible();
  await page.locator('button:has-text("Actions Taken")').click();
}

test.describe('Actions Taken Flow (E2E-01, E2E-02, E2E-06, E2E-11)', () => {
  test('E2E-01: IT Staff records multiple Actions, assigned and listed in chronological order', async ({ page }) => {
    const ticket = await createTicket('multi-action');
    await login(page, 'staff1@toktickit.com');
    await openTicketActionsTab(page, ticket);

    for (const description of ['First triage step.', 'Second follow-up step.']) {
      await page.locator('button:has-text("+ Add Action Taken")').click();
      await expect(page.locator('#description')).toBeVisible();
      await page.locator('#description').fill(description);
      await page.locator('button:has-text("Save Action")').click();
      await expect(page.getByText(description)).toBeVisible();
      // Wait for the form to close and the "+ Add Action Taken" trigger to come back
      // before starting the next Action, so the two saves never overlap.
      await expect(page.locator('button:has-text("+ Add Action Taken")')).toBeVisible();
    }

    const rows = page.locator('[data-testid="action-row"]:visible, [data-testid="action-card"]:visible');
    await expect(rows).toHaveCount(2);
    // Chronological order: the first action recorded appears before the second.
    const texts = await rows.allInnerTexts();
    expect(texts[0]).toContain('First triage step.');
    expect(texts[1]).toContain('Second follow-up step.');
  });

  test('E2E-02: IT Staff transitions an Action through to COMPLETED, then editing is locked', async ({ page }) => {
    const ticket = await createTicket('complete-action');
    await login(page, 'staff1@toktickit.com');
    await openTicketActionsTab(page, ticket);

    await page.locator('button:has-text("+ Add Action Taken")').click();
    await page.locator('#description').fill('Investigating the reported outage.');
    await page.locator('#status').selectOption('PLANNED');
    await page.locator('button:has-text("Save Action")').click();
    await expect(
      page.locator('[data-testid="action-row"]:visible, [data-testid="action-card"]:visible', {
        hasText: 'Investigating the reported outage.',
      })
    ).toBeVisible();

    await page.locator('button:has-text("Edit"):visible').first().click();
    await page.locator('#status').selectOption('COMPLETED');
    await page.locator('#result').fill('Outage resolved; service restored.');
    await page.locator('button:has-text("Save Action")').click();
    await expect(
      page.locator('[data-testid="action-row"]:visible, [data-testid="action-card"]:visible', {
        hasText: 'Outage resolved; service restored.',
      })
    ).toBeVisible();

    // A COMPLETED Action has no Edit button (BR-10).
    await expect(page.locator('button:has-text("Edit")')).toHaveCount(0);
  });

  test('E2E-06: Administrator claims, updates status, and logs an Action seamlessly', async ({ page }) => {
    const ticket = await createTicket('admin-flow');
    await login(page, 'admin@toktickit.com');
    await page.goto(`/tickets/${ticket.id}`);
    await expect(page.locator(`h5:has-text("${ticket.ticketNumber}")`)).toBeVisible();

    await page.locator('button:has-text("Claim Ticket")').click();
    await expect(page.getByText(/claimed/i)).toBeVisible();

    const changeStatus = page.locator('select[aria-label="Change Status"]');
    await changeStatus.selectOption({ label: 'Open' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(page.locator('div:has(> label:text-is("Status")) .badge').first()).toHaveText('OPEN');

    await page.locator('button:has-text("Actions Taken")').click();
    await page.locator('button:has-text("+ Add Action Taken")').click();
    await page.locator('#description').fill('Administrator reviewed and triaged the Ticket.');
    await page.locator('button:has-text("Save Action")').click();
    await expect(page.getByText('Administrator reviewed and triaged the Ticket.')).toBeVisible();
  });

  test('E2E-11: a rapid double click on Save Action, while the request is still in flight, creates exactly one Action', async ({ page }) => {
    const ticket = await createTicket('double-click');
    await login(page, 'staff1@toktickit.com');
    await openTicketActionsTab(page, ticket);

    // Delay the create response so the two clicks land while the first request
    // is still pending — the real scenario the duplicate-submit guard defends
    // against (a local round trip is otherwise too fast to race reliably).
    let requestCount = 0;
    await page.route('**/api/tickets/*/actions', async (route) => {
      if (route.request().method() === 'POST') {
        requestCount += 1;
        await new Promise((r) => setTimeout(r, 500));
      }
      await route.continue();
    });

    await page.locator('button:has-text("+ Add Action Taken")').click();
    await page.locator('#description').fill('Double-click guarded submission.');
    // Two native clicks dispatched in the same JS tick, mirroring a real rapid
    // double click more closely than two separate Playwright .click() calls
    // (which each round-trip through the browser and can straddle a React
    // re-render that disables the button in between).
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.includes('Save Action'));
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    await expect(page.getByText('Double-click guarded submission.')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="action-row"]:visible, [data-testid="action-card"]:visible')).toHaveCount(1);
    expect(requestCount).toBe(1);
  });
});
