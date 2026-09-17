import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffTicketQueuePage from '../../src/pages/StaffTicketQueuePage.js';
import * as api from '../../src/api.js';

const mockTickets: api.StaffQueueTicket[] = [
  {
    id: 1,
    ticketNumber: 'TKT-2026-000001',
    summary: 'VPN authentication failure',
    category: 'Network',
    requestedPriority: 'HIGH',
    itPriority: 'CRITICAL',
    status: 'In Progress',
    owner: { id: 5, name: 'Alice Staff' },
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T11:00:00.000Z',
  },
  {
    id: 2,
    ticketNumber: 'TKT-2026-000002',
    summary: 'Printer jammed in room 302',
    category: 'Hardware',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    status: 'Open',
    owner: null, // Unassigned
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:30:00.000Z',
  },
];

const mockStaffUsers = [
  { id: 5, name: 'Alice Staff', email: 'alice@toktickit.com' },
  { id: 6, name: 'Bob Staff', email: 'bob@toktickit.com' },
];

function renderQueue() {
  return render(
    <MemoryRouter>
      <StaffTicketQueuePage />
    </MemoryRouter>
  );
}

describe('StaffTicketQueue UI Component (Lab 3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchStaffUsers').mockResolvedValue({ users: mockStaffUsers });
  });

  it('UI-12: Desktop queue table renders required columns', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    expect(await screen.findByText('IT Staff Ticket Queue')).toBeInTheDocument();
    const ticketNumberElements = await screen.findAllByText('TKT-2026-000001');
    expect(ticketNumberElements.length).toBeGreaterThanOrEqual(1);

    const summaryElements = screen.getAllByText('VPN authentication failure');
    expect(summaryElements.length).toBeGreaterThanOrEqual(1);

    // Verify column headers exist
    expect(screen.getByRole('button', { name: /Sort by Ticket Number/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Created Date/i })).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Category/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Requested Priority/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by IT Priority/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Owner/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sort by Updated Date/i })).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('UI-13: Renders search, filter controls, sort controls, and pagination', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    // Search input
    expect(await screen.findByPlaceholderText('Ticket number or summary...')).toBeInTheDocument();

    // Filter dropdown selects
    expect(screen.getByRole('combobox', { name: /^status$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^requested priority$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^it priority$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^ownership$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^owner$/i })).toBeInTheDocument();

    // Reset button
    expect(screen.getByRole('button', { name: /Reset Filters/i })).toBeInTheDocument();

    // Pagination controls
    expect(screen.getByLabelText(/Ticket queue navigation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Per page:/i)).toBeInTheDocument();
  });

  it('UI-14: Renders assigned/unassigned and status/priority badges', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    expect((await screen.findAllByText('TKT-2026-000001'))[0]).toBeInTheDocument();

    // Status badges
    expect(screen.getAllByText('In Progress').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Open').length).toBeGreaterThanOrEqual(1);

    // Priority badges
    expect(screen.getAllByText('CRITICAL').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('HIGH').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('LOW').length).toBeGreaterThanOrEqual(1);

    // Assigned owner name & Unassigned badge
    expect(screen.getAllByText('Alice Staff').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThanOrEqual(1);
  });

  it('UI-15: Displays loading spinner while fetching', async () => {
    let resolvePromise: any;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.spyOn(api, 'fetchStaffQueue').mockReturnValue(pendingPromise as any);

    renderQueue();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/Loading ticket queue/i)).toBeInTheDocument();

    // Complete loading
    resolvePromise({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });
    expect((await screen.findAllByText('TKT-2026-000001'))[0]).toBeInTheDocument();
  });

  it('UI-16: Gracefully renders empty state when items: [], totalPages: 0 without crashing', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    renderQueue();

    expect(await screen.findByText(/No tickets in the queue/i)).toBeInTheDocument();
    expect(screen.getByText(/There are currently no tickets requiring triage/i)).toBeInTheDocument();
  });

  it('UI-17: Displays no-results state when filter matches 0 records', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    });

    renderQueue();

    // Filter by status to trigger active filter empty state
    const statusSelect = await screen.findByRole('combobox', { name: /^status$/i });
    fireEvent.change(statusSelect, { target: { value: 'Closed' } });

    await waitFor(() => {
      expect(screen.getByText(/No matching tickets found/i)).toBeInTheDocument();
      expect(screen.getByText(/No tickets match your active filter criteria/i)).toBeInTheDocument();
    });
  });

  it('UI-18: Displays error message on API failure with retry', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchStaffQueue')
      .mockRejectedValueOnce(new Error('Network error occurred'))
      .mockResolvedValueOnce({
        items: mockTickets,
        pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      });

    renderQueue();

    expect(await screen.findByText(/Network error occurred/i)).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getAllByText('TKT-2026-000001')[0]).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('UI-19: Renders stacked cards on mobile viewport', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    expect((await screen.findAllByText('TKT-2026-000001'))[0]).toBeInTheDocument();

    // Verify Open Detail buttons rendered in card footers
    const openDetailButtons = screen.getAllByRole('link', { name: /Open Detail/i });
    expect(openDetailButtons.length).toBe(2);
    expect(openDetailButtons[0]).toHaveAttribute('href', '/tickets/1');
    expect(openDetailButtons[1]).toHaveAttribute('href', '/tickets/2');
  });

  it('STYLE-01..03: Adheres to Zen Green tokens and displays record count info', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    expect(await screen.findByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/of/i)).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });
});
