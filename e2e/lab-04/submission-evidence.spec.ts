import { test, expect, request as apiRequest, type APIRequestContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Lab 4 submission evidence: captures the Ticket Workflow screen (status
// transition dropdown, Resolution Gate modal, status history timeline) at
// the three standard viewports into artifacts/lab-04/screenshots/ticket-workflow/.
// Login, Staff Queue, My Tickets, User Management, and other Lab 2-3
// regression screens already have current screenshots under
// artifacts/lab-02/screenshots/ and artifacts/lab-03/screenshots/.
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';
const PASSWORD = 'Password123!';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

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
      summary: `Submission evidence ${tag} ${Date.now()}`,
      description: `Created by the Lab 4 submission-evidence E2E test (${tag}).`,
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

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

test.describe('Lab 4 Submission Evidence: Ticket Workflow', () => {
  test.beforeAll(() => {
    ensureDir(path.resolve(process.cwd(), 'artifacts/lab-04/screenshots/ticket-workflow'));
  });

  for (const vp of VIEWPORTS) {
    test(`Capture Ticket Workflow: Resolution Gate modal (${vp.name})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const ticket = await createTicket(`workflow-${vp.name}`);

      await withApi('staff1@toktickit.com', async (api) => {
        await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/claim`, {});
        await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, { status: 'OPEN' });
        await apiCall(api, 'POST', `/api/staff/tickets/${ticket.id}/status`, { status: 'IN_PROGRESS' });
      });

      await login(page, 'staff1@toktickit.com');
      await openTicket(page, ticket);
      await expect(statusBadge(page)).toHaveText('IN PROGRESS');

      await page.locator('select[aria-label="Change Status"]').selectOption({ label: 'Resolved' });
      await page.getByRole('button', { name: 'Update Status' }).click();
      const modal = page.locator('.modal.show');
      await expect(modal.getByText('Resolve Ticket')).toBeVisible();

      const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(hasHorizontalScroll).toBe(false);

      const filePath = path.resolve(
        process.cwd(),
        `artifacts/lab-04/screenshots/ticket-workflow/ticket-workflow-${vp.name}.png`
      );
      await page.screenshot({ path: filePath, fullPage: true });
      expect(fs.existsSync(filePath)).toBe(true);
    });
  }
});
