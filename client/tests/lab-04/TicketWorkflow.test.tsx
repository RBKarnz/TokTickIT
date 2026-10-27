import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TicketDetailPage from '../../src/pages/TicketDetailPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as api from '../../src/api.js';
import * as authApi from '../../src/authApi.js';

const staffUser = { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com', role: 'IT_STAFF' as const, mustChangePassword: false };
const adminUser = { id: 99, name: 'Admin Boss', email: 'admin@toktickit.com', role: 'ADMINISTRATOR' as const, mustChangePassword: false };
const requesterUser = { id: 1, name: 'Jennifer Anderson', email: 'requester1@toktickit.com', role: 'REQUESTER' as const, mustChangePassword: false };

const baseTicket = {
  id: 20,
  ticketNumber: 'TCK-2026-000020',
  summary: 'Email Sync Delay',
  description: 'Emails delayed by 30 minutes in Outlook client.',
  requestedPriority: 'HIGH',
  itPriority: 'MEDIUM',
  currentStatus: 'IN_PROGRESS',
  requesterResolvedAt: null,
  resolutionSummary: null,
  version: 3,
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

const action = (overrides: Partial<api.ActionTaken>): api.ActionTaken => ({
  id: 1,
  ticketId: 20,
  actionAt: '2026-09-17T09:00:00.000Z',
  description: 'Restarted the Exchange services.',
  result: 'Queue cleared.',
  status: 'COMPLETED',
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  performedBy: { id: 10, name: 'Bob Staff' },
  assignedTo: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
  version: 1,
  createdAt: '2026-09-17T09:00:00.000Z',
  updatedAt: '2026-09-17T09:00:00.000Z',
  ...overrides,
});

const history: api.StatusHistoryItem[] = [
  { id: 1, fromStatus: null, toStatus: 'NEW', changedBy: null, reason: 'Backfilled from migration', createdAt: '2026-09-17T08:00:00.000Z' },
  { id: 5, fromStatus: 'NEW', toStatus: 'OPEN', changedBy: { id: 10, name: 'Bob Staff', role: 'IT_STAFF' }, reason: null, createdAt: '2026-09-17T08:10:00.000Z' },
  { id: 7, fromStatus: 'OPEN', toStatus: 'IN_PROGRESS', changedBy: { id: 99, name: 'Admin Boss', role: 'ADMINISTRATOR' }, reason: 'Picked up after triage', createdAt: '2026-09-17T08:30:00.000Z' },
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

async function openResolveModal() {
  fireEvent.change(await screen.findByLabelText(/change status/i), { target: { value: 'RESOLVED' } });
  fireEvent.click(screen.getByRole('button', { name: /update status/i }));
  expect(await screen.findByText(/resolve ticket/i)).toBeInTheDocument();
  return {
    summary: screen.getByPlaceholderText(/describe how the issue was resolved/i) as HTMLTextAreaElement,
    reason: screen.getByLabelText(/reason/i) as HTMLTextAreaElement,
    confirm: screen.getByRole('button', { name: /confirm resolved/i }),
  };
}

const gateItems = async () =>
  (await screen.findAllByTestId('gate-item')).map((li) => ({ text: li.textContent ?? '', met: li.getAttribute('data-met') }));

describe('Ticket Workflow UI (Lab 4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(staffUser);
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({ ...baseTicket });
    vi.spyOn(api, 'fetchTicketDetail').mockResolvedValue({ ...baseTicket });
    vi.spyOn(api, 'fetchStaffUsers').mockResolvedValue({ users: [{ id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' }] });
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValue([]);
    vi.spyOn(api, 'fetchInternalNotes').mockResolvedValue([]);
    vi.spyOn(api, 'fetchAssignees').mockResolvedValue([]);
    vi.spyOn(api, 'fetchActions').mockResolvedValue([action({})]);
    vi.spyOn(api, 'fetchStatusHistory').mockResolvedValue([...history]);
  });

  it('UI-12: the status dropdown offers only the transitions permitted from the current status', async () => {
    const expected: Record<string, string[]> = {
      NEW: ['Open', 'Cancelled'],
      IN_PROGRESS: ['Waiting for Requester', 'Resolved', 'Cancelled'],
      RESOLVED: ['Closed', 'Reopened'],
      CLOSED: ['Reopened'],
    };
    for (const [currentStatus, labels] of Object.entries(expected)) {
      vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({ ...baseTicket, currentStatus });
      const view = renderTicketDetail();
      const select = await screen.findByLabelText(/change status/i);
      const options = within(select).getAllByRole('option').map((o) => o.textContent);
      expect(options, currentStatus).toEqual(['-- Select Status --', ...labels]);
      view.unmount();
    }

    // A Requester has no status control at all.
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(requesterUser);
    renderTicketDetail();
    expect((await screen.findAllByText('TCK-2026-000020'))[0]).toBeInTheDocument();
    expect(screen.queryByLabelText(/change status/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update status/i })).not.toBeInTheDocument();
  });

  it('UI-13: the resolution gate checklist names missing items and keeps Confirm disabled until all are met', async () => {
    vi.spyOn(api, 'fetchActions').mockResolvedValue([
      action({ id: 1, status: 'IN_PROGRESS', result: null }),
      action({ id: 2, status: 'PLANNED', result: null, followUpRequired: true, followUpNote: 'Check again' }),
    ]);
    const statusSpy = vi.spyOn(api, 'updateTicketStatus');
    const view = renderTicketDetail();
    let modal = await openResolveModal();

    expect(await gateItems()).toEqual([
      { text: 'Missing: Resolution Summary provided', met: 'false' },
      { text: 'Missing: At least one completed Action Taken exists', met: 'false' },
      { text: 'Missing: No pending follow-up actions exist', met: 'false' },
    ]);
    expect(modal.confirm).toBeDisabled();

    // A summary alone does not open the gate.
    fireEvent.change(modal.summary, { target: { value: 'Restarted the services.' } });
    expect((await gateItems())[0]).toEqual({ text: 'Met: Resolution Summary provided', met: 'true' });
    expect(modal.confirm).toBeDisabled();
    fireEvent.click(modal.confirm);
    expect(statusSpy).not.toHaveBeenCalled();
    view.unmount();

    // With a completed action and no pending follow-up, only the summary is missing.
    vi.spyOn(api, 'fetchActions').mockResolvedValue([action({}), action({ id: 2, status: 'CANCELLED', followUpRequired: true })]);
    renderTicketDetail();
    modal = await openResolveModal();
    expect((await gateItems()).map((i) => i.met)).toEqual(['false', 'true', 'true']);
    expect(modal.confirm).toBeDisabled();
    fireEvent.change(modal.summary, { target: { value: 'Restarted the services.' } });
    await waitFor(() => expect(modal.confirm).not.toBeDisabled());
  });

  it('UI-14: the status history timeline shows entries in API order with actor, time and reason, read-only, to every role', async () => {
    renderTicketDetail();
    const items = await screen.findAllByTestId('history-item');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Created as New');
    expect(items[0]).toHaveTextContent('System Backfill');
    expect(items[0]).toHaveTextContent('Reason: Backfilled from migration');
    expect(items[1]).toHaveTextContent('New → Open');
    expect(items[1]).toHaveTextContent('Bob Staff (IT Staff)');
    expect(items[1]).not.toHaveTextContent('Reason:');
    expect(items[2]).toHaveTextContent('Open → In Progress');
    expect(items[2]).toHaveTextContent('Admin Boss (Admin)');
    expect(items[2]).toHaveTextContent('Reason: Picked up after triage');
    expect(items[2].querySelector('time')).toHaveAttribute('dateTime', '2026-09-17T08:30:00.000Z');

    // Append-only: no control inside the timeline.
    const timeline = screen.getByRole('list', { name: /status history/i });
    expect(within(timeline).queryByRole('button')).not.toBeInTheDocument();
    expect(within(timeline).queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('UI-28: a Requester sees the same timeline on their own ticket', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(requesterUser);
    renderTicketDetail();
    expect(await screen.findAllByTestId('history-item')).toHaveLength(3);
    expect(api.fetchStatusHistory).toHaveBeenCalledWith(20);
  });

  it('UI-15: an Administrator can claim, set IT Priority and change status like IT Staff', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(adminUser);
    const claimSpy = vi.spyOn(api, 'claimTicket').mockResolvedValue({ owner: { id: 99, name: 'Admin Boss', email: 'admin@toktickit.com' } });
    const prioritySpy = vi.spyOn(api, 'updateTicketItPriority').mockResolvedValue({ ticketId: 20, itPriority: 'CRITICAL' });
    const statusSpy = vi.spyOn(api, 'updateTicketStatus').mockResolvedValue({
      ticketId: 20, currentStatus: 'WAITING_FOR_REQUESTER', resolutionSummary: null, version: 4, history,
    });
    renderTicketDetail();

    fireEvent.click(await screen.findByRole('button', { name: /claim ticket/i }));
    await waitFor(() => expect(claimSpy).toHaveBeenCalledWith(20));
    expect(await screen.findByText(/ticket successfully claimed/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/it priority/i), { target: { value: 'CRITICAL' } });
    await waitFor(() => expect(prioritySpy).toHaveBeenCalledWith(20, 'CRITICAL'));

    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: 'WAITING_FOR_REQUESTER' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    await waitFor(() =>
      expect(statusSpy).toHaveBeenCalledWith(20, 'WAITING_FOR_REQUESTER', undefined, { reason: undefined, expectedVersion: 3 }));
    expect(await screen.findByText(/status successfully updated to waiting for requester/i)).toBeInTheDocument();
    expect(screen.queryByText(/forbidden|permission/i)).not.toBeInTheDocument();
  });

  it('UI-23: a 409 RESOLUTION_GATE from the server lists its reasons and keeps the typed values', async () => {
    vi.spyOn(api, 'updateTicketStatus').mockRejectedValue(
      new api.ApiError(409, 'RESOLUTION_GATE', 'This ticket cannot be resolved yet.', undefined, undefined, [
        'COMPLETED_ACTION_REQUIRED', 'PENDING_FOLLOW_UP',
      ]),
    );
    renderTicketDetail();
    const modal = await openResolveModal();
    fireEvent.change(modal.summary, { target: { value: 'Restarted the services.' } });
    fireEvent.change(modal.reason, { target: { value: 'Work finished' } });
    await waitFor(() => expect(modal.confirm).not.toBeDisabled());
    fireEvent.click(modal.confirm);

    expect(await screen.findByText('At least one completed Action Taken is required.')).toBeInTheDocument();
    expect(screen.getByText('A follow-up action is still pending.')).toBeInTheDocument();
    expect(screen.getByText(/resolve ticket/i)).toBeInTheDocument();
    expect(modal.summary.value).toBe('Restarted the services.');
    expect(modal.reason.value).toBe('Work finished');
  });

  it('UI-24: a 409 STALE_UPDATE shows the reload banner, keeps the typed values and retries with the fresh version', async () => {
    const statusSpy = vi.spyOn(api, 'updateTicketStatus')
      .mockRejectedValueOnce(new api.ApiError(409, 'STALE_UPDATE', 'This ticket was changed by someone else.'))
      .mockResolvedValue({ ticketId: 20, currentStatus: 'RESOLVED', resolutionSummary: 'Restarted the services.', version: 5, history });
    const detailSpy = vi.spyOn(api, 'fetchStaffTicketDetail')
      .mockResolvedValueOnce({ ...baseTicket })
      .mockResolvedValue({ ...baseTicket, version: 4, itPriority: 'CRITICAL' });
    renderTicketDetail();
    const modal = await openResolveModal();
    fireEvent.change(modal.summary, { target: { value: 'Restarted the services.' } });
    fireEvent.change(modal.reason, { target: { value: 'Work finished' } });
    await waitFor(() => expect(modal.confirm).not.toBeDisabled());
    fireEvent.click(modal.confirm);

    expect(await screen.findByText(/this ticket was modified by another staff member while you were editing/i)).toBeInTheDocument();
    expect(modal.summary.value).toBe('Restarted the services.');
    expect(modal.reason.value).toBe('Work finished');

    fireEvent.click(screen.getByRole('button', { name: /reload ticket/i }));
    await waitFor(() => expect(detailSpy).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('button', { name: /reload ticket/i })).not.toBeInTheDocument());
    expect(modal.summary.value).toBe('Restarted the services.');
    expect(modal.reason.value).toBe('Work finished');

    await waitFor(() => expect(modal.confirm).not.toBeDisabled());
    fireEvent.click(modal.confirm);
    await waitFor(() =>
      expect(statusSpy).toHaveBeenLastCalledWith(20, 'RESOLVED', 'Restarted the services.', { reason: 'Work finished', expectedVersion: 4 }));
    expect(statusSpy.mock.calls[0][3]).toEqual({ reason: 'Work finished', expectedVersion: 3 });
  });

  it('UI-25: after a successful change the status, timeline and version refresh without a reload', async () => {
    const newEntry: api.StatusHistoryItem = {
      id: 9, fromStatus: 'IN_PROGRESS', toStatus: 'WAITING_FOR_REQUESTER',
      changedBy: { id: 10, name: 'Bob Staff', role: 'IT_STAFF' }, reason: null, createdAt: '2026-09-17T10:00:00.000Z',
    };
    const statusSpy = vi.spyOn(api, 'updateTicketStatus')
      .mockResolvedValueOnce({ ticketId: 20, currentStatus: 'WAITING_FOR_REQUESTER', resolutionSummary: null, version: 4, history: [...history, newEntry] })
      .mockResolvedValue({ ticketId: 20, currentStatus: 'IN_PROGRESS', resolutionSummary: null, version: 5, history: [...history, newEntry] });
    const detailSpy = vi.spyOn(api, 'fetchStaffTicketDetail');
    renderTicketDetail();

    fireEvent.change(await screen.findByLabelText(/change status/i), { target: { value: 'WAITING_FOR_REQUESTER' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));

    await waitFor(() => expect(screen.getAllByTestId('history-item')).toHaveLength(4));
    expect(screen.getAllByTestId('history-item')[3]).toHaveTextContent('In Progress → Waiting for Requester');
    // The dropdown now offers the transitions of the new status.
    const options = within(screen.getByLabelText(/change status/i)).getAllByRole('option').map((o) => o.textContent);
    expect(options).toEqual(['-- Select Status --', 'In Progress', 'Resolved', 'Cancelled']);
    expect(detailSpy).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText(/change status/i), { target: { value: 'IN_PROGRESS' } });
    fireEvent.click(screen.getByRole('button', { name: /update status/i }));
    await waitFor(() =>
      expect(statusSpy).toHaveBeenLastCalledWith(20, 'IN_PROGRESS', undefined, { reason: undefined, expectedVersion: 4 }));
  });

  it('UI-26: a double click on Confirm sends one request and locks the button while it is in flight', async () => {
    let finish: (value: unknown) => void = () => {};
    const statusSpy = vi.spyOn(api, 'updateTicketStatus').mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    renderTicketDetail();
    const modal = await openResolveModal();
    fireEvent.change(modal.summary, { target: { value: 'Restarted the services.' } });
    await waitFor(() => expect(modal.confirm).not.toBeDisabled());

    fireEvent.click(modal.confirm);
    fireEvent.click(modal.confirm);
    expect(statusSpy).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: /updating/i })).toBeDisabled();

    finish({ ticketId: 20, currentStatus: 'RESOLVED', resolutionSummary: 'Restarted the services.', version: 4, history });
    await waitFor(() => expect(screen.queryByText(/resolve ticket/i)).not.toBeInTheDocument());
    expect(statusSpy).toHaveBeenCalledTimes(1);
  });

  it('UI-27: the timeline has loading, failure-with-Retry and empty states', async () => {
    let fail: (reason: unknown) => void = () => {};
    const historySpy = vi.spyOn(api, 'fetchStatusHistory')
      .mockReturnValueOnce(new Promise((_, reject) => { fail = reject; }))
      .mockResolvedValue([]);
    renderTicketDetail();

    expect(await screen.findByText(/loading status history/i)).toBeInTheDocument();
    fail(new Error('History service unavailable'));
    expect(await screen.findByText('History service unavailable')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/no status changes have been recorded/i)).toBeInTheDocument();
    expect(historySpy).toHaveBeenCalledTimes(2);
  });
});
