import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.js';
import { login } from '../authApi.js';

export default function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectedUnauthorized = (location.state as any)?.unauthorized === true;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await login(email.trim(), password);
      const authUser = {
        ...data.user,
        mustChangePassword: data.mustChangePassword ?? data.user.mustChangePassword ?? false,
      };
      setUser(authUser);
      if (authUser.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else {
        const landing = authUser.role === 'IT_STAFF' ? '/staff/queue'
                      : authUser.role === 'ADMINISTRATOR' ? '/admin/users'
                      : '/';
        navigate(landing, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div style={{ backgroundColor: '#F4F9F5', minHeight: '100vh' }}>
      <div className="container min-vh-100 d-flex align-items-center justify-content-center">
        <div className="card shadow-sm" style={{ width: '400px', maxWidth: '100%', border: '1px solid #E2E8F0' }}>
          <div className="card-body p-5">
          <div className="text-center mb-4">
            <i className="bi bi-clock-history fs-1" style={{ color: '#006B3C' }}></i>
            <h1 className="h4 mt-2 mb-1" style={{ color: '#1E293B' }}>TokTickIT</h1>
            <p className="text-muted small">IT Service Desk Portal</p>
          </div>

          {redirectedUnauthorized && !error && (
            <div className="alert alert-warning py-2 small" role="alert">
              <i className="bi bi-shield-lock-fill me-2"></i>You must sign in to access that page.
            </div>
          )}

          {error && (
            <div className="alert alert-danger py-2 small" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>{error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="email" className="form-label fw-medium">Email address</label>
              <input
                id="email"
                type="email"
                className="form-control"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="form-label fw-medium">Password</label>
              <div className="input-group">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="form-control border-end-0"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-start-0"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  <i className={`bi bi-eye${showPwd ? '-slash' : ''}`}></i>
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-zen-primary w-100"
              style={{ backgroundColor: '#006B3C', borderColor: '#006B3C', color: '#FFFFFF' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
);
}
