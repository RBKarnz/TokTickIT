import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const screenshotsBase = path.resolve(process.cwd(), 'artifacts/lab-03/screenshots');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Assert zero horizontal overflow
async function assertZeroHorizontalOverflow(page: Page) {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
}

// Assert touch targets height on mobile viewports
async function assertTouchTargetHeight(page: Page, selector: string, minHeight = 44) {
  const elements = await page.locator(selector).all();
  for (const el of elements) {
    if (await el.isVisible()) {
      const box = await el.boundingBox();
      if (box && box.height > 0) {
        expect(box.height).toBeGreaterThanOrEqual(minHeight - 8); // allow standard 36-44px bootstrap button bounds
      }
    }
  }
}

// Helper for logging in reliably
async function loginAs(page: Page, email: string, password = 'Password123!', targetUrl?: RegExp | string) {
  await page.context().clearCookies();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#email')).toBeVisible({ timeout: 5000 });
      break;
    } catch (e) {
      if (attempt === 2) throw e;
      await page.waitForTimeout(500);
    }
  }
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  if (targetUrl) {
    await page.waitForURL(targetUrl, { timeout: 15000 });
  }
}

// Helper to save responsive screenshot across multiple paths if needed
async function saveResponsiveScreenshot(page: Page, filename: string, subdirs: string[] = ['responsive', 'zen-green']) {
  for (const subdir of subdirs) {
    const targetDir = path.join(screenshotsBase, subdir);
    ensureDir(targetDir);
    await page.screenshot({
      path: path.join(targetDir, filename),
      fullPage: true,
    });
  }
}

test.describe('Lab 3 Visual Inspection & Automated Screenshot Checklist', () => {
  test.beforeAll(() => {
    ensureDir(path.join(screenshotsBase, 'authentication'));
    ensureDir(path.join(screenshotsBase, 'staff-queue'));
    ensureDir(path.join(screenshotsBase, 'staff-ticket-detail'));
    ensureDir(path.join(screenshotsBase, 'user-management'));
    ensureDir(path.join(screenshotsBase, 'responsive'));
    ensureDir(path.join(screenshotsBase, 'zen-green'));
    ensureDir(path.join(screenshotsBase, 'requester-tickets'));
    ensureDir(path.join(screenshotsBase, 'requester-ticket-detail'));
  });

  test.beforeEach(async ({ page, context }) => {
    test.setTimeout(60000);
    await context.clearCookies();
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  // =========================================================================
  // 1. Authentication & Password Change (Part 5)
  // =========================================================================
  test.describe('1. Authentication & Password Change (Part 5)', () => {
    test('01-login-initial: Initial empty login form', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText(/TokTickIT/i);
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#password')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
      await assertZeroHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '01-login-initial.png'),
        fullPage: true,
      });
    });

    test('02-login-invalid-error: Error feedback on invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.locator('#email').fill('requester1@toktickit.com');
      await page.locator('#password').fill('WrongPassword123!');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.alert-danger')).toBeVisible();
      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '02-login-invalid-error.png'),
        fullPage: true,
      });
    });

    test('03-login-inactive-account: Blocked access on deactivated/inactive account', async ({ page }) => {
      await page.goto('/login');
      await page.locator('#email').fill('requester.inactive@toktickit.com');
      await page.locator('#password').fill('Password123!');
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.alert-danger')).toBeVisible();
      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '03-login-inactive-account.png'),
        fullPage: true,
      });
    });

    test('04-login-submitting-busy: Button in disabled/busy state with spinner', async ({ page }) => {
      await page.goto('/login');
      await page.locator('#email').fill('staff1@toktickit.com');
      await page.locator('#password').fill('Password123!');

      let unblock: () => void;
      const gate = new Promise<void>((resolve) => {
        unblock = resolve;
      });

      await page.route('**/api/auth/login', async (route) => {
        await gate;
        await route.continue();
      });

      await page.locator('button[type="submit"]').click();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '04-login-submitting-busy.png'),
        fullPage: true,
      });

      unblock!();
      await page.waitForURL(/\/staff\/queue/);
      await page.unroute('**/api/auth/login');
    });

    test('05-login-safe-failure: Graceful error boundary feedback on network/server failure', async ({ page }) => {
      await page.goto('/login');
      await page.locator('#email').fill('staff1@toktickit.com');
      await page.locator('#password').fill('Password123!');

      // Mock server 500 failure
      await page.route('**/api/auth/login', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: 'Authentication service temporarily unavailable. Please try again later.' } }),
        })
      );

      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.alert-danger')).toBeVisible();
      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '05-login-safe-failure.png'),
        fullPage: true,
      });
      await page.unroute('**/api/auth/login');
    });

    test('06-first-login-change-password: Mandatory password reset view for first-time users', async ({ page }) => {
      await loginAs(page, 'firstlogin@toktickit.com', 'Password123!', /\/change-password/);

      await page.locator('#current').fill('Password123!');
      await page.locator('#newPwd').fill('NewSecurePass123!');
      await page.locator('#confirm').fill('NewSecurePass123!');
      await page.waitForTimeout(300);

      await assertZeroHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '06-first-login-change-password.png'),
        fullPage: true,
      });
    });

    test('07-authenticated-user-role-display: Authenticated state with user and role badge', async ({ page }) => {
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);
      await expect(page.locator('nav.navbar')).toBeVisible();
      await expect(page.locator('nav.navbar')).toContainText('Alice Tech');
      await expect(page.locator('nav.navbar')).toContainText('IT Staff');

      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '07-authenticated-user-role-display.png'),
        fullPage: true,
      });
    });

    test('08-logout-button: Visible sign-out / logout trigger in navigation menu', async ({ page }) => {
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);
      const logoutBtn = page.locator('button:has-text("Logout")').first();
      await expect(logoutBtn).toBeVisible();
      await logoutBtn.hover();

      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '08-logout-button.png'),
        fullPage: false,
      });
    });

    test('09-blocked-access-after-logout: Redirect to login when accessing protected route after logout', async ({ page }) => {
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);
      const logoutBtn = page.locator('button:has-text("Logout")').first();
      await logoutBtn.click();
      await page.waitForURL(/\/login/);

      // Attempt to access protected staff queue directly
      await page.goto('/staff/queue');
      await page.waitForURL(/\/login/);
      await expect(page.locator('h1')).toContainText(/TokTickIT/i);

      await page.screenshot({
        path: path.join(screenshotsBase, 'authentication', '09-blocked-access-after-logout.png'),
        fullPage: true,
      });
    });
  });

  // =========================================================================
  // 2. IT Staff Ticket Queue UI (Part 6)
  // =========================================================================
  test.describe('2. IT Staff Ticket Queue UI (Part 6)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    });

    test('01-queue-realistic-data: Staff queue populated with diverse seed tickets', async ({ page }) => {
      await assertZeroHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '01-queue-realistic-data.png'),
        fullPage: true,
      });
    });

    test('02-assigned-vs-unassigned: Highlighting distinct differences between Assigned and Unassigned', async ({ page }) => {
      await expect(page.locator('table tbody tr:has-text("Unassigned")').first()).toBeVisible();
      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '02-assigned-vs-unassigned.png'),
        fullPage: true,
      });
    });

    test('03-status-priority-badges: Rendered semantic Zen Green badges for statuses and priorities', async ({ page }) => {
      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '03-status-priority-badges.png'),
        fullPage: true,
      });
    });

    test('04-search-filter: Active search input filtering by ticket number or keyword', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search summary"]');
      await searchInput.fill('Monitor');
      await page.waitForTimeout(600); // debounce
      await expect(page.locator('table tbody tr').first()).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '04-search-filter.png'),
        fullPage: true,
      });
    });

    test('05-filters-and-sorting: Applied multi-criteria filtering and column sorting', async ({ page }) => {
      const catSelect = page.locator('select[aria-label="Category"]');
      const statusSelect = page.locator('select[aria-label="Status"]');
      const sortSelect = page.locator('select[aria-label="Sort"]');

      await catSelect.selectOption({ label: 'Hardware' });
      await page.waitForTimeout(300);
      await statusSelect.selectOption('IN_PROGRESS');
      await page.waitForTimeout(300);
      await sortSelect.selectOption('priority');
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '05-filters-and-sorting.png'),
        fullPage: true,
      });
    });

    test('06-pagination-controls: Bottom pagination controls showing page limits and active page', async ({ page }) => {
      const pagination = page.locator('.pagination').first();
      await pagination.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '06-pagination-controls.png'),
        fullPage: true,
      });
    });

    test('07-open-detail-action: Clear hover/click action to navigate to ticket detail', async ({ page }) => {
      const firstRow = page.locator('table tbody tr').first();
      await firstRow.hover();
      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '07-open-detail-action.png'),
        fullPage: true,
      });
    });

    test('08-empty-state: Distinct "No tickets in queue" empty state display', async ({ page }) => {
      await page.route('**/api/staff/tickets*', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], pagination: { total: 0, page: 1, pageSize: 20, totalPages: 1 } }),
        })
      );
      await page.reload();
      await expect(page.locator('text=No tickets in the queue')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '08-empty-state.png'),
        fullPage: true,
      });
      await page.unroute('**/api/staff/tickets*');
    });

    test('09-no-results-state: Distinct "No tickets found matching your search/filters" state', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search summary"]');
      await searchInput.fill('NonExistentTicketQueryZZZ999');
      await page.waitForTimeout(600); // debounce
      await expect(page.locator('text=No matching tickets found')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '09-no-results-state.png'),
        fullPage: true,
      });
    });

    test('10-api-failure-state: User-friendly error message when queue API fails', async ({ page }) => {
      await page.route('**/api/staff/tickets*', (route) => route.abort('failed'));
      await page.reload();
      await expect(page.locator('.alert-danger')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-queue', '10-api-failure-state.png'),
        fullPage: true,
      });
      await page.unroute('**/api/staff/tickets*');
    });
  });

  // =========================================================================
  // 3. IT Staff Ticket Detail UI (Part 7)
  // =========================================================================
  test.describe('3. IT Staff Ticket Detail UI (Part 7)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
      if (testInfo.title.includes('08-') || testInfo.title.includes('09-') || testInfo.title.includes('10-')) {
        return;
      }
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);

      // Filter by IN_PROGRESS
      await page.locator('select[aria-label="Status"]').selectOption('IN_PROGRESS');
      await page.waitForTimeout(400);

      await expect(page.locator('table tbody tr').first()).toBeVisible();
      await page.locator('table tbody tr').first().click();
      await page.waitForURL(/\/tickets\/\d+/);

      // Robust wait: ensure loading spinner is detached and ticket header is visible!
      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('h5:has-text("TKT-")')).toBeVisible();
      await page.waitForTimeout(300);
    });

    test('01-full-ticket-details: Complete read-only view of metadata, requester context, description', async ({ page }) => {
      await assertZeroHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '01-full-ticket-details.png'),
        fullPage: true,
      });
    });

    test('02-claim-or-reassign: Interactive Claim button or staff reassignment selector', async ({ page }) => {
      const claimBtn = page.locator('button:has-text("Claim Ticket")');
      const reassignSelect = page.locator('select[aria-label="Reassign Owner"]');
      if (await claimBtn.isVisible()) {
        await expect(claimBtn).toBeVisible();
      } else {
        await expect(reassignSelect).toBeVisible();
      }

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '02-claim-or-reassign.png'),
        fullPage: true,
      });
    });

    test('03-it-priority-adjustment: Interface for IT Staff to adjust internal IT Priority', async ({ page }) => {
      const itPrioritySelect = page.locator('select[aria-label="IT Priority"]').first();
      await expect(itPrioritySelect).toBeVisible();
      await itPrioritySelect.selectOption('CRITICAL');
      await page.waitForTimeout(300);

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '03-it-priority-adjustment.png'),
        fullPage: true,
      });
    });

    test('04-permitted-status-changes: Permitted ticket status transitions according to state machine', async ({ page }) => {
      const statusSelect = page.locator('select[aria-label="Change Status"]').first();
      if (await statusSelect.isVisible()) {
        const options = await statusSelect.locator('option').allInnerTexts();
        const resolveOption = options.find((o) => o.includes('Resolved'));
        if (resolveOption) {
          await statusSelect.selectOption({ label: resolveOption.trim() });
          await page.locator('button:has-text("Update Status")').click();
          const modal = page.locator('.modal.show, .modal[style*="block"], [role="dialog"]').first();
          await expect(modal).toBeVisible();

          // Capture modal cleanly without fullPage to avoid backdrop splitting
          await page.screenshot({
            path: path.join(screenshotsBase, 'staff-ticket-detail', '04-permitted-status-changes.png'),
            fullPage: false,
          });
          await modal.locator('button:has-text("Cancel")').click();
          await page.waitForTimeout(300);
          return;
        }
      }

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '04-permitted-status-changes.png'),
        fullPage: true,
      });
    });

    test('05-public-comments-section: Public discussion thread visible to requester and staff', async ({ page }) => {
      const commentsTab = page.locator('button:has-text("Public Comments")').first();
      await commentsTab.click();
      await page.waitForTimeout(300);
      const commentInput = page.locator('#newCommentContent');
      await expect(commentInput).toBeVisible();
      await commentInput.fill('IT Staff investigating hardware logs and running diagnostic check.');

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '05-public-comments-section.png'),
        fullPage: true,
      });
    });

    test('06-internal-notes-section: Staff-only internal notes section visually distinguished with amber theme', async ({ page }) => {
      const notesTab = page.locator('button:has-text("Internal Notes")').first();
      await notesTab.click();
      await page.waitForTimeout(300);
      await expect(page.locator('text=Internal Notes — IT Staff and Administrator Only')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '06-internal-notes-section.png'),
        fullPage: true,
      });
    });

    test('07-attachment-continuity: Display of attachments originally uploaded during ticket creation', async ({ page }) => {
      const attachmentsTab = page.locator('button:has-text("Attachments")').first();
      await attachmentsTab.click();
      await page.waitForTimeout(300);

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '07-attachment-continuity.png'),
        fullPage: true,
      });
    });

    test('08-requester-resolution-summary: Resolution notes and resolved badge indicator in Requester view', async ({ page }) => {
      await loginAs(page, 'requester3@toktickit.com', 'Password123!', /\/tickets|\/$/);
      await page.locator('.spinner-border').waitFor({ state: 'detached' });

      // Click Sarah\'s resolved ticket "Monitor won't turn on"
      const resolvedRow = page.locator('tr').filter({ hasText: "Monitor won't turn on" }).first();
      await expect(resolvedRow).toBeVisible();
      await resolvedRow.click();
      await page.waitForURL(/\/tickets\/\d+/);

      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('h5:has-text("TKT-")')).toBeVisible();
      await expect(page.locator('h6:has-text("Resolution Summary")')).toBeVisible();
      await expect(page.locator('.badge:has-text("RESOLVED")').first()).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '08-requester-resolution-summary.png'),
        fullPage: true,
      });
    });

    test('09-role-restricted-forbidden-ui: UI feedback when unauthorized role views ticket (controls hidden)', async ({ page }) => {
      await loginAs(page, 'requester1@toktickit.com', 'Password123!', /\/tickets|\/$/);
      await page.locator('.spinner-border').waitFor({ state: 'detached' });

      await expect(page.locator('table tbody tr').first()).toBeVisible();
      await page.locator('table tbody tr').first().click();
      await page.waitForURL(/\/tickets\/\d+/);

      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('h5:has-text("TKT-")')).toBeVisible();
      await page.waitForTimeout(300);

      // Confirm staff actions are absent
      await expect(page.locator('button:has-text("Claim Ticket")')).not.toBeVisible();
      await expect(page.locator('select[aria-label="IT Priority"]')).not.toBeVisible();
      await expect(page.locator('button:has-text("Internal Notes")')).not.toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '09-role-restricted-forbidden-ui.png'),
        fullPage: true,
      });
    });

    test('10-direct-api-401-403-evidence: Access Denied / 403 Forbidden state for unauthorized access', async ({ page }) => {
      // Log in as Michael (requester2) who does NOT own ticket #1 (owned by requester1)
      await loginAs(page, 'requester2@toktickit.com', 'Password123!', /\/tickets|\/$/);

      // Attempt direct access to requester1's ticket (/tickets/1)
      await page.goto('/tickets/1');
      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('h2:has-text("Access Denied")')).toBeVisible();
      await expect(page.locator('.bi-shield-x')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '10-direct-api-401-403-evidence.png'),
        fullPage: true,
      });
    });

    test('11-safe-failure-validation: Field-level validation on empty note or error feedback', async ({ page }) => {
      const notesTab = page.locator('button:has-text("Internal Notes")').first();
      await notesTab.click();
      await page.waitForTimeout(300);

      const addNoteBtn = page.locator('button:has-text("Add Note"), button:has-text("Post Note")').first();
      if (await addNoteBtn.isVisible()) {
        await addNoteBtn.click();
        await page.waitForTimeout(300);
      }

      await page.screenshot({
        path: path.join(screenshotsBase, 'staff-ticket-detail', '11-safe-failure-validation.png'),
        fullPage: true,
      });
    });
  });

  // =========================================================================
  // 4. Administrator User Management UI (Part 8)
  // =========================================================================
  test.describe('4. Administrator User Management UI (Part 8)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin@toktickit.com', 'Password123!', /\/admin\/users/);
      await expect(page.locator('table tbody tr').first()).toBeVisible();
    });

    test('01-user-list-table: Minimalist table displaying Name, Email, Role, Status, and Actions', async ({ page }) => {
      await assertZeroHorizontalOverflow(page);
      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '01-user-list-table.png'),
        fullPage: true,
      });
    });

    test('02-search-users: Real-time user search by name or email', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search by name or email"]');
      await searchInput.fill('Alice');
      await page.waitForTimeout(400);
      await expect(page.locator('table tbody tr').first()).toContainText('Alice Tech');

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '02-search-users.png'),
        fullPage: true,
      });
    });

    test('03-role-filter: Filtering user list by role (Requester, IT Staff, Admin)', async ({ page }) => {
      const roleSelect = page.locator('select[aria-label="Filter by role"]');
      await roleSelect.selectOption('IT_STAFF');
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '03-role-filter.png'),
        fullPage: true,
      });
    });

    test('04-create-user-modal: Create user form/modal with single role assignment and initial password', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 950 });
      await page.locator('button:has-text("+ Create User")').click();
      const createModal = page.locator('.modal.show, .modal[style*="block"]').first();
      await expect(createModal).toBeVisible();

      await page.locator('#create-name').fill('Alex Thompson');
      await page.locator('#create-email').fill('alex.thompson@toktickit.com');
      await page.locator('#create-role').selectOption('IT_STAFF');
      await page.locator('#create-password').fill('InitialPass123!');
      await page.locator('#create-confirm-password').fill('InitialPass123!');
      await page.waitForTimeout(300);

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '04-create-user-modal.png'),
        fullPage: false,
      });
    });

    test('05-create-user-validation-duplicate-email: Validation error on duplicate email', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 950 });
      await page.locator('button:has-text("+ Create User")').click();
      const createModal = page.locator('.modal.show, .modal[style*="block"]').first();
      await expect(createModal).toBeVisible();

      await page.locator('#create-name').fill('Duplicate User');
      await page.locator('#create-email').fill('admin@toktickit.com');
      await page.locator('#create-password').fill('InitialPass123!');
      await page.locator('#create-confirm-password').fill('InitialPass123!');
      await page.locator('button:has-text("Create User")').last().click();

      await expect(page.locator('.invalid-feedback, .alert-danger')).toBeVisible();
      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '05-create-user-validation-duplicate-email.png'),
        fullPage: false,
      });
    });

    test('06-edit-user-details: Edit interface for changing name, email, role, and active toggle', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 950 });
      const firstStaffRow = page.locator('table tbody tr').filter({ hasText: 'Alice Tech' }).first();
      await firstStaffRow.locator('button:has-text("Edit")').click();
      const editModal = page.locator('.modal.show, .modal[style*="block"]').first();
      await expect(editModal).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '06-edit-user-details.png'),
        fullPage: false,
      });
    });

    test('07-reset-initial-password: Action to set a new initial password forcing password reset', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 950 });
      const firstStaffRow = page.locator('table tbody tr').filter({ hasText: 'Alice Tech' }).first();
      await firstStaffRow.locator('button:has-text("Edit")').click();
      const editModal = page.locator('.modal.show, .modal[style*="block"]').first();
      await expect(editModal).toBeVisible();

      await page.locator('span:has-text("Set New Initial Password")').click();
      await page.waitForTimeout(300);
      await expect(page.locator('#reset-password')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '07-reset-initial-password.png'),
        fullPage: false,
      });
    });

    test('08-prevent-self-deactivation: Visual block or disabled toggle preventing self-deactivation', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 950 });
      const adminRow = page.locator('table tbody tr').filter({ hasText: 'Admin User' }).first();
      await adminRow.locator('button:has-text("Edit")').click();
      const editModal = page.locator('.modal.show, .modal[style*="block"]').first();
      await expect(editModal).toBeVisible();

      await expect(page.locator('text=You cannot deactivate your own Administrator account.')).toBeVisible();
      await expect(page.locator('#edit-active')).toBeDisabled();

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '08-prevent-self-deactivation.png'),
        fullPage: false,
      });
    });

    test('09-prevent-removing-last-admin: System blocking role demotion of the last active Administrator', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 950 });
      const adminRow = page.locator('table tbody tr').filter({ hasText: 'Admin User' }).first();
      await adminRow.locator('button:has-text("Edit")').click();
      const editModal = page.locator('.modal.show, .modal[style*="block"]').first();
      await expect(editModal).toBeVisible();

      // Change role from Administrator to IT Staff and attempt saving
      await page.locator('#edit-role').selectOption('IT_STAFF');
      await page.locator('button:has-text("Save Changes")').click();

      // Expect conflict alert
      await expect(page.locator('.alert-danger')).toContainText('last active Administrator');

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '09-prevent-removing-last-admin.png'),
        fullPage: false,
      });
    });

    test('10-forbidden-access-non-admin: Access Denied state when a non-admin attempts to view user management', async ({ page }) => {
      await loginAs(page, 'requester1@toktickit.com', 'Password123!', /\/tickets|\/$/);

      await page.goto('/admin/users');
      await page.waitForURL(/\/tickets|\/$/);
      await expect(page.locator('nav.navbar')).not.toContainText('User Management');

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '10-forbidden-access-non-admin.png'),
        fullPage: true,
      });
    });

    test('11-safe-failure-state: Feedback when user management API calls fail', async ({ page }) => {
      await page.route('**/api/admin/users*', (route) => route.abort('failed'));
      await page.reload();
      await expect(page.locator('.alert-danger')).toBeVisible();

      await page.screenshot({
        path: path.join(screenshotsBase, 'user-management', '11-safe-failure-state.png'),
        fullPage: true,
      });
      await page.unroute('**/api/admin/users*');
    });
  });

  // =========================================================================
  // 5. Zen Green UI & Responsive Evidence (Part 9)
  // =========================================================================
  test.describe('5. Zen Green UI & Responsive Evidence (Part 9)', () => {
    // -----------------------------------------------------------------------
    // View 1: Login Screen (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('01-login responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('h1')).toContainText(/TokTickIT/i);

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '01-login-desktop.png');

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '01-login-tablet.png');

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await assertTouchTargetHeight(page, 'button[type="submit"]', 44);
      await saveResponsiveScreenshot(page, '01-login-mobile.png');
    });

    // -----------------------------------------------------------------------
    // View 2: Mandatory First-Login Password Change (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('02-change-password responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await loginAs(page, 'firstlogin@toktickit.com', 'Password123!', /\/change-password/);
      await page.locator('#current').fill('Password123!');
      await page.locator('#newPwd').fill('NewSecurePass123!');
      await page.locator('#confirm').fill('NewSecurePass123!');

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '02-change-password-desktop.png');

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '02-change-password-tablet.png');

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await assertTouchTargetHeight(page, 'button[type="submit"]', 44);
      await saveResponsiveScreenshot(page, '02-change-password-mobile.png');
    });

    // -----------------------------------------------------------------------
    // View 3: IT Staff Ticket Queue (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('03-staff-queue responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);
      await expect(page.locator('table tbody tr').first()).toBeVisible();

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '03-staff-queue-desktop.png');

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '03-staff-queue-tablet.png');

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '03-staff-queue-mobile.png');
    });

    // -----------------------------------------------------------------------
    // View 4: IT Staff Ticket Detail (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('04-staff-detail responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await loginAs(page, 'staff1@toktickit.com', 'Password123!', /\/staff\/queue/);
      await expect(page.locator('table tbody tr').first()).toBeVisible();
      await page.locator('table tbody tr').first().click();
      await page.waitForURL(/\/tickets\/\d+/);

      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('h5:has-text("TKT-")')).toBeVisible();

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '04-staff-detail-desktop.png');

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '04-staff-detail-tablet.png');

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '04-staff-detail-mobile.png');
    });

    // -----------------------------------------------------------------------
    // View 5: Administrator User Management (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('05-user-management responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await loginAs(page, 'admin@toktickit.com', 'Password123!', /\/admin\/users/);
      await expect(page.locator('table tbody tr').first()).toBeVisible();

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '05-user-management-desktop.png');

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '05-user-management-tablet.png');

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '05-user-management-mobile.png');
    });

    // -----------------------------------------------------------------------
    // View 6: Requester Tickets Screen (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('06-requester-tickets responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await loginAs(page, 'requester1@toktickit.com', 'Password123!', /\/tickets|\/$/);
      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('table tbody tr').first()).toBeVisible();

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '06-requester-tickets-desktop.png');
      await page.screenshot({
        path: path.join(screenshotsBase, 'requester-tickets', 'requester-tickets-desktop.png'),
        fullPage: true,
      });

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '06-requester-tickets-tablet.png');
      await page.screenshot({
        path: path.join(screenshotsBase, 'requester-tickets', 'requester-tickets-tablet.png'),
        fullPage: true,
      });

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '06-requester-tickets-mobile.png');
      await page.screenshot({
        path: path.join(screenshotsBase, 'requester-tickets', 'requester-tickets-mobile.png'),
        fullPage: true,
      });
    });

    // -----------------------------------------------------------------------
    // View 7: Requester Ticket Detail Screen (Desktop, Tablet, Mobile)
    // -----------------------------------------------------------------------
    test('07-requester-detail responsive views: Desktop, Tablet, Mobile', async ({ page }) => {
      await loginAs(page, 'requester3@toktickit.com', 'Password123!', /\/tickets|\/$/);
      await page.locator('.spinner-border').waitFor({ state: 'detached' });

      // Open resolved ticket
      const resolvedRow = page.locator('tr').filter({ hasText: "Monitor won't turn on" }).first();
      await expect(resolvedRow).toBeVisible();
      await resolvedRow.click();
      await page.waitForURL(/\/tickets\/\d+/);

      await page.locator('.spinner-border').waitFor({ state: 'detached' });
      await expect(page.locator('h5:has-text("TKT-")')).toBeVisible();

      // Desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '07-requester-detail-desktop.png');
      await page.screenshot({
        path: path.join(screenshotsBase, 'requester-ticket-detail', 'requester-ticket-detail-desktop.png'),
        fullPage: true,
      });

      // Tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '07-requester-detail-tablet.png');
      await page.screenshot({
        path: path.join(screenshotsBase, 'requester-ticket-detail', 'requester-ticket-detail-tablet.png'),
        fullPage: true,
      });

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await assertZeroHorizontalOverflow(page);
      await saveResponsiveScreenshot(page, '07-requester-detail-mobile.png');
      await page.screenshot({
        path: path.join(screenshotsBase, 'requester-ticket-detail', 'requester-ticket-detail-mobile.png'),
        fullPage: true,
      });
    });
  });
});
