import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { changePassword, fetchCurrentUser, ChangePasswordError } from '../authApi.js';

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
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setUser(updated);
      setTimeout(() => {
        const landing = updated?.role === 'IT_STAFF' ? '/staff/queue'
                      : updated?.role === 'ADMINISTRATOR' ? '/admin/users'
                      : '/';
        navigate(landing, { replace: true });
      }, 1500);
    } catch (err: any) {
      const e = err as ChangePasswordError;
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
      <div className="container min-vh-100 d-flex align-items-center justify-content-center">
        <div className="card shadow-sm" style={{ width: '440px', maxWidth: '100%', border: '1px solid #E2E8F0' }}>
          <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-shield-lock fs-1" style={{ color: '#006B3C' }}></i>
            <h1 className="h4 mt-2 mb-1" style={{ color: '#1E293B' }}>Change Password</h1>
            <p className="text-muted small">You must set a new password before continuing.</p>
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
          </form>
        </div>
      </div>
    </div>
  </div>
);
}
