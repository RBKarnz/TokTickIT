import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ChangePasswordPage from '../../src/pages/ChangePasswordPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as authApi from '../../src/authApi.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderChangePassword = () => {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <ChangePasswordPage />
      </BrowserRouter>
    </AuthProvider>
  );
};

describe('ChangePassword Component (Lab 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UI-07
  it('UI-07: renders current, new, and confirm password fields and save button', () => {
    renderChangePassword();
    expect(screen.getByLabelText(/current/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save password/i })).toBeInTheDocument();
  });

  // UI-08 & UI-10
  it('UI-08: displays password validation when new password does not meet policy', async () => {
    renderChangePassword();
    fireEvent.change(screen.getByLabelText(/current/i), { target: { value: 'CurrentPass1!' } });
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /save password/i }));

    expect(await screen.findByText(/password must be 8–128 characters/i)).toBeInTheDocument();
  });

  // UI-09
  it('UI-09: blocks submit when confirmation does not match new password', async () => {
    renderChangePassword();
    fireEvent.change(screen.getByLabelText(/current/i), { target: { value: 'CurrentPass1!' } });
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'ValidPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'MismatchPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /save password/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  // UI-11
  it('UI-11: successful password change displays feedback and redirects', async () => {
    vi.spyOn(authApi, 'changePassword').mockResolvedValueOnce(undefined);
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue({
      id: 1,
      name: 'Test User',
      email: 'user@toktickit.com',
      role: 'REQUESTER',
      mustChangePassword: false,
    });

    renderChangePassword();
    fireEvent.change(screen.getByLabelText(/current/i), { target: { value: 'Password123!' } });
    fireEvent.change(screen.getByLabelText(/^new password$/i), { target: { value: 'BrandNewPass123!' } });
    fireEvent.change(screen.getByLabelText(/confirm new password/i), { target: { value: 'BrandNewPass123!' } });
    fireEvent.click(screen.getByRole('button', { name: /save password/i }));

    expect(await screen.findByText(/password changed\. redirecting\.\.\./i)).toBeInTheDocument();

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
      },
      { timeout: 2500 }
    );
  });
});
