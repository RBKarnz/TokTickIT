import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { changePassword, fetchCurrentUser, logout, ChangePasswordError } from '../authApi.js';

function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  disabled: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-3">
      <label htmlFor={id} className="form-label fw-medium">{label}</label>
      <div className="input-group">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={`form-control border-end-0${error ? ' is-invalid' : ''}`}
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required
        />
        <button
          type="button"
          className="btn btn-outline-secondary border-start-0"
          onClick={() => setShow(v => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <i className={`bi bi-eye${show ? '-slash' : ''}`}></i>
        </button>
      </div>
      {error && <div className="invalid-feedback d-block">{error}</div>}
    </div>
  );
}

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleLogout() {
    await logout();
    setUser(null);
    navigate('/login', { replace: true });
  }

  const trimmedNewPwd = newPwd.trim();
  const rules = [
    { label: '8–128 characters', met: trimmedNewPwd.length >= 8 && trimmedNewPwd.length <= 128 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(trimmedNewPwd) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(trimmedNewPwd) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(trimmedNewPwd) },
    { label: 'At least one special character (!@#$...)', met: /[^A-Za-z0-9]/.test(trimmedNewPwd) },
  ];

  function validateClient(): boolean {
    const errs: Record<string, string> = {};
    if (!current) errs.currentPassword = 'Current password is required.';
    if (!newPwd) {
      errs.newPassword = 'New password is required.';
    } else {
      const t = newPwd.trim();
      if (t.length < 8 || t.length > 128) errs.newPassword = 'Password must be 8–128 characters.';
      else if (!/[A-Z]/.test(t)) errs.newPassword = 'Must include an uppercase letter.';
      else if (!/[a-z]/.test(t)) errs.newPassword = 'Must include a lowercase letter.';
      else if (!/[0-9]/.test(t)) errs.newPassword = 'Must include a number.';
      else if (!/[^A-Za-z0-9]/.test(t)) errs.newPassword = 'Must include a special character.';
    }
    if (newPwd !== confirm) errs.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    if (!validateClient()) return;

    setIsLoading(true);
    try {
      await changePassword(current, newPwd, confirm);
      setSuccess(true);
      const updated = await fetchCurrentUser();
      setTimeout(() => {
        setUser(updated);
        const landing = updated?.role === 'IT_STAFF' ? '/staff/queue'
                      : updated?.role === 'ADMINISTRATOR' ? '/admin/users'
                      : '/';
        navigate(landing, { replace: true });
      }, 1500);
    } catch (err: any) {
      const e = err as ChangePasswordError;
      const msg = e.message || '';
      if (
        msg.includes('Authentication required') ||
        msg.includes('UNAUTHORIZED') ||
        msg.toLowerCase().includes('session')
      ) {
        setError('Session expired or authentication required. Redirecting to login...');
        setUser(null);
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
        return;
      }
      if (e.fieldErrors) {
        setFieldErrors(e.fieldErrors);
      } else {
        setError(e.message || 'Failed to change password.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: '#F4F9F5', minHeight: '100vh' }}>
      <nav className="navbar navbar-expand-lg" style={{ backgroundColor: '#006B3C' }}>
        <div className="container d-flex justify-content-between align-items-center">
          <span className="navbar-brand text-white fw-bold d-flex align-items-center mb-0">
            <i className="bi bi-clock-history me-2"></i>TokTickIT
          </span>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-warning text-dark d-none d-sm-inline">Password Change Required</span>
            <span className="text-white small text-truncate d-none d-md-inline" style={{ maxWidth: '180px' }}>
              <i className="bi bi-person me-1"></i>{user?.name || user?.email}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-light d-flex align-items-center"
              onClick={handleLogout}
            >
              <i className="bi bi-box-arrow-right me-1"></i>Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="container py-5 d-flex align-items-center justify-content-center" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="card shadow-sm" style={{ width: '460px', maxWidth: '100%', border: '1px solid #E2E8F0' }}>
          <div className="card-body p-4 p-md-5">
            <div className="text-center mb-4">
              <i className="bi bi-shield-lock fs-1" style={{ color: '#006B3C' }}></i>
              <h1 className="h4 mt-2 mb-1" style={{ color: '#1E293B' }}>Change Password</h1>
              <p className="text-muted small mb-0">You must set a new password before accessing TokTickIT.</p>
            </div>

            {success && (
              <div className="alert alert-success py-2 small">
                <i className="bi bi-check-circle-fill me-2"></i>Password changed. Redirecting...
              </div>
            )}
            {error && (
              <div className="alert alert-danger py-2 small">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <PasswordField
                id="current"
                label="Current (Temporary) Password"
                value={current}
                onChange={setCurrent}
                error={fieldErrors.currentPassword}
                disabled={isLoading || success}
              />
              <PasswordField
                id="newPwd"
                label="New Password"
                value={newPwd}
                onChange={setNewPwd}
                error={fieldErrors.newPassword}
                disabled={isLoading || success}
              />

              {newPwd.length > 0 && (
                <div className="card bg-light border-0 p-3 mb-3 small">
                  <div className="fw-semibold text-muted mb-2">Password Requirements:</div>
                  <div className="row g-1">
                    {rules.map((r, i) => (
                      <div key={i} className={`col-12 d-flex align-items-center ${r.met ? 'text-success' : 'text-muted'}`}>
                        <i className={`bi bi-${r.met ? 'check-circle-fill' : 'circle'} me-2`}></i>
                        <span>{r.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <PasswordField
                id="confirm"
                label="Confirm New Password"
                value={confirm}
                onChange={setConfirm}
                error={fieldErrors.confirmPassword}
                disabled={isLoading || success}
              />
              <button
                type="submit"
                className="btn btn-zen-primary w-100 mt-2"
                style={{ backgroundColor: '#006B3C', borderColor: '#006B3C', color: '#FFFFFF' }}
                disabled={isLoading || success}
              >
                {isLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Saving...
                  </>
                ) : 'Save Password'}
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="btn btn-link text-muted text-decoration-none small"
                  onClick={handleLogout}
                  disabled={isLoading || success}
                >
                  <i className="bi bi-box-arrow-left me-1"></i>Sign out and return to login
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
