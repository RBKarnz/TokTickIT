import { expect, request as apiRequest } from '@playwright/test';

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000';

// Tests that use firstlogin@toktickit.com change its password. This resets it to the seeded
// initial password with "must change password" set, so each test can run on its own and repeatedly.
export async function resetFirstLoginPassword(): Promise<void> {
  const admin = await apiRequest.newContext({ baseURL: API_URL });
  try {
    const login = await admin.post('/api/auth/login', { data: { email: 'admin@toktickit.com', password: 'Password123!' } });
    expect(login.status(), 'admin login').toBe(200);
    const headers = { 'X-CSRF-Token': (await login.json()).csrfToken };
    const { items } = await (await admin.get('/api/admin/users?search=firstlogin@toktickit.com')).json();
    expect(items, 'firstlogin user').toHaveLength(1);
    const reset = await admin.post(`/api/admin/users/${items[0].id}/set-initial-password`, {
      headers,
      data: { initialPassword: 'Password123!', confirmInitialPassword: 'Password123!' },
    });
    expect(reset.status(), await reset.text()).toBe(200);
  } finally {
    await admin.dispose();
  }
}
