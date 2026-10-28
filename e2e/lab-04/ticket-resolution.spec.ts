import { test, expect, request as apiRequest, type APIRequestContext, type Page, type Browser } from '@playwright/test';

// E2E-03, E2E-04, E2E-05, E2E-10 (tests.md Lab 4 E2E suite): resolution gate,
// stale-update detection (AC-08, AC-11, AC-14). Each test creates its own
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
      description: `Created by the Lab 4 ticket-resolution E2E test (${tag}).`,
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

async function openTicket(page: Page, ticket: { id: number; ticketNumber: string }) {
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.locator(`h5:has-text("${ticket.ticketNumber}")`)).toBeVisible();
}

const statusBadge = (page: Page) => page.locator('div:has(> label:text-is("Status")) .badge').first();

async function moveToInProgress(page: Page) {
  const changeStatus = page.locator('select[aria-label="Change Status"]');
  await changeStatus.selectOption({ label: 'Open' });
  await page.getByRole('button', { name: 'Update Status' }).click();
  await expect(statusBadge(page)).toHaveText('OPEN');
  await changeStatus.selectOption({ label: 'In Progress' });
  await page.getByRole('button', { name: 'Update Status' }).click();
  await expect(statusBadge(page)).toHaveText('IN PROGRESS');
}

test.describe('Ticket Resolution Gate & Stale Update (E2E-03, E2E-04, E2E-05, E2E-10)', () => {
  test('E2E-03: resolving without a completed Action is blocked by the gate', async ({ page }) => {
    const ticket = await createTicket('gate-blocked');
    await login(page, 'staff1@toktickit.com');
    await openTicket(page, ticket);
    await moveToInProgress(page);

    await page.locator('select[aria-label="Change Status"]').selectOption({ label: 'Resolved' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    const modal = page.locator('.modal.show');
    await expect(modal.getByText('Resolve Ticket')).toBeVisible();
    // No completed Action Taken exists yet: the gate blocks confirmation.
    await expect(modal.getByRole('button', { name: 'Confirm RESOLVED' })).toBeDisabled();
    await expect(modal.getByText(/completed action/i)).toBeVisible();
  });

  test('E2E-04: fulfilling the gate resolves the Ticket and appends to the status history', async ({ page }) => {
    const ticket = await createTicket('gate-fulfilled');
    await login(page, 'staff1@toktickit.com');
    await openTicket(page, ticket);
    await moveToInProgress(page);

    await page.locator('button:has-text("Actions Taken")').click();
    await page.locator('button:has-text("+ Add Action Taken")').click();
    await page.locator('#description').fill('Replaced the faulty cable.');
    await page.locator('#status').selectOption('COMPLETED');
    await page.locator('#result').fill('Link confirmed stable.');
    await page.locator('button:has-text("Save Action")').click();
    await expect(page.getByText('Replaced the faulty cable.')).toBeVisible();

    await page.locator('select[aria-label="Change Status"]').selectOption({ label: 'Resolved' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    const modal = page.locator('.modal.show');
    const confirm = modal.getByRole('button', { name: 'Confirm RESOLVED' });
    await expect(confirm).toBeDisabled();
    await modal.locator('#resolutionSummaryInput').fill('Replaced the faulty cable; link confirmed stable.');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(modal).toHaveCount(0);
    await expect(statusBadge(page)).toHaveText('RESOLVED');

    // The status history appended a row for this transition.
    await withApi('staff1@toktickit.com', async (api) => {
      const history = await (await api.ctx.get(`/api/tickets/${ticket.id}/status-history`)).json();
      const rows = Array.isArray(history) ? history : history.items;
      expect(rows.some((h: any) => h.toStatus === 'RESOLVED')).toBe(true);
    });
  });

  test('E2E-05: a Requester views a resolved Ticket read-only, with every Action and the resolution notice', async ({ page }) => {
    const ticket = await createTicket('requester-view');
    await withApi('staff1@toktickit.com', async (api) => {
      const me = await (await api.ctx.get('/api/auth/me')).json();
      await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, { status: 'OPEN' });
      await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, { status: 'IN_PROGRESS' });
      await apiCall(api, 'POST', `/api/tickets/${ticket.id}/actions`, {
        description: 'Diagnosed and repaired the issue.',
        result: 'Confirmed working.',
        status: 'COMPLETED',
        assignedToId: me.user.id,
      });
      await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, {
        status: 'RESOLVED',
        resolutionSummary: 'Diagnosed and repaired the issue; confirmed working.',
      });
    });

    await login(page, 'requester1@toktickit.com');
    await openTicket(page, ticket);
    await expect(statusBadge(page)).toHaveText('RESOLVED');
    await expect(page.getByText('Diagnosed and repaired the issue; confirmed working.')).toBeVisible();

    await page.locator('button:has-text("Actions Taken")').click();
    await expect(page.getByText('Diagnosed and repaired the issue.').first()).toBeVisible();
    // Read-only: no create/edit controls for a Requester.
    await expect(page.locator('button:has-text("+ Add Action Taken")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Edit")')).toHaveCount(0);
    // Internal Notes stay staff-only and must never appear to the Requester.
    await expect(page.locator('body')).not.toContainText('Internal Notes');
  });

  test('E2E-10: a stale status update is rejected with a 409 conflict, and the first browser keeps its typed input', async ({ page, browser }: { page: Page; browser: Browser }) => {
    const ticket = await createTicket('stale-update');
    await login(page, 'staff1@toktickit.com');
    await openTicket(page, ticket);

    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await login(secondPage, 'staff2@toktickit.com');
    await openTicket(secondPage, ticket);

    // Both browsers read the Ticket at version 1. The second browser changes
    // status first, advancing the version the first browser's page does not know about.
    await secondPage.locator('select[aria-label="Change Status"]').selectOption({ label: 'Open' });
    await secondPage.getByRole('button', { name: 'Update Status' }).click();
    await expect(statusBadge(secondPage)).toHaveText('OPEN');

    // The first browser, still holding the stale version, attempts a conflicting change.
    // CANCELLED requires the confirmation modal, where the (optional) reason lives.
    await page.locator('select[aria-label="Change Status"]').selectOption({ label: 'Cancelled' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    const modal = page.locator('.modal.show');
    await expect(modal).toBeVisible();
    const reason = modal.locator('#statusReasonInput');
    await reason.fill('Duplicate of another request.');
    await modal.getByRole('button', { name: 'Confirm CANCELLED' }).click();

    await expect(modal.getByText(/conflict|stale|out of date|reload/i).first()).toBeVisible();
    // The modal stays open with the typed reason preserved, not silently cleared.
    await expect(modal).toBeVisible();
    await expect(reason).toHaveValue('Duplicate of another request.');

    await secondContext.close();
  });
});
