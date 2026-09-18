import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext.js';
import {
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  setUserInitialPassword,
  AdminUserItem,
} from '../api.js';

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder,
  hint,
  required,
  size,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  size?: 'sm';
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label htmlFor={id} className={`form-label fw-medium ${size === 'sm' ? 'small' : ''}`}>
        {label} {required && <span className="text-danger">*</span>}
      </label>
      <div className="input-group">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={`form-control ${size === 'sm' ? 'form-control-sm' : ''} border-end-0${error ? ' is-invalid' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          className="btn btn-outline-secondary border-start-0"
          onClick={() => setShow((v) => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <i className={`bi bi-eye${show ? '-slash' : ''}`}></i>
        </button>
      </div>
      {hint && <div className="form-text small text-muted">{hint}</div>}
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

function PasswordRequirementsCard({ password }: { password: string }) {
  const trimmed = password.trim();
  const rules = [
    { label: '8–128 characters', met: trimmed.length >= 8 && trimmed.length <= 128 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(trimmed) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(trimmed) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(trimmed) },
    { label: 'At least one special character (!@#$...)', met: /[^A-Za-z0-9]/.test(trimmed) },
  ];

  if (!password) return null;

  return (
    <div className="card bg-light border-0 p-3 mb-3 small">
      <div className="fw-semibold text-muted mb-2">Password Requirements:</div>
      <div className="row g-1">
        {rules.map((r, i) => (
          <div key={i} className={`col-12 d-flex align-items-center ${r.met ? 'text-success' : 'text-muted'}`}>
            <i className={`bi bi-${r.met ? 'check-circle-fill text-success' : 'circle'} me-2`}></i>
            <span style={{ color: r.met ? '#006B3C' : undefined }}>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function checkPasswordPolicy(pwd: string): string | null {
  const t = pwd.trim();
  if (t.length < 8 || t.length > 128) return 'Password must be 8–128 characters.';
  if (!/[A-Z]/.test(t)) return 'Must include at least one uppercase letter (A-Z).';
  if (!/[a-z]/.test(t)) return 'Must include at least one lowercase letter (a-z).';
  if (!/[0-9]/.test(t)) return 'Must include at least one number (0-9).';
  if (!/[^A-Za-z0-9]/.test(t)) return 'Must include at least one special character (!@#$...).';
  return null;
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();

  // List state
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals & Forms
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);

  // Global success notification
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Create User Form state
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'>('REQUESTER');
  const [createActive, setCreateActive] = useState(true);
  const [createPassword, setCreatePassword] = useState('');
  const [createConfirmPassword, setCreateConfirmPassword] = useState('');
  const [createEmailError, setCreateEmailError] = useState<string | null>(null);
  const [createPasswordError, setCreatePasswordError] = useState<string | null>(null);
  const [createConfirmError, setCreateConfirmError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit User Form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'>('REQUESTER');
  const [editActive, setEditActive] = useState(true);
  const [editEmailError, setEditEmailError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Set Initial Password sub-form state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newInitPassword, setNewInitPassword] = useState('');
  const [confirmInitPassword, setConfirmInitPassword] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetConfirmError, setResetConfirmError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Load users from API
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const data = await fetchAdminUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
      });
      setUsers(data.items || []);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setCreateName('');
    setCreateEmail('');
    setCreateRole('REQUESTER');
    setCreateActive(true);
    setCreatePassword('');
    setCreateConfirmPassword('');
    setCreateEmailError(null);
    setCreatePasswordError(null);
    setCreateConfirmError(null);
    setCreateError(null);
    setIsCreateOpen(true);
  };

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateEmailError(null);
    setCreatePasswordError(null);
    setCreateConfirmError(null);

    // Client-side validations
    if (!createName.trim()) {
      setCreateError('Name is required.');
      return;
    }
    if (!createEmail.trim()) {
      setCreateEmailError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createEmail.trim())) {
      setCreateEmailError('Invalid email format.');
      return;
    }
    if (!createPassword) {
      setCreatePasswordError('Initial password is required.');
      return;
    }
    const policyErr = checkPasswordPolicy(createPassword);
    if (policyErr) {
      setCreatePasswordError(policyErr);
      return;
    }
    if (createPassword !== createConfirmPassword) {
      setCreateConfirmError('Passwords do not match.');
      return;
    }

    setCreateSubmitting(true);
    try {
      await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        isActive: createActive,
        initialPassword: createPassword,
        confirmInitialPassword: createConfirmPassword,
      });
      setIsCreateOpen(false);
      setSuccessMessage(`User "${createName.trim()}" created successfully.`);
      loadUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to create user.';
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already')) {
        setCreateEmailError(msg);
      } else {
        setCreateError(msg);
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.isActive);
    setEditEmailError(null);
    setEditError(null);

    // Reset password sub-form
    setShowPasswordSection(false);
    setNewInitPassword('');
    setConfirmInitPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setEditEmailError(null);

    if (!editName.trim()) {
      setEditError('Name is required.');
      return;
    }
    if (!editEmail.trim()) {
      setEditEmailError('Email is required.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      setEditEmailError('Invalid email format.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload: { name?: string; email?: string; role?: string; isActive?: boolean } = {};
      if (editName.trim() !== editingUser.name) payload.name = editName.trim();
      if (editEmail.trim().toLowerCase() !== editingUser.email.toLowerCase()) payload.email = editEmail.trim();
      if (editRole !== editingUser.role) payload.role = editRole;
      if (editActive !== editingUser.isActive) payload.isActive = editActive;

      if (Object.keys(payload).length === 0) {
        setEditingUser(null);
        return;
      }

      await updateAdminUser(editingUser.id, payload);
      setEditingUser(null);
      setSuccessMessage(`User "${editName.trim()}" updated successfully.`);
      loadUsers();
    } catch (err: any) {
      const msg = err.message || 'Failed to update user.';
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('already')) {
        setEditEmailError(msg);
      } else {
        setEditError(msg);
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  // Submit Set Initial Password
  const handleSetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setResetPasswordError(null);
    setResetConfirmError(null);
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newInitPassword) {
      setResetPasswordError('New initial password is required.');
      return;
    }
    const policyErr = checkPasswordPolicy(newInitPassword);
    if (policyErr) {
      setResetPasswordError(policyErr);
      return;
    }
    if (newInitPassword !== confirmInitPassword) {
      setResetConfirmError('Passwords do not match.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      const res = await setUserInitialPassword(editingUser.id, {
        initialPassword: newInitPassword,
        confirmInitialPassword: confirmInitPassword,
      });
      setPasswordSuccess(res.message || 'Initial password set successfully. User will be required to change password on next login.');
      setNewInitPassword('');
      setConfirmInitPassword('');
      loadUsers();
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to set initial password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const isSelf = currentUser && editingUser && editingUser.id === currentUser.id;

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return <span className="badge bg-primary-subtle text-primary-emphasis border border-primary-subtle">Administrator</span>;
      case 'IT_STAFF':
        return <span className="badge bg-success-subtle text-success-emphasis border border-success-subtle">IT Staff</span>;
      case 'REQUESTER':
      default:
        return <span className="badge bg-secondary">Requester</span>;
    }
  };

  const renderStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="badge bg-success">Active</span>
    ) : (
      <span className="badge bg-secondary">Inactive</span>
    );
  };

  return (
    <div className="container py-4" style={{ maxWidth: '1100px' }}>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
        <div className="d-flex align-items-center">
          <i className="bi bi-people-fill fs-2 me-3" style={{ color: '#006B3C' }}></i>
          <div>
            <h1 className="h4 mb-0 fw-bold" style={{ color: '#1E293B' }}>Administrator User Management</h1>
            <p className="text-muted small mb-0">Manage user accounts, roles, and credential states</p>
          </div>
        </div>
        <button
          className="btn text-white fw-semibold d-inline-flex align-items-center justify-content-center shadow-sm"
          style={{ backgroundColor: '#006B3C' }}
          onClick={handleOpenCreate}
        >
          <i className="bi bi-person-plus-fill me-2"></i>+ Create User
        </button>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show shadow-sm d-flex align-items-center justify-content-between" role="alert">
          <div>
            <i className="bi bi-check-circle-fill me-2"></i>
            {successMessage}
          </div>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setSuccessMessage(null)}></button>
        </div>
      )}

      {/* Toolbar: Search & Role Filter */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-8">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0 ps-0"
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search users"
                />
              </div>
            </div>
            <div className="col-12 col-md-4">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                aria-label="Filter by role"
              >
                <option value="">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* API Failure State with Retry */}
      {fetchError && (
        <div className="alert alert-danger shadow-sm d-flex align-items-center justify-content-between" role="alert">
          <div>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>API Error:</strong> {fetchError}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={loadUsers}>
            <i className="bi bi-arrow-clockwise me-1"></i>Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !fetchError && (
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border" style={{ color: '#006B3C', width: '2.5rem', height: '2.5rem' }} role="status">
            <span className="visually-hidden">Loading users...</span>
          </div>
        </div>
      )}

      {/* Empty / No Results State */}
      {!loading && !fetchError && users.length === 0 && (
        <div className="card shadow-sm border-0 text-center py-5">
          <div className="card-body">
            <i className="bi bi-person-x fs-1 text-muted mb-3 d-block"></i>
            <h5 className="text-muted fw-semibold">No users found</h5>
            <p className="text-muted small mb-0">
              {search || roleFilter
                ? 'No user accounts match your search or filter criteria.'
                : 'There are currently no registered users in TokTickIT.'}
            </p>
          </div>
        </div>
      )}

      {/* User List: Desktop Table & Mobile Cards */}
      {!loading && !fetchError && users.length > 0 && (
        <div className="card shadow-sm border-0 overflow-hidden">
          {/* Desktop Table View */}
          <div className="table-responsive d-none d-md-block">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th scope="col" className="ps-4">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="text-end pe-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="ps-4 fw-semibold text-dark">{u.name}</td>
                    <td className="text-muted">{u.email}</td>
                    <td>{renderRoleBadge(u.role)}</td>
                    <td>{renderStatusBadge(u.isActive)}</td>
                    <td className="text-end pe-4">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleOpenEdit(u)}
                        aria-label={`Edit ${u.name}`}
                      >
                        <i className="bi bi-pencil-square me-1"></i>Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="d-block d-md-none p-3">
            <div className="row g-3">
              {users.map((u) => (
                <div className="col-12" key={u.id}>
                  <div className="card border p-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="fw-bold mb-1">{u.name}</h6>
                        <span className="text-muted small d-block mb-2">{u.email}</span>
                      </div>
                      <div>{renderStatusBadge(u.isActive)}</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div>{renderRoleBadge(u.role)}</div>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleOpenEdit(u)}
                        aria-label={`Edit ${u.name}`}
                      >
                        <i className="bi bi-pencil-square me-1"></i>Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ backgroundColor: '#006B3C', color: '#fff' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>Create New User
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setIsCreateOpen(false)}
                ></button>
              </div>
              <form onSubmit={handleCreateSubmit}>
                <div className="modal-body p-4">
                  {createError && (
                    <div className="alert alert-danger p-2 mb-3 small" role="alert">
                      <i className="bi bi-exclamation-circle-fill me-1"></i>
                      {createError}
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="create-name" className="form-label fw-medium">Full Name <span className="text-danger">*</span></label>
                    <input
                      id="create-name"
                      type="text"
                      className="form-control"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-email" className="form-label fw-medium">Email Address <span className="text-danger">*</span></label>
                    <input
                      id="create-email"
                      type="email"
                      className={`form-control${createEmailError ? ' is-invalid' : ''}`}
                      value={createEmail}
                      onChange={(e) => {
                        setCreateEmail(e.target.value);
                        setCreateEmailError(null);
                      }}
                      placeholder="e.g. john@toktickit.com"
                      required
                    />
                    {createEmailError && <div className="invalid-feedback d-block">{createEmailError}</div>}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="create-role" className="form-label fw-medium">System Role <span className="text-danger">*</span></label>
                    <select
                      id="create-role"
                      className="form-select"
                      value={createRole}
                      onChange={(e) => setCreateRole(e.target.value as any)}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  <div className="form-check mb-3">
                    <input
                      id="create-active"
                      type="checkbox"
                      className="form-check-input"
                      checked={createActive}
                      onChange={(e) => setCreateActive(e.target.checked)}
                    />
                    <label htmlFor="create-active" className="form-check-label fw-medium">
                      Active Account
                    </label>
                    <div className="form-text small text-muted">
                      Inactive accounts are prevented from authenticating to the system.
                    </div>
                  </div>

                  <hr className="my-3" />

                  <PasswordField
                    id="create-password"
                    label="Initial Password"
                    value={createPassword}
                    onChange={(val) => {
                      setCreatePassword(val);
                      setCreatePasswordError(null);
                      if (createConfirmPassword && val === createConfirmPassword) {
                        setCreateConfirmError(null);
                      }
                    }}
                    error={createPasswordError || undefined}
                    placeholder="8-128 chars, uppercase, lowercase, digit, special"
                    required
                  />

                  <PasswordRequirementsCard password={createPassword} />

                  <PasswordField
                    id="create-confirm-password"
                    label="Confirm Initial Password"
                    value={createConfirmPassword}
                    onChange={(val) => {
                      setCreateConfirmPassword(val);
                      if (createPassword && val === createPassword) {
                        setCreateConfirmError(null);
                      }
                    }}
                    error={createConfirmError || undefined}
                    placeholder="Re-enter initial password"
                    hint="User will be required to change this password upon their first login."
                    required
                  />
                </div>

                <div className="modal-footer bg-light">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={createSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white fw-semibold"
                    style={{ backgroundColor: '#006B3C' }}
                    disabled={createSubmitting}
                  >
                    {createSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal show d-block" tabIndex={-1} role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
            <div className="modal-content border-0 shadow">
              <div className="modal-header" style={{ backgroundColor: '#006B3C', color: '#fff' }}>
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>Edit User: {editingUser.name}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  onClick={() => setEditingUser(null)}
                ></button>
              </div>

              <div className="modal-body p-4">
                {editError && (
                  <div className="alert alert-danger p-3 mb-3 small" role="alert">
                    <i className="bi bi-exclamation-circle-fill me-1"></i>
                    {editError}
                  </div>
                )}

                <form onSubmit={handleEditSubmit} id="edit-user-form">
                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="edit-name" className="form-label fw-medium">Full Name <span className="text-danger">*</span></label>
                      <input
                        id="edit-name"
                        type="text"
                        className="form-control"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label htmlFor="edit-email" className="form-label fw-medium">Email Address <span className="text-danger">*</span></label>
                      <input
                        id="edit-email"
                        type="email"
                        className={`form-control${editEmailError ? ' is-invalid' : ''}`}
                        value={editEmail}
                        onChange={(e) => {
                          setEditEmail(e.target.value);
                          setEditEmailError(null);
                        }}
                        required
                      />
                      {editEmailError && <div className="invalid-feedback d-block">{editEmailError}</div>}
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label htmlFor="edit-role" className="form-label fw-medium">System Role <span className="text-danger">*</span></label>
                      <select
                        id="edit-role"
                        className="form-select"
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                      >
                        <option value="REQUESTER">Requester</option>
                        <option value="IT_STAFF">IT Staff</option>
                        <option value="ADMINISTRATOR">Administrator</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6 d-flex flex-column justify-content-center">
                      <div className="form-check">
                        <input
                          id="edit-active"
                          type="checkbox"
                          className="form-check-input"
                          checked={editActive}
                          disabled={!!isSelf}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                        <label htmlFor="edit-active" className="form-check-label fw-medium">
                          Active Account
                        </label>
                      </div>
                      {isSelf && (
                        <div className="form-text text-danger small mt-1">
                          <i className="bi bi-shield-lock me-1"></i>
                          You cannot deactivate your own Administrator account.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex justify-content-end gap-2 mb-4">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingUser(null)}
                      disabled={editSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn text-white fw-semibold"
                      style={{ backgroundColor: '#006B3C' }}
                      disabled={editSubmitting}
                    >
                      {editSubmitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </button>
                  </div>
                </form>

                {/* Set New Initial Password Section (UI-34) */}
                <div className="border rounded p-3 bg-light">
                  <div
                    className="d-flex justify-content-between align-items-center cursor-pointer"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                  >
                    <span className="fw-bold text-dark">
                      <i className="bi bi-key-fill me-2 text-warning"></i>
                      Set New Initial Password
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                    >
                      {showPasswordSection ? 'Hide' : 'Expand'}
                    </button>
                  </div>

                  {showPasswordSection && (
                    <form onSubmit={handleSetPasswordSubmit} className="mt-3 pt-3 border-top">
                      <p className="text-muted small mb-3">
                        Setting a new initial password will revoke all active sessions for this user and require them to change their password on next login.
                      </p>

                      {passwordSuccess && (
                        <div className="alert alert-success p-2 mb-3 small" role="alert">
                          <i className="bi bi-check-circle-fill me-1"></i>
                          {passwordSuccess}
                        </div>
                      )}

                      {passwordError && (
                        <div className="alert alert-danger p-2 mb-3 small" role="alert">
                          <i className="bi bi-exclamation-circle-fill me-1"></i>
                          {passwordError}
                        </div>
                      )}

                      <div className="row g-3 mb-2">
                        <div className="col-12 col-md-6">
                          <PasswordField
                            id="reset-password"
                            label="New Initial Password"
                            value={newInitPassword}
                            onChange={(val) => {
                              setNewInitPassword(val);
                              setResetPasswordError(null);
                              if (confirmInitPassword && val === confirmInitPassword) {
                                setResetConfirmError(null);
                              }
                            }}
                            error={resetPasswordError || undefined}
                            placeholder="Min 8 chars, mixed case & special"
                            size="sm"
                            required
                          />
                        </div>
                        <div className="col-12 col-md-6">
                          <PasswordField
                            id="reset-confirm-password"
                            label="Confirm New Password"
                            value={confirmInitPassword}
                            onChange={(val) => {
                              setConfirmInitPassword(val);
                              if (newInitPassword && val === newInitPassword) {
                                setResetConfirmError(null);
                              }
                            }}
                            error={resetConfirmError || undefined}
                            placeholder="Re-enter password"
                            size="sm"
                            required
                          />
                        </div>
                      </div>

                      <PasswordRequirementsCard password={newInitPassword} />

                      <div className="d-flex justify-content-end">
                        <button
                          type="submit"
                          className="btn btn-sm btn-warning fw-semibold"
                          disabled={passwordSubmitting}
                        >
                          {passwordSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Updating...
                            </>
                          ) : (
                            'Set Initial Password'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
