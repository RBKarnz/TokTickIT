import { test, expect, request as apiRequest, type APIRequestContext, type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Every test works on its own Ticket created through the API, so no step depends on
// whichever Ticket happens to be first in the queue, and no step is skipped.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const PASSWORD = 'Password123!';
const STATUS_BADGE: Record<string, string> = {
  NEW: 'NEW',
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN PROGRESS',
  WAITING_FOR_REQUESTER: 'WAITING',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
  CANCELLED: 'CANCELLED',
};
const STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
};

async function staffLogin(page: Page, email = 'staff1@toktickit.com', password = PASSWORD) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/staff\/queue/);
}

async function requesterLogin(page: Page, email = 'requester1@toktickit.com', password = PASSWORD) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/tickets|\/$/);
}

type Api = { ctx: APIRequestContext; csrf: string };

async function apiLogin(email: string): Promise<Api> {
  const ctx = await apiRequest.newContext({ baseURL: API_URL });
  const res = await ctx.post('/api/auth/login', { data: { email, password: PASSWORD } });
  expect(res.status(), `login ${email}`).toBe(200);
  return { ctx, csrf: (await res.json()).csrfToken };
}

async function apiCall(api: Api, method: 'POST' | 'PUT', url: string, data: object) {
  const res = await api.ctx.fetch(url, { method, data, headers: { 'X-CSRF-Token': api.csrf } });
  expect(res.ok(), `${method} ${url} -> ${res.status()} ${await res.text()}`).toBeTruthy();
  return res.json();
}

// Creates a fresh NEW, unassigned Ticket owned by requester1.
async function createTicket(tag: string, requestedPriority = 'MEDIUM'): Promise<{ id: number; ticketNumber: string; summary: string }> {
  const api = await apiLogin('requester1@toktickit.com');
  const [category] = await (await api.ctx.get('/api/categories')).json();
  const [system] = await (await api.ctx.get('/api/systems')).json();
  const summary = `E2E ${tag} ${Date.now()}`;
  const ticket = await apiCall(api, 'POST', '/api/tickets', {
    categoryId: category.id,
    relatedSystemId: system.id,
    requestedPriority,
    summary,
    description: `Created by the Lab 3 staff flow E2E test (${tag}).`,
  });
  await api.ctx.dispose();
  return { id: ticket.id, ticketNumber: ticket.ticketNumber, summary };
}

async function asStaff1<T>(fn: (api: Api) => Promise<T>): Promise<T> {
  const api = await apiLogin('staff1@toktickit.com');
  try {
    return await fn(api);
  } finally {
    await api.ctx.dispose();
  }
}

async function openTicket(page: Page, ticket: { id: number; ticketNumber: string }) {
  await page.goto(`/tickets/${ticket.id}`);
  await expect(page.locator(`h5:has-text("${ticket.ticketNumber}")`)).toBeVisible();
}

const statusBadge = (page: Page) => page.locator('div:has(> label:text-is("Status")) .badge').first();
const requestedPriorityBadge = (page: Page) => page.locator('div:has(> label:text-is("Requested Priority")) .badge').first();
const ownerBadge = (page: Page) => page.locator('div:has(> label:text-is("Assigned Owner")) .badge').first();
const visibleRows = (page: Page) => page.locator('[data-testid="list-item"]:visible');
const queueResponse = (page: Page, match: (url: URL) => boolean) =>
  page.waitForResponse((res) => {
    if (!res.url().includes('/api/staff/tickets?') || res.request().method() !== 'GET') return false;
    return res.status() === 200 && match(new URL(res.url()));
  });

test.describe('IT Staff Ticket Flow & Operations (E2E-09 to E2E-21)', () => {
  test('E2E-09: Staff opens Queue with seeded realistic data', async ({ page }) => {
    const firstLoad = queueResponse(page, () => true);
    await staffLogin(page);
    const body = await (await firstLoad).json();

    expect(body.pagination.totalItems).toBeGreaterThan(20);
    await expect(visibleRows(page)).toHaveCount(body.items.length);
    await expect(visibleRows(page).first()).toContainText(body.items[0].ticketNumber);
    await expect(page.getByText(`Showing 1 to 20 of ${body.pagination.totalItems} tickets`)).toBeVisible();
  });

  test('E2E-10: Queue search, filters, sort, and pagination boundary cases', async ({ page }) => {
    test.setTimeout(90_000);
    const ticket = await createTicket('queue-search');
    await staffLogin(page);

    // 1. Search by a unique summary returns exactly that Ticket
    const searched = queueResponse(page, (u) => u.searchParams.get('search') === ticket.summary);
    await page.locator('input[placeholder*="Search"]').fill(ticket.summary);
    expect((await (await searched).json()).items).toHaveLength(1);
    await expect(visibleRows(page)).toHaveCount(1);
    await expect(visibleRows(page).first()).toContainText(ticket.ticketNumber);

    const cleared = queueResponse(page, (u) => !u.searchParams.has('search'));
    await page.locator('input[placeholder*="Search"]').fill('');
    await cleared;

    // 2. Status filter offers all 8 statuses, and each one updates the displayed rows
    const statusSelect = page.locator('select[aria-label="Status"]');
    const values = await statusSelect.locator('option').evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    expect(values).toEqual(['', ...Object.keys(STATUS_BADGE)]);

    for (const status of Object.keys(STATUS_BADGE)) {
      const filtered = queueResponse(page, (u) => u.searchParams.get('status') === status);
      await statusSelect.selectOption(status);
      const { items } = await (await filtered).json();
      if (status === 'OPEN' || status === 'CLOSED') expect(items.length, `${status} rows`).toBeGreaterThan(0);
      expect(items.every((t: { status: string }) => t.status === STATUS_LABEL[status]), `${status} items`).toBe(true);
      await expect(visibleRows(page)).toHaveCount(items.length);
      if (items.length > 0) {
        await expect(visibleRows(page).first()).toContainText(items[0].ticketNumber);
        await expect(visibleRows(page).first()).toContainText(STATUS_BADGE[status]);
      }
    }
    const allStatuses = queueResponse(page, (u) => !u.searchParams.has('status'));
    await statusSelect.selectOption('');
    await allStatuses;

    // 3. Sort changes the order of the displayed rows
    const sortSelect = page.locator('select[aria-label="Sort"]');
    for (const [sort, direction] of [['oldest', 1], ['newest', -1]] as const) {
      const sorted = queueResponse(page, (u) => u.searchParams.get('sort') === sort);
      await sortSelect.selectOption(sort);
      const { items } = await (await sorted).json();
      const times = items.map((t: { createdAt: string }) => Date.parse(t.createdAt));
      for (let i = 1; i < times.length; i++) expect(Math.sign(times[i] - times[i - 1]) * direction).toBeGreaterThanOrEqual(0);
      await expect(visibleRows(page).first()).toContainText(items[0].ticketNumber);
    }

    // 4. Pagination: Next shows page 2, Previous returns to page 1
    const page1First = (await visibleRows(page).first().innerText()).trim();
    const page2 = queueResponse(page, (u) => u.searchParams.get('page') === '2');
    await page.getByRole('button', { name: 'Next' }).click();
    const page2Body = await (await page2).json();
    await expect(page.getByText(/Showing 21 to 40 of \d+ tickets/)).toBeVisible();
    await expect(visibleRows(page).first()).toContainText(page2Body.items[0].ticketNumber);
    expect((await visibleRows(page).first().innerText()).trim()).not.toBe(page1First);

    const page1 = queueResponse(page, (u) => u.searchParams.get('page') === '1');
    await page.getByRole('button', { name: 'Previous' }).click();
    await page1;
    await expect(page.getByText(/Showing 1 to 20 of \d+ tickets/)).toBeVisible();
  });

  test('E2E-11 & E2E-12: Open Ticket Detail and Claim unassigned ticket', async ({ page }) => {
    const ticket = await createTicket('claim');
    await staffLogin(page);

    // E2E-11: open the Ticket from the queue search and see its details
    await page.locator('input[placeholder*="Search"]').fill(ticket.summary);
    await expect(visibleRows(page)).toHaveCount(1);
    await visibleRows(page).first().click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${ticket.id}$`));
    await expect(page.locator(`h5:has-text("${ticket.ticketNumber}")`)).toBeVisible();
    await expect(page.getByText(ticket.summary)).toBeVisible();

    // E2E-12: claim the unassigned Ticket
    await expect(ownerBadge(page)).toHaveText('Unassigned');
    await page.getByRole('button', { name: 'Claim Ticket' }).click();
    await expect(ownerBadge(page)).toContainText('Alice Tech');
    await page.reload();
    await expect(ownerBadge(page)).toContainText('Alice Tech');
    await expect(page.getByRole('button', { name: 'Claim Ticket' })).toHaveCount(0);
  });

  test('E2E-13: Reassign Ticket to another active Staff member', async ({ page }) => {
    const ticket = await createTicket('reassign');
    await asStaff1((api) => apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/claim`, {}));
    await staffLogin(page);
    await openTicket(page, ticket);

    await expect(ownerBadge(page)).toContainText('Alice Tech');
    await page.locator('select[aria-label="Reassign Owner"]').selectOption({ label: 'Bob Support' });
    await page.getByRole('button', { name: 'Reassign' }).click();
    await expect(ownerBadge(page)).toContainText('Bob Support');
    await page.reload();
    await expect(ownerBadge(page)).toContainText('Bob Support');
  });

  test('E2E-14: Update IT Priority independently from Requested Priority', async ({ page }) => {
    const ticket = await createTicket('priority', 'LOW');
    await staffLogin(page);
    await openTicket(page, ticket);

    await expect(requestedPriorityBadge(page)).toHaveText('LOW');
    const saved = page.waitForResponse((r) => r.url().endsWith(`/api/staff/tickets/${ticket.id}/it-priority`) && r.request().method() === 'PATCH');
    await page.locator('select[aria-label="IT Priority"]').selectOption('CRITICAL');
    expect((await saved).status()).toBe(200);

    await page.reload();
    await expect(page.locator('select[aria-label="IT Priority"]')).toHaveValue('CRITICAL');
    await expect(requestedPriorityBadge(page)).toHaveText('LOW');
  });

  test('E2E-15 & E2E-16: Status transition with confirmation modal & mandatory resolution summary for RESOLVED', async ({ page }) => {
    const ticket = await createTicket('status');
    await staffLogin(page);
    await openTicket(page, ticket);
    const changeStatus = page.locator('select[aria-label="Change Status"]');

    // E2E-16: a NEW Ticket offers only its valid transitions, and the API rejects a skipped step
    await expect(statusBadge(page)).toHaveText('NEW');
    expect(await changeStatus.locator('option').allInnerTexts()).toEqual(['-- Select Status --', 'Open', 'Cancelled']);
    await asStaff1(async (api) => {
      const res = await api.ctx.post(`/api/staff/tickets/${ticket.id}/status`, {
        data: { status: 'RESOLVED', resolutionSummary: 'Should not be allowed.' },
        headers: { 'X-CSRF-Token': api.csrf },
      });
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });

    // E2E-15: NEW -> OPEN without a modal
    await changeStatus.selectOption({ label: 'Open' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(page.getByText('Status successfully updated to Open')).toBeVisible();
    await expect(statusBadge(page)).toHaveText('OPEN');

    // OPEN -> IN PROGRESS, then RESOLVED through the modal that requires a summary
    await changeStatus.selectOption({ label: 'In Progress' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    await expect(statusBadge(page)).toHaveText('IN PROGRESS');

    await changeStatus.selectOption({ label: 'Resolved' });
    await page.getByRole('button', { name: 'Update Status' }).click();
    const modal = page.locator('.modal.show');
    await expect(modal.getByText('Resolve Ticket')).toBeVisible();
    const confirm = modal.getByRole('button', { name: 'Confirm RESOLVED' });
    await expect(confirm).toBeDisabled();
    await modal.locator('#resolutionSummaryInput').fill('Replaced the faulty network cable and confirmed the link is stable.');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(modal).toHaveCount(0);
    await expect(statusBadge(page)).toHaveText('RESOLVED');

    await page.reload();
    await expect(statusBadge(page)).toHaveText('RESOLVED');
    await expect(page.getByText('Replaced the faulty network cable and confirmed the link is stable.')).toBeVisible();
  });

  test('E2E-17 & E2E-18: Public Comments and Internal Notes persistence', async ({ page }) => {
    const ticket = await createTicket('comments');
    await staffLogin(page);
    await openTicket(page, ticket);

    // 1. Post Public Comment
    await page.locator('button:has-text("Public Comments")').first().click();
    const commentInput = page.getByLabel('Add a Public Comment');
    await expect(commentInput).toBeVisible();
    const testComment = `E2E Public Comment ${Date.now()}`;
    await commentInput.fill(testComment);
    await page.locator('button:has-text("Post Comment")').first().click();
    await expect(page.locator(`text=${testComment}`)).toBeVisible();

    // 2. Post Internal Note (Staff only)
    await page.locator('button:has-text("Internal Notes")').first().click();
    const noteInput = page.getByLabel('Add an Internal Note');
    await expect(noteInput).toBeVisible();
    const testNote = `E2E Internal Note ${Date.now()}`;
    await noteInput.fill(testNote);
    await page.locator('button:has-text("Post Internal Note")').first().click();
    await expect(page.locator(`text=${testNote}`)).toBeVisible();

    // 3. Both are still there after a reload (persisted in the database)
    await page.reload();
    await page.locator('button:has-text("Public Comments")').first().click();
    await expect(page.locator(`text=${testComment}`)).toBeVisible();
    await page.locator('button:has-text("Internal Notes")').first().click();
    await expect(page.locator(`text=${testNote}`)).toBeVisible();
  });

  test('E2E-19: Requester views ticket: sees Public Comments but never Internal Notes tab/content', async ({ page }) => {
    const ticket = await createTicket('requester-view');
    const comment = `E2E visible comment ${Date.now()}`;
    const note = `E2E hidden note ${Date.now()}`;
    await asStaff1(async (api) => {
      await apiCall(api, 'POST', `/api/tickets/${ticket.id}/public-comments`, { content: comment });
      await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/internal-notes`, { content: note });
    });

    await requesterLogin(page);
    await openTicket(page, ticket);
    await page.locator('button:has-text("Public Comments")').first().click();
    await expect(page.getByText(comment)).toBeVisible();

    await expect(page.locator('button:has-text("Internal Notes"), [role="tab"]:has-text("Internal Notes")')).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Internal Notes');
    await expect(page.locator('body')).not.toContainText(note);
  });

  test('E2E-20: Requester toggles Problem Appears Resolved without altering formal status', async ({ page }) => {
    const ticket = await createTicket('requester-resolved');
    await asStaff1((api) => apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, { status: 'OPEN' }));

    await requesterLogin(page);
    await openTicket(page, ticket);
    await expect(statusBadge(page)).toHaveText('OPEN');
    await page.getByRole('button', { name: 'Problem Appears Resolved' }).click();
    // The button is replaced by the recorded indication; the formal status stays OPEN
    await expect(page.getByText(/You indicated this issue appears resolved on/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Problem Appears Resolved' })).toHaveCount(0);
    await expect(statusBadge(page)).toHaveText('OPEN');

    await page.reload();
    await expect(page.getByText(/You indicated this issue appears resolved on/)).toBeVisible();
    await expect(statusBadge(page)).toHaveText('OPEN');
  });

  test('E2E-21: Attachments continuity: view and download attachment', async ({ page }) => {
    const ticket = await createTicket('attachment');
    const fixture = path.resolve(process.cwd(), 'e2e/fixtures/sample-doc.pdf');
    const requester = await apiLogin('requester1@toktickit.com');
    const upload = await requester.ctx.post(`/api/tickets/${ticket.id}/attachments`, {
      headers: { 'X-CSRF-Token': requester.csrf },
      multipart: { file: { name: 'sample-doc.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(fixture) } },
    });
    expect(upload.status(), await upload.text()).toBe(201);
    await requester.ctx.dispose();

    await staffLogin(page);
    await openTicket(page, ticket);
    await page.getByRole('button', { name: /Attachments \(1\)/ }).click();
    await expect(page.getByText('sample-doc.pdf').first()).toBeVisible();

    const downloadEvent = page.waitForEvent('download');
    await page.locator('button[title="Download"]:visible').first().click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('sample-doc.pdf');
    expect(fs.statSync(await download.path()).size).toBe(fs.statSync(fixture).size);
  });
});
