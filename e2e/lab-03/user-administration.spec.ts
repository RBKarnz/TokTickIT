import { test, expect } from '@playwright/test';

async function adminLogin(page: any) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill('admin@toktickit.com');
  await page.locator('input[type="password"]').fill('Password123!');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin\/users/);
}

test.describe('Administrator User Management (E2E-22 to E2E-32)', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('E2E-22: Admin Lists Users table with attributes and actions', async ({ page }) => {
    await adminLogin(page);

    // Verify header and table elements
    await expect(page.locator('h1')).toContainText(/User Management/i);
    await expect(page.locator('table')).toBeVisible();

    // Verify table headers
    await expect(page.locator('th:has-text("Name")')).toBeVisible();
    await expect(page.locator('th:has-text("Email")')).toBeVisible();
    await expect(page.locator('th:has-text("Role")')).toBeVisible();
    await expect(page.locator('th:has-text("Status")')).toBeVisible();
    await expect(page.locator('th:has-text("Actions")')).toBeVisible();

    // Verify key seed accounts are listed
    await expect(page.locator('td:has-text("Admin User")')).toBeVisible();
    await expect(page.locator('td:has-text("admin@toktickit.com")')).toBeVisible();
    await expect(page.locator('td:has-text("Jennifer Anderson")')).toBeVisible();
    await expect(page.locator('td:has-text("Alice Tech")')).toBeVisible();

    // Verify role badges and edit buttons
    await expect(page.locator('.badge:has-text("Administrator")').first()).toBeVisible();
    await expect(page.locator('button:has-text("Edit")').first()).toBeVisible();
  });

  test('E2E-23: Search by Name and Email substring', async ({ page }) => {
    await adminLogin(page);

    const searchInput = page.locator('input[placeholder*="Search"]');

    // 1. Search by Name
    await searchInput.fill('Jennifer');
    await page.waitForTimeout(300);
    await expect(page.locator('td:has-text("Jennifer Anderson")')).toBeVisible();
    await expect(page.locator('td:has-text("Alice Tech")')).not.toBeVisible();

    // 2. Search by Email
    await searchInput.fill('staff1@toktickit.com');
    await page.waitForTimeout(300);
    await expect(page.locator('td:has-text("staff1@toktickit.com")')).toBeVisible();
    await expect(page.locator('td:has-text("Jennifer Anderson")')).not.toBeVisible();

    // 3. Clear search returns all
    await searchInput.fill('');
    await page.waitForTimeout(300);
    await expect(page.locator('td:has-text("Jennifer Anderson")')).toBeVisible();
    await expect(page.locator('td:has-text("Alice Tech")')).toBeVisible();
  });

  test('E2E-24: Role filter dropdown', async ({ page }) => {
    await adminLogin(page);

    const roleSelect = page.locator('select[aria-label="Filter by role"]');

    // Filter by IT_STAFF
    await roleSelect.selectOption('IT_STAFF');
    await page.waitForTimeout(300);
    await expect(page.locator('td:has-text("Alice Tech")')).toBeVisible();
    await expect(page.locator('td:has-text("admin@toktickit.com")')).not.toBeVisible();

    // Filter by ADMINISTRATOR
    await roleSelect.selectOption('ADMINISTRATOR');
    await page.waitForTimeout(300);
    await expect(page.locator('td:has-text("admin@toktickit.com")')).toBeVisible();
    await expect(page.locator('td:has-text("Alice Tech")')).not.toBeVisible();

    // Reset to All Roles
    await roleSelect.selectOption('');
    await page.waitForTimeout(300);
    await expect(page.locator('td:has-text("Alice Tech")')).toBeVisible();
    await expect(page.locator('td:has-text("admin@toktickit.com")')).toBeVisible();
  });

  test('E2E-25: Create User form validation & password policy boundary feedback', async ({ page }) => {
    await adminLogin(page);

    await page.locator('button:has-text("+ Create User")').click();
    await expect(page.locator('.modal-title:has-text("Create New User")')).toBeVisible();

    // 1. Password policy feedback card reacts to weak password
    await page.locator('input#create-password').fill('weak');
    await expect(page.locator('.card:has-text("Password Requirements")')).toBeVisible();

    // 2. Mismatched confirmation password
    await page.locator('input#create-name').fill('Test Boundary');
    await page.locator('input#create-email').fill('boundary@toktickit.com');
    await page.locator('input#create-password').fill('ValidPass123!');
    await page.locator('input#create-confirm-password').fill('MismatchPass456!');
    await page.locator('.modal-footer button:has-text("Create User")').click();

    await expect(page.locator('.invalid-feedback:has-text("Passwords do not match")')).toBeVisible();

    // Cancel modal
    await page.locator('.modal-footer button:has-text("Cancel")').click();
    await expect(page.locator('.modal-title:has-text("Create New User")')).not.toBeVisible();
  });

  test('E2E-26: Create User end-to-end and first-login forced change password flow', async ({ page, browser }) => {
    await adminLogin(page);

    const timestamp = Date.now();
    const newUserEmail = `e2e_user_${timestamp}@toktickit.com`;
    const newUserName = `E2E New User ${timestamp}`;
    const initialPass = 'InitialPass123!';
    const updatedPass = 'PermanentPass123!';

    // 1. Create user via Admin UI
    await page.locator('button:has-text("+ Create User")').click();
    await page.locator('input#create-name').fill(newUserName);
    await page.locator('input#create-email').fill(newUserEmail);
    await page.locator('select#create-role').selectOption('IT_STAFF');
    await page.locator('input#create-password').fill(initialPass);
    await page.locator('input#create-confirm-password').fill(initialPass);
    await page.locator('.modal-footer button:has-text("Create User")').click();

    // Expect success alert and user listed
    await expect(page.locator('.alert-success')).toContainText('created successfully');
    await page.locator('input[placeholder*="Search"]').fill(newUserEmail);
    await expect(page.locator(`td:has-text("${newUserEmail}")`)).toBeVisible();

    // 2. Newly created user logs in using a clean browser context
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();

    await userPage.goto('/login');
    await userPage.locator('input[type="email"]').fill(newUserEmail);
    await userPage.locator('input[type="password"]').fill(initialPass);
    await userPage.locator('button[type="submit"]').click();

    // Must be redirected to /change-password
    await expect(userPage).toHaveURL(/\/change-password/);
    await expect(userPage.locator('h1, h2')).toContainText(/Change Password/i);

    // Complete mandatory change password
    await userPage.locator('input#current').fill(initialPass);
    await userPage.locator('input#newPwd').fill(updatedPass);
    await userPage.locator('input#confirm').fill(updatedPass);
    await userPage.locator('button[type="submit"]').click();

    // Lands on role home shell (/staff/queue for IT_STAFF)
    await expect(userPage).toHaveURL(/\/staff\/queue/);
    await expect(userPage.locator('h1, h2')).toContainText(/Ticket Queue/i);

    await userContext.close();
  });

  test('E2E-27: Duplicate email rejection surfaces inline error', async ({ page }) => {
    await adminLogin(page);

    await page.locator('button:has-text("+ Create User")').click();
    await page.locator('input#create-name').fill('Duplicate Test');
    // Test case-insensitive duplicate check
    await page.locator('input#create-email').fill('ADMIN@toktickit.com');
    await page.locator('input#create-password').fill('ValidPass123!');
    await page.locator('input#create-confirm-password').fill('ValidPass123!');
    await page.locator('.modal-footer button:has-text("Create User")').click();

    // Inline error beneath email field
    await expect(page.locator('.invalid-feedback:has-text("already registered")')).toBeVisible();

    await page.locator('.modal-footer button:has-text("Cancel")').click();
  });

  test('E2E-28: Edit user basic attributes and duplicate email conflict check', async ({ page }) => {
    await adminLogin(page);

    // Search and edit requester4
    await page.locator('input[placeholder*="Search"]').fill('requester4@toktickit.com');
    await page.waitForTimeout(300);
    const editBtn = page.locator('table tbody tr').filter({ hasText: 'requester4@toktickit.com' }).locator('button:has-text("Edit")');
    await editBtn.click();

    // 1. Edit Name
    const updatedName = 'David Lee Updated';
    await page.locator('input#edit-name').fill(updatedName);
    await page.locator('button:has-text("Save Changes")').click();
    await expect(page.locator('.alert-success')).toContainText('updated successfully');
    await expect(page.locator(`td:has-text("${updatedName}")`)).toBeVisible();

    // 2. Duplicate email check in edit mode
    await page.locator('table tbody tr').filter({ hasText: updatedName }).locator('button:has-text("Edit")').click();
    await page.locator('input#edit-email').fill('admin@toktickit.com');
    await page.locator('button:has-text("Save Changes")').click();
    await expect(page.locator('.invalid-feedback:has-text("already in use")')).toBeVisible();

    // Revert name back and close
    await page.locator('input#edit-email').fill('requester4@toktickit.com');
    await page.locator('input#edit-name').fill('David Lee');
    await page.locator('button:has-text("Save Changes")').click();
    await expect(page.locator('.alert-success')).toContainText('updated successfully');
  });

  test('E2E-29 & GAP-08: Setting initial password revokes target user session immediately', async ({ page, browser }) => {
    // 1. User logs in in context A
    const userContext = await browser.newContext();
    const userPage = await userContext.newPage();
    await userPage.goto('/login');
    await userPage.locator('input[type="email"]').fill('requester3@toktickit.com');
    await userPage.locator('input[type="password"]').fill('Password123!');
    await userPage.locator('button[type="submit"]').click();
    await expect(userPage).toHaveURL(/\/tickets|\/$/);

    // 2. Admin resets initial password in context B
    await adminLogin(page);
    await page.locator('input[placeholder*="Search"]').fill('requester3@toktickit.com');
    await page.waitForTimeout(300);
    await page.locator('table tbody tr').filter({ hasText: 'requester3@toktickit.com' }).locator('button:has-text("Edit")').click();

    // Expand password section
    await page.locator('span:has-text("Set New Initial Password")').click();
    const tempPass = 'ResetInitial123!';
    await page.locator('input#reset-password').fill(tempPass);
    await page.locator('input#reset-confirm-password').fill(tempPass);
    await page.locator('button:has-text("Set Initial Password")').click();
    await expect(page.locator('.alert-success:has-text("Initial password set successfully")')).toBeVisible();

    // 3. Target user in context A makes an authenticated navigation/action -> session is revoked
    await userPage.reload();
    await expect(userPage).toHaveURL(/\/login/);

    // 4. Target user logs in with new initial password -> forced change password
    await userPage.locator('input[type="email"]').fill('requester3@toktickit.com');
    await userPage.locator('input[type="password"]').fill(tempPass);
    await userPage.locator('button[type="submit"]').click();
    await expect(userPage).toHaveURL(/\/change-password/);

    // Restore original password for idempotency
    await userPage.locator('input#current').fill(tempPass);
    await userPage.locator('input#newPwd').fill('Password123!');
    await userPage.locator('input#confirm').fill('Password123!');
    await userPage.locator('button[type="submit"]').click();
    await expect(userPage).toHaveURL(/\/tickets|\/$/);

    await userContext.close();
  });

  test('E2E-30: Self-deactivation protection for logged-in Administrator', async ({ page }) => {
    await adminLogin(page);

    // Filter or search for admin
    await page.locator('input[placeholder*="Search"]').fill('admin@toktickit.com');
    await page.waitForTimeout(300);
    await page.locator('table tbody tr').filter({ hasText: 'admin@toktickit.com' }).locator('button:has-text("Edit")').click();

    // Active toggle must be disabled
    const activeCheckbox = page.locator('input#edit-active');
    await expect(activeCheckbox).toBeDisabled();

    // Warning message displayed
    await expect(page.locator('text=You cannot deactivate your own Administrator account')).toBeVisible();

    await page.locator('button:has-text("Cancel")').click();
  });

  test('E2E-31: Last active Administrator protection rejects deactivation & demotion', async ({ page }) => {
    await adminLogin(page);

    await page.locator('input[placeholder*="Search"]').fill('admin@toktickit.com');
    await page.waitForTimeout(300);
    await page.locator('table tbody tr').filter({ hasText: 'admin@toktickit.com' }).locator('button:has-text("Edit")').click();

    // Try to demote role away from ADMINISTRATOR
    await page.locator('select#edit-role').selectOption('IT_STAFF');
    await page.locator('button:has-text("Save Changes")').click();

    // Must surface 409 safety error
    await expect(page.locator('.alert-danger:has-text("last active Administrator")')).toBeVisible();

    await page.locator('button:has-text("Cancel")').click();
  });

  test('E2E-32: Unauthorized route guard redirects Requester and IT Staff away from /admin/users', async ({ page }) => {
    // 1. Requester cannot access /admin/users
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('requester1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/tickets|\/$/);

    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users/);

    // Logout
    await page.locator('button:has-text("Logout")').click();

    // 2. IT Staff cannot access /admin/users
    await page.locator('input[type="email"]').fill('staff1@toktickit.com');
    await page.locator('input[type="password"]').fill('Password123!');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/staff\/queue/);

    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users/);

    // Logout
    await page.locator('button:has-text("Logout")').click();

    // 3. Unauthenticated user cannot access /admin/users
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/);
  });
});
