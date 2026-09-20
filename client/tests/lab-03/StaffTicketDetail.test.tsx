import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TicketDetailPage from '../../src/pages/TicketDetailPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as api from '../../src/api.js';
import * as authApi from '../../src/authApi.js';

const mockStaffUser = {
  id: 10,
  name: 'Bob Staff',
  email: 'staff1@toktickit.com',
  role: 'IT_STAFF' as const,
  mustChangePassword: false,
};

const mockAdminUser = {
  id: 99,
  name: 'Admin Boss',
  email: 'admin@toktickit.com',
  role: 'ADMINISTRATOR' as const,
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'requester1@toktickit.com',
  role: 'REQUESTER' as const,
  mustChangePassword: false,
};

const mockBaseTicket = {
  id: 20,
  ticketNumber: 'TCK-2026-000020',
  summary: 'Email Sync Delay',
  description: 'Emails delayed by 30 minutes in Outlook client.',
  requestedPriority: 'HIGH',
  itPriority: 'MEDIUM',
  currentStatus: 'NEW',
  requesterResolvedAt: null,
  resolutionSummary: null,
  requesterId: 1,
  ownerId: null,
  owner: null,
  createdAt: '2026-09-17T08:00:00.000Z',
  updatedAt: '2026-09-17T08:30:00.000Z',
  requester: { id: 1, name: 'Jennifer Anderson', email: 'requester1@toktickit.com' },
  category: { id: 2, name: 'Email' },
  relatedSystem: { id: 3, name: 'Exchange Server' },
  attachments: [],
};

const mockStaffList = {
  users: [
    { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
    { id: 11, name: 'Alice Staff', email: 'staff2@toktickit.com' },
  ],
};

const mockNotes = [
  {
    id: 501,
    ticketId: 20,
    content: 'Checked mail logs, exchange queue looks congested.',
    createdAt: '2026-09-17T09:00:00.000Z',
    author: { id: 10, name: 'Bob Staff', role: 'IT_STAFF' },
  },
];

function renderTicketDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/tickets/20']}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/staff/queue" element={<div>Staff Queue Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('TicketDetailPage - IT Staff Operations (Lab 3 UI-20 to UI-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockStaffUser);
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({ ...mockBaseTicket });
    vi.spyOn(api, 'fetchTicketDetail').mockResolvedValue({ ...mockBaseTicket });
    vi.spyOn(api, 'fetchStaffUsers').mockResolvedValue(mockStaffList);
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValue([]);
    vi.spyOn(api, 'fetchInternalNotes').mockResolvedValue([...mockNotes]);
  });

  // UI-20: Breadcrumb & Role-aware navigation
  it('UI-20: renders My Queue breadcrumb and Back to Queue button for IT Staff', async () => {
    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const queueLink = screen.getByRole('link', { name: /my queue/i });
    expect(queueLink).toBeInTheDocument();
    expect(queueLink).toHaveAttribute('href', '/staff/queue');

    const backButton = screen.getByRole('link', { name: /back to queue/i });
    expect(backButton).toBeInTheDocument();
  });

  // UI-21 / AC-09: Claiming ticket
  it('UI-21 / AC-09: allows IT Staff to claim unassigned ticket', async () => {
    const claimSpy = vi.spyOn(api, 'claimTicket').mockResolvedValue({
      id: 20,
      ownerId: 10,
      owner: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    expect(screen.getByText('Unassigned')).toBeInTheDocument();
    const claimBtn = screen.getByRole('button', { name: /claim ticket/i });
    expect(claimBtn).toBeInTheDocument();

    fireEvent.click(claimBtn);

    await waitFor(() => {
      expect(claimSpy).toHaveBeenCalledWith(20);
    });

    expect(await screen.findByText(/ticket successfully claimed!/i)).toBeInTheDocument();
    expect(screen.getByText('Bob Staff (staff1@toktickit.com)')).toBeInTheDocument();
  });

  // UI-21 / AC-09: Reassigning ticket ownership
  it('UI-21 / AC-09: allows IT Staff to reassign ticket to another staff user', async () => {
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({
      ...mockBaseTicket,
      ownerId: 10,
      owner: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
    });
    const reassignSpy = vi.spyOn(api, 'assignTicketOwner').mockResolvedValue({
      id: 20,
      ownerId: 11,
      owner: { id: 11, name: 'Alice Staff', email: 'staff2@toktickit.com' },
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const reassignSelect = await screen.findByLabelText(/reassign owner/i);
    expect(reassignSelect).toBeInTheDocument();

    // Select Alice Staff (id 11)
    fireEvent.change(reassignSelect, { target: { value: '11' } });

    const reassignBtn = screen.getByRole('button', { name: /reassign/i });
    expect(reassignBtn).not.toBeDisabled();
    fireEvent.click(reassignBtn);

    await waitFor(() => {
      expect(reassignSpy).toHaveBeenCalledWith(20, 11);
    });

    expect(await screen.findByText(/ticket owner updated successfully!/i)).toBeInTheDocument();
  });

  // UI-22 / AC-10: IT Priority update
  it('UI-22 / AC-10: allows IT Staff to independently update IT Priority', async () => {
    const prioritySpy = vi.spyOn(api, 'updateTicketItPriority').mockResolvedValue({
      id: 20,
      itPriority: 'CRITICAL',
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const prioritySelect = await screen.findByLabelText(/it priority/i);
    expect(prioritySelect).toBeInTheDocument();
    expect(prioritySelect).toHaveValue('MEDIUM');

    // Change IT Priority to CRITICAL
    fireEvent.change(prioritySelect, { target: { value: 'CRITICAL' } });

    await waitFor(() => {
      expect(prioritySpy).toHaveBeenCalledWith(20, 'CRITICAL');
    });

    expect(await screen.findByText(/it priority updated to critical/i)).toBeInTheDocument();
  });

  // UI-23 / AC-11: Status transitions from NEW -> OPEN via Change Status dropdown
  it('UI-23 / AC-11: executes direct status transition to OPEN via Change Status dropdown', async () => {
    const statusSpy = vi.spyOn(api, 'updateTicketStatus').mockResolvedValue({
      id: 20,
      currentStatus: 'OPEN',
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const statusSelect = await screen.findByLabelText(/change status/i);
    expect(statusSelect).toBeInTheDocument();

    // Select OPEN
    fireEvent.change(statusSelect, { target: { value: 'OPEN' } });

    const updateBtn = screen.getByRole('button', { name: /update status/i });
    expect(updateBtn).not.toBeDisabled();
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(statusSpy).toHaveBeenCalledWith(20, 'OPEN', undefined);
    });

    expect(await screen.findByText(/status successfully updated to open/i)).toBeInTheDocument();
  });

  // UI-23 / AC-11: Transition to RESOLVED requires confirmation modal with resolution summary
  it('UI-23 / AC-11: requires confirmation modal and mandatory resolution summary to resolve ticket', async () => {
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({
      ...mockBaseTicket,
      currentStatus: 'IN_PROGRESS',
    });

    const statusSpy = vi.spyOn(api, 'updateTicketStatus').mockResolvedValue({
      id: 20,
      currentStatus: 'RESOLVED',
      resolutionSummary: 'Restarted Exchange services and cleared outbound queue.',
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const statusSelect = await screen.findByLabelText(/change status/i);
    expect(statusSelect).toBeInTheDocument();

    // Select RESOLVED
    fireEvent.change(statusSelect, { target: { value: 'RESOLVED' } });

    const updateBtn = screen.getByRole('button', { name: /update status/i });
    fireEvent.click(updateBtn);

    // Modal title & textarea appear
    expect(await screen.findByText(/resolve ticket/i)).toBeInTheDocument();
    const summaryInput = screen.getByPlaceholderText(/describe how the issue was resolved/i);
    expect(summaryInput).toBeInTheDocument();

    // Confirm button is disabled when empty
    const confirmBtn = screen.getByRole('button', { name: /confirm resolved/i });
    expect(confirmBtn).toBeDisabled();

    // Type resolution summary
    fireEvent.change(summaryInput, {
      target: { value: 'Restarted Exchange services and cleared outbound queue.' },
    });
    expect(confirmBtn).not.toBeDisabled();

    // Submit modal
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(statusSpy).toHaveBeenCalledWith(
        20,
        'RESOLVED',
        'Restarted Exchange services and cleared outbound queue.'
      );
    });

    // Modal closes and resolution summary card is shown
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/describe how the issue was resolved/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText('Restarted Exchange services and cleared outbound queue.')).toBeInTheDocument();
  });

  // UI-23: Terminal status shows no transitions
  it('UI-23: shows no transitions when ticket is in CANCELLED terminal state', async () => {
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({
      ...mockBaseTicket,
      currentStatus: 'CANCELLED',
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    expect(
      screen.getByText(/ticket is cancelled \(terminal state\)/i)
    ).toBeInTheDocument();
  });

  // UI-25 / AC-12: Requester resolved indicator displayed to IT Staff
  it('UI-25 / AC-12: displays requester resolved notification banner to IT Staff', async () => {
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({
      ...mockBaseTicket,
      currentStatus: 'IN_PROGRESS',
      requesterResolvedAt: '2026-09-17T10:00:00.000Z',
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    expect(
      screen.getByText(/requester indicated that the problem appears resolved on/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/formal ticket status change requires it staff action/i)
    ).toBeInTheDocument();
  });

  // UI-24 & UI-26 / AC-14: Internal Notes tab for IT Staff
  it('UI-24 & UI-26 / AC-14: renders Internal Notes tab and allows IT Staff to post note', async () => {
    const postNoteSpy = vi.spyOn(api, 'postInternalNote').mockResolvedValue({
      id: 502,
      ticketId: 20,
      content: 'Hardware maintenance completed.',
      createdAt: '2026-09-17T10:30:00.000Z',
      author: { id: 10, name: 'Bob Staff', role: 'IT_STAFF' },
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    // Internal Notes tab is visible
    const notesTab = await screen.findByRole('button', { name: /internal notes/i });
    expect(notesTab).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 note badge

    // Switch to Internal Notes
    fireEvent.click(notesTab);

    // Existing note is visible
    expect(
      await screen.findByText('Checked mail logs, exchange queue looks congested.')
    ).toBeInTheDocument();

    // Check Bootstrap semantic styling
    const noteCard = screen.getByText('Checked mail logs, exchange queue looks congested.').closest('.card');
    expect(noteCard).toHaveClass('bg-warning-subtle');
    expect(noteCard).toHaveClass('border-warning');

    // Post a new internal note
    const noteInput = screen.getByPlaceholderText(/write a private note for it staff and administrators/i);
    fireEvent.change(noteInput, { target: { value: 'Hardware maintenance completed.' } });

    const postBtn = screen.getByRole('button', { name: /post internal note/i });
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(postNoteSpy).toHaveBeenCalledWith(20, 'Hardware maintenance completed.');
    });

    expect(await screen.findByText('Hardware maintenance completed.')).toBeInTheDocument();
  });

  // Role Isolation: Requester CANNOT see Internal Notes tab
  it('AC-14 / Role Isolation: Requester cannot view Internal Notes tab or content', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockRequesterUser);
    vi.spyOn(api, 'fetchTicketDetail').mockResolvedValue({ ...mockBaseTicket });

    renderTicketDetail();
    expect((await screen.findAllByText('TCK-2026-000020'))[0]).toBeInTheDocument();

    // Internal Notes tab should NOT exist in DOM
    expect(screen.queryByRole('button', { name: /internal notes/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/internal communication will appear here/i)).not.toBeInTheDocument();
  });

  // Admin access: Administrator can read/post internal notes but ticket ops are read-only
  it('Administrator can view and post internal notes, while ticket operations are read-only', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockAdminUser);
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({ ...mockBaseTicket });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    // Internal Notes tab is available for Admin
    const notesTab = await screen.findByRole('button', { name: /internal notes/i });
    expect(notesTab).toBeInTheDocument();

    // Claim button and reassign dropdown are NOT rendered for Admin
    expect(screen.queryByRole('button', { name: /claim ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reassign owner/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/it priority/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/change status/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update status/i })).not.toBeInTheDocument();
  });

  // REOPENED status badge styling
  it('displays REOPENED status badge with correct semantic classes and icon', async () => {
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({
      ...mockBaseTicket,
      currentStatus: 'REOPENED',
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const reopenedBadge = screen.getByText('REOPENED', { selector: 'span.badge' });
    expect(reopenedBadge).toHaveClass('badge');
    expect(reopenedBadge).toHaveClass('bg-info-subtle');
    expect(reopenedBadge).toHaveClass('text-info-emphasis');
    expect(reopenedBadge).toHaveClass('border');
    expect(reopenedBadge).toHaveClass('border-info-subtle');
    expect(reopenedBadge.querySelector('.bi-arrow-clockwise')).not.toBeNull();
  });

  // AC-22 / Permission Matrix: IT Staff can view/download attachments, but cannot upload or remove
  it('IT Staff has read-only attachment access (no Add Attachment or Remove button)', async () => {
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({
      ...mockBaseTicket,
      attachments: [
        { id: 101, originalFilename: 'error-log.png', fileSize: 1024, isRemoved: false },
      ],
    });

    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    // Add Attachment should NOT be rendered for IT Staff
    expect(screen.queryByText(/add attachment/i)).not.toBeInTheDocument();

    // File is listed with download button, but no remove button
    expect(screen.getByText('error-log.png')).toBeInTheDocument();
    expect(screen.getByTitle('Download')).toBeInTheDocument();
    expect(screen.queryByTitle('Remove')).not.toBeInTheDocument();
  });
});
