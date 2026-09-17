import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffTicketQueuePage from '../../src/pages/StaffTicketQueuePage.js';
import * as api from '../../src/api.js';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

const mockCategories: api.Category[] = [
  { id: 1, name: 'Network' },
  { id: 2, name: 'Hardware' },
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
    mockNavigate.mockReset();
    vi.spyOn(api, 'fetchCategories').mockResolvedValue(mockCategories);
    vi.spyOn(api, 'fetchStaffUsers').mockResolvedValue({ users: mockStaffUsers });
  });

  it('UI-12: Desktop queue table renders required columns without redundant Action column', async () => {
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

    // Verify column headers match Zen Green table layout
    expect(screen.getByText('Ticket No.')).toBeInTheDocument();
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Last Updated')).toBeInTheDocument();

    // Verify Action column was removed
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });

  it('UI-13: Renders search, filter controls, sort controls, and date range', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    // Search input
    expect(await screen.findByPlaceholderText('Search summary or ticket no...')).toBeInTheDocument();

    // Filter dropdown selects
    expect(screen.getByRole('combobox', { name: /^category$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^status$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^owner$/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /^sort$/i })).toBeInTheDocument();

    // Date range labels
    expect(screen.getByText(/Updated Between:/i)).toBeInTheDocument();
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

    expect(await screen.findByText(/No tickets in the queue/i)).toBeInTheDocument();

    // Filter by status to trigger active filter empty state
    const statusSelect = screen.getByRole('combobox', { name: /^status$/i });
    fireEvent.change(statusSelect, { target: { value: 'CLOSED' } });

    expect(await screen.findByText(/No matching tickets found/i)).toBeInTheDocument();
    expect(screen.getByText(/No tickets match your active filter criteria/i)).toBeInTheDocument();
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

  it('UI-19: Navigates to ticket details upon clicking table row or mobile card', async () => {
    vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    const ticketNumbers = await screen.findAllByText('TKT-2026-000001');
    expect(ticketNumbers.length).toBeGreaterThanOrEqual(1);

    // Click the ticket number cell or row
    fireEvent.click(ticketNumbers[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/tickets/1');
  });

  it('UI-20: Supports pagination navigation when totalPages > 1', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 40, totalPages: 2 },
    });

    renderQueue();

    const ticketNumbers = await screen.findAllByText('TKT-2026-000001');
    expect(ticketNumbers.length).toBeGreaterThanOrEqual(1);
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(nextBtn);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it('UI-21: Supports fixed 4 options and searching staff in side flyout', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
    });

    renderQueue();

    const ownerButton = await screen.findByRole('combobox', { name: /^owner$/i });
    expect(ownerButton).toBeInTheDocument();

    // Click owner dropdown button
    fireEvent.click(ownerButton);

    // Verify the fixed options are displayed
    expect(screen.getByRole('button', { name: /^all owners$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^assigned$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^unassigned$/i })).toBeInTheDocument();
    const byStaffBtn = screen.getByRole('button', { name: /by staff member/i });
    expect(byStaffBtn).toBeInTheDocument();

    // Click "By Staff Member" to open the side flyout
    fireEvent.click(byStaffBtn);

    // Search input appears in side flyout
    const searchInput = await screen.findByPlaceholderText('Search staff name...');
    expect(searchInput).toBeInTheDocument();

    // Type "Bob"
    fireEvent.change(searchInput, { target: { value: 'Bob' } });

    // Filtered option "Bob Staff" appears
    const bobOption = await screen.findByRole('button', { name: /Bob Staff/i });
    expect(bobOption).toBeInTheDocument();

    // Click Bob Staff to select
    fireEvent.click(bobOption);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 6 }));
    });
  });

  it('UI-22: Renders ellipsis jump input when totalPages > 6 and jumps to entered page', async () => {
    const fetchSpy = vi.spyOn(api, 'fetchStaffQueue').mockResolvedValue({
      items: mockTickets,
      pagination: { page: 1, pageSize: 20, totalItems: 180, totalPages: 9 },
    });

    renderQueue();

    // Find the ellipsis jump input
    const ellipsisInput = await screen.findByPlaceholderText('...');
    expect(ellipsisInput).toBeInTheDocument();

    // Type page 7 and press Enter
    fireEvent.change(ellipsisInput, { target: { value: '7' } });
    fireEvent.keyDown(ellipsisInput, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(expect.objectContaining({ page: 7 }));
    });
  });
});
