import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StaffDashboardPage from '../../src/pages/StaffDashboardPage.js';
import App from '../../src/App.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as api from '../../src/api.js';
import * as authApi from '../../src/authApi.js';

const staffUser = { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com', role: 'IT_STAFF' as const, mustChangePassword: false };
const adminUser = { id: 99, name: 'Admin Boss', email: 'admin@toktickit.com', role: 'ADMINISTRATOR' as const, mustChangePassword: false };

const baseStaffDashboard: api.StaffDashboard = {
  unassigned: { count: 14, drillDown: '/staff/queue?ownership=unassigned&statusGroup=open' },
  myOwnedOpen: { count: 16, drillDown: '/staff/queue?ownerId=me&statusGroup=open' },
  myOpenActions: { count: 5, drillDown: '/staff/queue?actionAssignee=me' },
  pendingFollowUps: { count: 2, drillDown: '/staff/queue?followUp=pending' },
  byStatus: { NEW: 14, OPEN: 23, IN_PROGRESS: 18, WAITING_FOR_REQUESTER: 7, RESOLVED: 10, CLOSED: 45, REOPENED: 2, CANCELLED: 4 },
  byItPriority: { LOW: 12, MEDIUM: 28, HIGH: 15, CRITICAL: 7 },
  urgent: [
    { id: 50, ticketNumber: 'TKT-2026-000050', summary: 'Core switch power supply failure', status: 'OPEN', itPriority: 'CRITICAL', updatedAt: '2026-09-26T09:00:00.000Z' },
  ],
  recentlyUpdated: [
    { id: 42, ticketNumber: 'TKT-2026-000042', summary: 'Laptop battery drains quickly', status: 'IN_PROGRESS', itPriority: 'MEDIUM', updatedAt: '2026-09-26T10:15:00.000Z' },
  ],
  generatedAt: '2026-09-26T11:05:00.000Z',
  timeZone: 'Asia/Bangkok',
};

const adminDashboard: api.StaffDashboard = {
  ...baseStaffDashboard,
  users: {
    REQUESTER: { active: 25, inactive: 2, drillDown: '/admin/users?role=REQUESTER' },
    IT_STAFF: { active: 8, inactive: 1, drillDown: '/admin/users?role=IT_STAFF' },
    ADMINISTRATOR: { active: 2, inactive: 0, drillDown: '/admin/users?role=ADMINISTRATOR' },
  },
};

function renderDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<StaffDashboardPage />} />
          <Route path="/staff/queue" element={<div>Staff Queue Page</div>} />
          <Route path="/admin/users" element={<div>User Management Page</div>} />
          <Route path="/tickets/:id" element={<div>Ticket Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Staff & Administrator Dashboard (Lab 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('UI-03: renders the operational cards, breakdown pills and urgent list for IT Staff', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(staffUser);
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(baseStaffDashboard);
    renderDashboard();

    const unassignedCard = (await screen.findByText('Unassigned')).closest('.card') as HTMLElement;
    expect(within(unassignedCard).getByText('14')).toBeInTheDocument();
    const myTicketsCard = screen.getByText('My Tickets').closest('.card') as HTMLElement;
    expect(within(myTicketsCard).getByText('16')).toBeInTheDocument();
    const myActionsCard = screen.getByText('My Open Actions').closest('.card') as HTMLElement;
    expect(within(myActionsCard).getByText('5')).toBeInTheDocument();
    const followUpsCard = screen.getByText('Pending Follow-ups').closest('.card') as HTMLElement;
    expect(within(followUpsCard).getByText('2')).toBeInTheDocument();

    expect(screen.getByText('TKT-2026-000050')).toBeInTheDocument();
    expect(screen.queryByText('User Account Breakdown')).not.toBeInTheDocument();
  });

  it('UI-05: clicking a metric card navigates to the Staff Queue with the drill-down filter', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(staffUser);
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(baseStaffDashboard);
    renderDashboard();

    fireEvent.click((await screen.findByText('Unassigned')).closest('button')!);
    expect(await screen.findByText('Staff Queue Page')).toBeInTheDocument();
  });

  it('UI-05b: clicking a status breakdown pill navigates to the Staff Queue filtered by that status', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(staffUser);
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(baseStaffDashboard);
    renderDashboard();

    const resolvedPill = (await screen.findAllByText('RESOLVED'))[0].closest('button')!;
    fireEvent.click(resolvedPill);
    expect(await screen.findByText('Staff Queue Page')).toBeInTheDocument();
  });

  it('UI-04: renders the Administrator user account breakdown with active/inactive counts', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(adminUser);
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(adminDashboard);
    renderDashboard();

    expect(await screen.findByText('User Account Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Requesters')).toBeInTheDocument();
    expect(screen.getByText('25 active')).toBeInTheDocument();
    expect(screen.getByText('2 inactive')).toBeInTheDocument();
    expect(screen.getByText('IT Staff')).toBeInTheDocument();
    expect(screen.getByText('8 active')).toBeInTheDocument();
    expect(screen.getByText('Administrators')).toBeInTheDocument();
  });

  it('UI-04b: clicking a user role bucket navigates to User Management filtered by that role', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(adminUser);
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(adminDashboard);
    renderDashboard();

    fireEvent.click(await screen.findByText('Requesters'));
    expect(await screen.findByText('User Management Page')).toBeInTheDocument();
  });

  it('UI-16: the header navigation marks Dashboard as the active page with aria-current and a visible underline', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(staffUser);
    vi.spyOn(api, 'fetchStaffDashboard').mockResolvedValue(baseStaffDashboard);
    window.history.pushState({}, '', '/dashboard');
    render(<App />);

    const dashboardLink = await screen.findByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    expect(dashboardLink).toHaveStyle({ borderBottom: '2px solid #FFFFFF' });

    const queueLink = screen.getByRole('link', { name: /ticket queue/i });
    expect(queueLink).not.toHaveAttribute('aria-current');
  });

  it('shows a safe-failure banner with Retry on a load failure, and recovers', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(staffUser);
    const spy = vi.spyOn(api, 'fetchStaffDashboard')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(baseStaffDashboard);
    renderDashboard();

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Unassigned')).toBeInTheDocument();
  });
});
