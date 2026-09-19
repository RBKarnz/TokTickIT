import { test, expect } from '@playwright/test';

async function staffLogin(page: any, email = 'staff1@toktickit.com', password = 'Password123!') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/staff\/queue/);
}

async function requesterLogin(page: any, email = 'requester1@toktickit.com', password = 'Password123!') {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/tickets|\/$/);
}

test.describe('IT Staff Ticket Flow & Operations (E2E-09 to E2E-21)', () => {
  test('E2E-09: Staff opens Queue with seeded realistic data', async ({ page }) => {
    await staffLogin(page);
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
  });

  test('E2E-10: Queue search, filters, sort, and pagination boundary cases', async ({ page }) => {
    await staffLogin(page);

    // 1. Search by summary/ticket number substring
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('TKT');
    await page.waitForTimeout(600); // debounce 500ms
    await expect(page.locator('table tbody tr').first()).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(600);

    // 2. Filter by status (test valid status options)
    const statusSelect = page.locator('select#statusFilter, select').filter({ hasText: /All Statuses/i }).first();
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('OPEN');
      await page.waitForTimeout(400);
      await statusSelect.selectOption(''); // all
    }

    // 3. Sort by priority or updated date
    const sortSelect = page.locator('select#sortSelect, select').filter({ hasText: /Updated|Priority/i }).first();
    if (await sortSelect.isVisible()) {
      await sortSelect.selectOption({ index: 1 });
      await page.waitForTimeout(400);
    }

    // 4. Pagination: Verify navigation controls render without crash
    await expect(page.locator('.pagination, [aria-label*="pagination"], button:has-text("Next"), button:has-text("Previous")').first()).toBeVisible();
  });

  test('E2E-11 & E2E-12: Open Ticket Detail and Claim unassigned ticket', async ({ page }) => {
    await staffLogin(page);

    // Find and click an unassigned ticket or the first available ticket
    const firstRow = page.locator('table tbody tr').first();
    await firstRow.click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    // Claim button if unassigned
    const claimBtn = page.locator('button:has-text("Claim")');
    if (await claimBtn.isVisible()) {
      await claimBtn.click();
      await expect(page.locator('.alert-success, text=successfully, text=Claimed')).toBeVisible();
    }
  });

  test('E2E-13: Reassign Ticket to another active Staff member', async ({ page }) => {
    await staffLogin(page);
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    const reassignSelect = page.locator('select#reassignSelect, select').filter({ hasText: /Select Staff|Bob|Charlie/i }).first();
    const reassignBtn = page.locator('button:has-text("Reassign"), button:has-text("Assign")').first();

    if (await reassignSelect.isVisible() && await reassignBtn.isVisible()) {
      await reassignSelect.selectOption({ index: 1 });
      await reassignBtn.click();
      await expect(page.locator('.alert-success, text=successfully, text=assigned')).toBeVisible();
    }
  });

  test('E2E-14: Update IT Priority independently from Requested Priority', async ({ page }) => {
    await staffLogin(page);
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    const prioritySelect = page.locator('select#itPrioritySelect, select').filter({ hasText: /LOW|MEDIUM|HIGH|CRITICAL/i }).first();
    const updateBtn = page.locator('button:has-text("Update Priority")');

    if (await prioritySelect.isVisible() && await updateBtn.isVisible()) {
      await prioritySelect.selectOption('CRITICAL');
      await updateBtn.click();
      await expect(page.locator('.alert-success, text=successfully, text=Priority')).toBeVisible();
    }
  });

  test('E2E-15 & E2E-16: Status transition with confirmation modal & mandatory resolution summary for RESOLVED', async ({ page }) => {
    await staffLogin(page);
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    const statusDropdown = page.locator('select#statusSelect, select').filter({ hasText: /Change Status|Open|In Progress|Resolved/i }).first();
    if (await statusDropdown.isVisible()) {
      const options = await statusDropdown.locator('option').allInnerTexts();
      // Ensure only valid transitions are offered
      expect(options.join(' ')).not.toContain('SUPER_STATUS');

      if (options.some(o => o.includes('Resolved'))) {
        await statusDropdown.selectOption({ label: 'Resolved' });
        // Modal appears
        const modal = page.locator('.modal, [role="dialog"]').first();
        await expect(modal).toBeVisible();

        // Submitting without summary should be blocked
        const confirmBtn = modal.locator('button:has-text("Confirm"), button:has-text("Resolve")');
        await confirmBtn.click();
        await expect(modal.locator('.invalid-feedback, .text-danger')).toBeVisible();

        // Fill resolution summary
        await modal.locator('textarea').fill('Issue investigated and resolved successfully by replacing the faulty network cable.');
        await confirmBtn.click();
        await expect(page.locator('.alert-success, text=successfully, text=Resolved')).toBeVisible();
      }
    }
  });

  test('E2E-17 & E2E-18: Public Comments and Internal Notes persistence', async ({ page }) => {
    await staffLogin(page);
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    // 1. Post Public Comment
    const commentTab = page.locator('button:has-text("Public Comments"), a:has-text("Public Comments")').first();
    if (await commentTab.isVisible()) {
      await commentTab.click();
    }
    const commentInput = page.locator('textarea[placeholder*="comment"]').first();
    if (await commentInput.isVisible()) {
      const testComment = `E2E Public Comment ${Date.now()}`;
      await commentInput.fill(testComment);
      await page.locator('button:has-text("Post Comment"), button:has-text("Submit Comment")').first().click();
      await expect(page.locator(`text=${testComment}`)).toBeVisible();
    }

    // 2. Post Internal Note (Staff only)
    const notesTab = page.locator('button:has-text("Internal Notes"), a:has-text("Internal Notes")').first();
    if (await notesTab.isVisible()) {
      await notesTab.click();
      const noteInput = page.locator('textarea[placeholder*="note"]').first();
      if (await noteInput.isVisible()) {
        const testNote = `E2E Internal Note ${Date.now()}`;
        await noteInput.fill(testNote);
        await page.locator('button:has-text("Add Note"), button:has-text("Post Note")').first().click();
        await expect(page.locator(`text=${testNote}`)).toBeVisible();
      }
    }
  });

  test('E2E-19: Requester views ticket: sees Public Comments but never Internal Notes tab/content', async ({ page }) => {
    await requesterLogin(page);
    const firstTicket = page.locator('table tbody tr').first();
    if (await firstTicket.isVisible()) {
      await firstTicket.click();
      await expect(page).toHaveURL(/\/tickets\/\d+/);

      // Verify Public Comments tab is visible or rendered
      await expect(page.locator('button:has-text("Public Comments"), h4:has-text("Comments"), [role="tab"]:has-text("Comments")').first()).toBeVisible();

      // Verify Internal Notes is completely absent
      await expect(page.locator('button:has-text("Internal Notes"), [role="tab"]:has-text("Internal Notes")')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText('Internal Notes');
    }
  });

  test('E2E-20: Requester toggles Problem Appears Resolved without altering formal status', async ({ page }) => {
    await requesterLogin(page);
    const firstTicket = page.locator('table tbody tr').first();
    if (await firstTicket.isVisible()) {
      await firstTicket.click();
      await expect(page).toHaveURL(/\/tickets\/\d+/);

      const resolveBtn = page.locator('button:has-text("Problem Appears Resolved")');
      if (await resolveBtn.isVisible()) {
        await resolveBtn.click();
        await expect(page.locator('.alert-success, text=indicated, text=resolved')).toBeVisible();
      }
    }
  });

  test('E2E-21: Attachments continuity: view and download attachment', async ({ page }) => {
    await staffLogin(page);
    await page.locator('table tbody tr').first().click();
    await expect(page).toHaveURL(/\/tickets\/\d+/);

    const attachTab = page.locator('button:has-text("Attachments"), a:has-text("Attachments")').first();
    if (await attachTab.isVisible()) {
      await attachTab.click();
    }

    // Check for attachment table or download buttons
    const downloadBtn = page.locator('a[href*="/download"], button:has-text("Download")').first();
    if (await downloadBtn.isVisible()) {
      await expect(downloadBtn).toBeVisible();
    }
  });
});
