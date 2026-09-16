import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../src/pages/LoginPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as authApi from '../../src/authApi.js';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderLogin = () => {
  return render(
    <AuthProvider>
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    </AuthProvider>
  );
};

describe('Login Component (Lab 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // UI-01
  it('UI-01: renders email, password, and sign-in button', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  // UI-02
  it('UI-02: blocks submit with missing required fields', async () => {
    renderLogin();
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    fireEvent.click(submitBtn);
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.click(submitBtn);
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  // UI-03 & UI-04
  it('UI-04: displays generic failure on invalid credentials', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValueOnce(new Error('Invalid email or password.'));

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'WrongPass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });

  // UI-05
  it('UI-05: first-login user response routes to /change-password', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      user: { id: 1, name: 'First User', email: 'first@toktickit.com', role: 'REQUESTER', mustChangePassword: true },
      mustChangePassword: true,
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'first@toktickit.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/change-password', { replace: true });
    });
  });

  // UI-06
  it('UI-06: standard user response routes to role landing page', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValueOnce({
      user: { id: 1, name: 'Normal User', email: 'user@toktickit.com', role: 'REQUESTER', mustChangePassword: false },
      mustChangePassword: false,
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@toktickit.com' } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: 'Password123!' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });
  });
});
