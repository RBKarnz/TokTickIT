import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UserManagementPage from '../../src/pages/UserManagementPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as api from '../../src/api.js';
import * as authApi from '../../src/authApi.js';

const mockCurrentAdmin = {
  id: 1,
  name: 'Super Admin',
  email: 'admin@toktickit.com',
  role: 'ADMINISTRATOR' as const,
  mustChangePassword: false,
};

const mockUsers: api.AdminUserItem[] = [
  {
    id: 1,
    name: 'Super Admin',
    email: 'admin@toktickit.com',
    role: 'ADMINISTRATOR',
    isActive: true,
  },
  {
    id: 2,
    name: 'Alice Staff',
    email: 'alice@toktickit.com',
    role: 'IT_STAFF',
    isActive: true,
  },
  {
    id: 3,
    name: 'Charlie Requester',
    email: 'charlie@toktickit.com',
    role: 'REQUESTER',
    isActive: false,
  },
];

function renderUserManagement() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <UserManagementPage />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Administrator User Management UI (Lab 3 UI-27 to UI-34)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockCurrentAdmin);
    vi.spyOn(api, 'fetchAdminUsers').mockResolvedValue({ items: [...mockUsers] });
  });

  // UI-27: User Management - renders Name/Email/Role/Status/Edit
  it('UI-27: renders Name, Email, Role, Status columns and Edit actions', async () => {
    renderUserManagement();

    const adminNames = await screen.findAllByText('Super Admin');
    expect(adminNames.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Alice Staff').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Charlie Requester').length).toBeGreaterThanOrEqual(1);

    // Headers
    expect(screen.getByRole('columnheader', { name: /name/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /role/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();

    // Badges
    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IT Staff').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Requester').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0);

    // Edit buttons
    expect(screen.getAllByRole('button', { name: /edit super admin/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /edit alice staff/i }).length).toBeGreaterThan(0);
  });

  // UI-28: User Management - search and optional role filter
  it('UI-28: supports searching by text and filtering by role', async () => {
    renderUserManagement();
    await screen.findAllByText('Super Admin');

    const searchInput = screen.getByLabelText('Search users');
    fireEvent.change(searchInput, { target: { value: 'alice' } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alice' })
      );
    });

    const roleSelect = screen.getByLabelText('Filter by role');
    fireEvent.change(roleSelect, { target: { value: 'IT_STAFF' } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alice', role: 'IT_STAFF' })
      );
    });
  });

  // UI-29: User Management - create form
  it('UI-29: provides create user modal with valid submission', async () => {
    const createSpy = vi.spyOn(api, 'createAdminUser').mockResolvedValue({
      user: {
        id: 4,
        name: 'Diana Prince',
        email: 'diana@toktickit.com',
        role: 'IT_STAFF',
        isActive: true,
      },
    });

    renderUserManagement();
    await screen.findAllByText('Super Admin');

    const createBtn = screen.getByRole('button', { name: /\+ create user/i });
    fireEvent.click(createBtn);

    expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Diana Prince' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'diana@toktickit.com' } });
    fireEvent.change(screen.getByLabelText(/system role/i), { target: { value: 'IT_STAFF' } });
    fireEvent.change(screen.getByLabelText(/^initial password/i), { target: { value: 'InitialPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm initial password/i), { target: { value: 'InitialPass123!' } });

    const submitBtn = screen.getByRole('button', { name: /^create user$/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: 'Diana Prince',
        email: 'diana@toktickit.com',
        role: 'IT_STAFF',
        isActive: true,
        initialPassword: 'InitialPass123!',
        confirmInitialPassword: 'InitialPass123!',
      });
    });

    expect(await screen.findByText(/user "diana prince" created successfully/i)).toBeInTheDocument();
  });

  // UI-30: User Management - edit form
  it('UI-30: allows editing user basic attributes', async () => {
    const updateSpy = vi.spyOn(api, 'updateAdminUser').mockResolvedValue({
      user: {
        id: 2,
        name: 'Alice Updated',
        email: 'alice.new@toktickit.com',
        role: 'ADMINISTRATOR',
        isActive: true,
      },
    });

    renderUserManagement();
    await screen.findAllByText('Alice Staff');

    const editBtn = screen.getAllByRole('button', { name: /edit alice staff/i })[0];
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /edit user: alice staff/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(nameInput, { target: { value: 'Alice Updated' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ name: 'Alice Updated' })
      );
    });

    expect(await screen.findByText(/user "alice updated" updated successfully/i)).toBeInTheDocument();
  });

  // UI-31: User Management - duplicate-email validation
  it('UI-31: displays duplicate email conflict error from server', async () => {
    vi.spyOn(api, 'createAdminUser').mockRejectedValue(new Error('Email already in use.'));

    renderUserManagement();
    await screen.findAllByText('Super Admin');

    fireEvent.click(screen.getByRole('button', { name: /\+ create user/i }));

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Duplicate User' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'admin@toktickit.com' } });
    fireEvent.change(screen.getByLabelText(/^initial password/i), { target: { value: 'InitialPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm initial password/i), { target: { value: 'InitialPass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /^create user$/i }));

    expect(await screen.findByText('Email already in use.')).toBeInTheDocument();
  });

  // UI-32: User Management - self-deactivation is visibly unavailable/rejected
  it('UI-32: visibly disables self-deactivation with warning message', async () => {
    renderUserManagement();
    await screen.findAllByText('Super Admin');

    // Super Admin has id: 1 which matches mockCurrentAdmin.id
    const editSelfBtn = screen.getAllByRole('button', { name: /edit super admin/i })[0];
    fireEvent.click(editSelfBtn);

    const activeCheckbox = screen.getByLabelText(/active account/i);
    expect(activeCheckbox).toBeDisabled();
    expect(screen.getByText(/you cannot deactivate your own administrator account/i)).toBeInTheDocument();
  });

  // UI-33: User Management - last-active-Admin safety feedback
  it('UI-33: displays safety feedback when last active Admin cannot be deactivated or demoted', async () => {
    vi.spyOn(api, 'updateAdminUser').mockRejectedValue(
      new Error('Cannot deactivate or change the role of the last active Administrator in the system.')
    );

    renderUserManagement();
    await screen.findAllByText('Alice Staff');

    const editBtn = screen.getAllByRole('button', { name: /edit alice staff/i })[0];
    fireEvent.click(editBtn);

    const roleSelect = screen.getByLabelText(/system role/i);
    fireEvent.change(roleSelect, { target: { value: 'REQUESTER' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(
      await screen.findByText(/cannot deactivate or change the role of the last active administrator in the system/i)
    ).toBeInTheDocument();
  });

  // UI-34: User Management - new-initial-password flow feedback
  it('UI-34: allows setting new initial password and displays confirmation feedback', async () => {
    const setPasswordSpy = vi.spyOn(api, 'setUserInitialPassword').mockResolvedValue({
      message: 'Initial password set successfully. User will be required to change password on next login.',
      user: {
        id: 2,
        name: 'Alice Staff',
        email: 'alice@toktickit.com',
        role: 'IT_STAFF',
        isActive: true,
        mustChangePassword: true,
      },
    });

    renderUserManagement();
    await screen.findAllByText('Alice Staff');

    const editBtn = screen.getAllByRole('button', { name: /edit alice staff/i })[0];
    fireEvent.click(editBtn);

    // Expand password sub-section
    const expandBtn = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandBtn);

    expect(screen.getByLabelText(/new initial password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/new initial password/i), { target: { value: 'BrandNewPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'BrandNewPass123!' } });

    fireEvent.click(screen.getByRole('button', { name: /set initial password/i }));

    await waitFor(() => {
      expect(setPasswordSpy).toHaveBeenCalledWith(2, {
        initialPassword: 'BrandNewPass123!',
        confirmInitialPassword: 'BrandNewPass123!',
      });
    });

    expect(
      await screen.findByText(/initial password set successfully\. user will be required to change password on next login\./i)
    ).toBeInTheDocument();
  });

  // API Failure state and Retry
  it('displays API failure error and allows retrying fetch', async () => {
    vi.spyOn(api, 'fetchAdminUsers').mockRejectedValueOnce(new Error('Network error: 500'));

    renderUserManagement();

    expect(await screen.findByText(/network error: 500/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });

    vi.spyOn(api, 'fetchAdminUsers').mockResolvedValueOnce({ items: [...mockUsers] });
    fireEvent.click(retryBtn);

    const adminNames = await screen.findAllByText('Super Admin');
    expect(adminNames.length).toBeGreaterThanOrEqual(1);
  });
});
