const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR';
  mustChangePassword: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  mustChangePassword: boolean;
}

export interface ChangePasswordError {
  message: string;
  fieldErrors?: Record<string, string>;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const msg = err?.error?.fieldErrors
      ? Object.values(err.error.fieldErrors).join(' ')
      : (err?.error?.message || 'Login failed.');
    throw new Error(msg);
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {});
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.user as AuthUser;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    const e: ChangePasswordError = {
      message: err?.error?.message || 'Failed to change password.',
      fieldErrors: err?.error?.fieldErrors,
    };
    throw e;
  }
}
