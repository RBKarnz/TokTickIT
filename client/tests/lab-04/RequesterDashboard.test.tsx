import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import RequesterDashboardPage from '../../src/pages/RequesterDashboardPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as api from '../../src/api.js';
import * as authApi from '../../src/authApi.js';

const requesterUser = { id: 1, name: 'Jennifer Anderson', email: 'requester1@toktickit.com', role: 'REQUESTER' as const, mustChangePassword: false };

const populatedDashboard: api.RequesterDashboard = {
  openTickets: { count: 3, drillDown: '/tickets?statusGroup=open' },
  waitingForMe: { count: 1, drillDown: '/tickets?status=WAITING_FOR_REQUESTER' },
  resolved: { count: 5, drillDown: '/tickets?status=RESOLVED' },
  closed: { count: 12, drillDown: '/tickets?status=CLOSED' },
  recentlyUpdated: [
    { id: 42, ticketNumber: 'TKT-2026-000042', summary: 'Laptop battery drains quickly', status: 'IN_PROGRESS', updatedAt: '2026-09-26T10:15:00.000Z' },
  ],
  recentlyResolved: [
    { id: 38, ticketNumber: 'TKT-2026-000038', summary: 'VPN disconnects randomly', status: 'RESOLVED', updatedAt: '2026-09-25T14:30:00.000Z' },
  ],
  generatedAt: '2026-09-26T11:05:00.000Z',
  timeZone: 'Asia/Bangkok',
};

const emptyDashboard: api.RequesterDashboard = {
  openTickets: { count: 0, drillDown: '/tickets?statusGroup=open' },
  waitingForMe: { count: 0, drillDown: '/tickets?status=WAITING_FOR_REQUESTER' },
  resolved: { count: 0, drillDown: '/tickets?status=RESOLVED' },
  closed: { count: 0, drillDown: '/tickets?status=CLOSED' },
  recentlyUpdated: [],
  recentlyResolved: [],
  generatedAt: '2026-09-26T11:05:00.000Z',
  timeZone: 'Asia/Bangkok',
};

function renderDashboard() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<RequesterDashboardPage />} />
          <Route path="/tickets" element={<div>My Tickets Page</div>} />
          <Route path="/tickets/:id" element={<div>Ticket Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Requester Dashboard (Lab 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(requesterUser);
  });

  it('UI-01: renders the 4 metric cards and accessible drill-down links', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(populatedDashboard);
    renderDashboard();

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('My Open Tickets')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Me')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Resolved')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Closed')).toBeInTheDocument();

    expect(screen.getByText('TKT-2026-000042')).toBeInTheDocument();
    expect(screen.getByText('TKT-2026-000038')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Waiting for Me').closest('button')!);
    expect(await screen.findByText('My Tickets Page')).toBeInTheDocument();
  });

  it('UI-01b: clicking a recent ticket row navigates to its Ticket Detail', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(populatedDashboard);
    renderDashboard();

    fireEvent.click(await screen.findByText('TKT-2026-000042'));
    expect(await screen.findByText('Ticket Detail Page')).toBeInTheDocument();
  });

  it('UI-02: renders zero counts and empty list messaging when there is no data', async () => {
    vi.spyOn(api, 'fetchRequesterDashboard').mockResolvedValue(emptyDashboard);
    renderDashboard();

    const zeros = await screen.findAllByText('0');
    expect(zeros.length).toBe(4);
    expect(screen.getByText(/no recent activity on your tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/no tickets resolved in the last 7 days/i)).toBeInTheDocument();
  });

  it('UI-02b: shows a safe-failure banner with Retry on a load failure, and recovers', async () => {
    const spy = vi.spyOn(api, 'fetchRequesterDashboard')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(populatedDashboard);
    renderDashboard();

    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('My Open Tickets')).toBeInTheDocument();
  });

  it('shows a loading state before the dashboard data arrives', async () => {
    let resolvePromise: (value: api.RequesterDashboard) => void = () => {};
    vi.spyOn(api, 'fetchRequesterDashboard').mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );
    renderDashboard();
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    resolvePromise(emptyDashboard);
    await waitFor(() => expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument());
  });
});
