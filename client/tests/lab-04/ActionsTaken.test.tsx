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
  currentStatus: 'IN_PROGRESS',
  requesterResolvedAt: null,
  resolutionSummary: null,
  requesterId: 1,
  ownerId: 10,
  owner: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
  createdAt: '2026-09-17T08:00:00.000Z',
  updatedAt: '2026-09-17T08:30:00.000Z',
  requester: { id: 1, name: 'Jennifer Anderson', email: 'requester1@toktickit.com' },
  category: { id: 2, name: 'Email' },
  relatedSystem: { id: 3, name: 'Exchange Server' },
  attachments: [],
};

const mockAssignees: api.AssigneeUser[] = [
  { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com', role: 'IT_STAFF' },
  { id: 11, name: 'Alice Staff', email: 'staff2@toktickit.com', role: 'IT_STAFF' },
  { id: 99, name: 'Admin Boss', email: 'admin@toktickit.com', role: 'ADMINISTRATOR' },
];

const mockActions: api.ActionTaken[] = [
  {
    id: 101,
    ticketId: 20,
    actionAt: '2026-09-18T10:00:00.000Z',
    description: 'First action taken description',
    result: 'Replaced patch cable',
    status: 'COMPLETED',
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: 'See tester.png',
    performedBy: { id: 10, name: 'Bob Staff' },
    assignedTo: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
    version: 1,
    createdAt: '2026-09-18T10:01:00.000Z',
    updatedAt: '2026-09-18T10:05:00.000Z',
  },
  {
    id: 102,
    ticketId: 20,
    actionAt: '2026-09-18T11:00:00.000Z',
    description: 'Second action with follow up',
    result: null,
    status: 'IN_PROGRESS',
    followUpRequired: true,
    followUpNote: 'Order replacement router',
    attachmentNotes: null,
    performedBy: { id: 99, name: 'Admin Boss' },
    assignedTo: { id: 11, name: 'Alice Staff', email: 'staff2@toktickit.com' },
    version: 1,
    createdAt: '2026-09-18T11:01:00.000Z',
    updatedAt: '2026-09-18T11:01:00.000Z',
  },
  {
    id: 103,
    ticketId: 20,
    actionAt: '2026-09-18T12:00:00.000Z',
    description: 'Planned action',
    result: null,
    status: 'PLANNED',
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    performedBy: { id: 10, name: 'Bob Staff' },
    assignedTo: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
    version: 1,
    createdAt: '2026-09-18T12:01:00.000Z',
    updatedAt: '2026-09-18T12:01:00.000Z',
  },
  {
    id: 104,
    ticketId: 20,
    actionAt: '2026-09-18T13:00:00.000Z',
    description: 'Cancelled action',
    result: null,
    status: 'CANCELLED',
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    performedBy: { id: 10, name: 'Bob Staff' },
    assignedTo: { id: 10, name: 'Bob Staff', email: 'staff1@toktickit.com' },
    version: 1,
    createdAt: '2026-09-18T13:01:00.000Z',
    updatedAt: '2026-09-18T13:01:00.000Z',
  },
];

function renderTicketDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/tickets/20']}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('Actions Taken UI (Lab 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockStaffUser);
    vi.spyOn(api, 'fetchStaffTicketDetail').mockResolvedValue({ ...mockBaseTicket });
    vi.spyOn(api, 'fetchTicketDetail').mockResolvedValue({ ...mockBaseTicket });
    vi.spyOn(api, 'fetchStaffUsers').mockResolvedValue({ users: [] });
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValue([]);
    vi.spyOn(api, 'fetchInternalNotes').mockResolvedValue([]);
    vi.spyOn(api, 'fetchActions').mockResolvedValue([...mockActions]);
    vi.spyOn(api, 'fetchAssignees').mockResolvedValue([...mockAssignees]);
  });

  // UI-06 (AC-07)
  it('UI-06: Lists several actions in API order with every field, status badges and — placeholders', async () => {
    renderTicketDetail();
    expect(await screen.findByText('TCK-2026-000020')).toBeInTheDocument();

    const actionsTabBtn = await screen.findByRole('button', { name: /actions taken/i });
    fireEvent.click(actionsTabBtn);

    const rows = await screen.findAllByTestId('action-row');
    expect(rows).toHaveLength(4);

    // Verify ordering
    expect(rows[0]).toHaveTextContent('First action taken description');
    expect(rows[0]).toHaveTextContent('Replaced patch cable');
    expect(rows[0]).toHaveTextContent('Completed');
    expect(rows[0]).toHaveTextContent('See tester.png');

    expect(rows[1]).toHaveTextContent('Second action with follow up');
    expect(rows[1]).toHaveTextContent('—'); // result empty placeholder
    expect(rows[1]).toHaveTextContent('In Progress');
    expect(rows[1]).toHaveTextContent('Yes');
    expect(rows[1]).toHaveTextContent('Order replacement router');

    expect(rows[2]).toHaveTextContent('Planned action');
    expect(rows[2]).toHaveTextContent('Planned');
    expect(rows[2]).toHaveTextContent('No');

    expect(rows[3]).toHaveTextContent('Cancelled action');
    expect(rows[3]).toHaveTextContent('Cancelled');
  });

  // UI-07 (AC-04)
  it('UI-07: Follow-up note appears and is required only when Follow-Up Required is checked; request is not sent without it', async () => {
    const createSpy = vi.spyOn(api, 'createAction').mockResolvedValue(mockActions[0]);
    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ add action taken/i }));

    expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();

    const followUpCheckbox = screen.getByLabelText(/follow-up required/i);
    fireEvent.click(followUpCheckbox);

    const followUpNote = await screen.findByLabelText(/follow-up note/i);
    expect(followUpNote).toBeInTheDocument();

    // Fill description but leave follow-up note empty
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Inspect cable' } });
    fireEvent.click(screen.getByRole('button', { name: /save action/i }));

    expect(createSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(/follow-up note is required when follow-up is required/i)).toBeInTheDocument();

    // Enter follow-up note
    fireEvent.change(followUpNote, { target: { value: 'Order parts' } });
    expect(screen.queryByText(/follow-up note is required when follow-up is required/i)).not.toBeInTheDocument();

    // Uncheck follow-up required
    fireEvent.click(followUpCheckbox);
    expect(screen.queryByLabelText(/follow-up note/i)).not.toBeInTheDocument();
  });

  // UI-08 (AC-06)
  it('UI-08: Edit status dropdown shows only permitted next statuses; no Edit button on COMPLETED/CANCELLED', async () => {
    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    const rows = await screen.findAllByTestId('action-row');

    // row[0] is COMPLETED, row[3] is CANCELLED -> no edit buttons
    expect(rows[0].querySelector('button')).toBeNull();
    expect(rows[3].querySelector('button')).toBeNull();

    // row[2] is PLANNED -> click edit
    const editBtnPlanned = rows[2].querySelector('button')!;
    expect(editBtnPlanned).toHaveTextContent('Edit');
    fireEvent.click(editBtnPlanned);

    const statusSelect = screen.getByLabelText(/^status$/i) as HTMLSelectElement;
    const plannedOptions = Array.from(statusSelect.options).map((o) => o.value);
    expect(plannedOptions).toEqual(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // row[1] is IN_PROGRESS -> click edit
    const freshRows = await screen.findAllByTestId('action-row');
    const editBtnInProgress = freshRows[1].querySelector('button')!;
    fireEvent.click(editBtnInProgress);

    const statusSelect2 = screen.getByLabelText(/^status$/i) as HTMLSelectElement;
    const inProgressOptions = Array.from(statusSelect2.options).map((o) => o.value);
    expect(inProgressOptions).toEqual(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
    expect(inProgressOptions).not.toContain('PLANNED');
  });

  // UI-09 (AC-08)
  it('UI-09: Requester sees all actions, the info alert, and no Add button, Edit button or form', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockRequesterUser);
    renderTicketDetail();
    // The Requester view shows the ticket number in the breadcrumb and the header.
    await screen.findAllByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));

    expect(
      await screen.findByText(/actions recorded by it staff\. private staff correspondence is kept in internal notes\./i),
    ).toBeInTheDocument();

    const rows = await screen.findAllByTestId('action-row');
    expect(rows).toHaveLength(4);

    expect(screen.queryByRole('button', { name: /\+ add action taken/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/description/i)).not.toBeInTheDocument();
  });

  // UI-10 (AC-14, AC-25)
  it('UI-10: 409 STALE_UPDATE shows the warning banner and keeps the typed values', async () => {
    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    const rows = await screen.findAllByTestId('action-row');
    fireEvent.click(rows[1].querySelector('button')!); // Edit IN_PROGRESS action

    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(descInput, { target: { value: 'My custom typed description update' } });

    vi.spyOn(api, 'updateAction').mockRejectedValue(
      new api.ApiError(409, 'STALE_UPDATE', 'This action was changed by someone else. Reload and try again.'),
    );

    fireEvent.click(screen.getByRole('button', { name: /save action/i }));

    expect(
      await screen.findByText(
        /this action was modified by another staff member while you were editing\. please reload to review the latest state\./i,
      ),
    ).toBeInTheDocument();

    // Typed values are preserved
    expect(screen.getByLabelText(/description/i)).toHaveValue('My custom typed description update');

    // Clicking Reload
    const reloadedAction = { ...mockActions[1], version: 2 };
    vi.spyOn(api, 'fetchActions').mockResolvedValue([mockActions[0], reloadedAction, mockActions[2], mockActions[3]]);

    fireEvent.click(screen.getByRole('button', { name: /reload/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(
          /this action was modified by another staff member while you were editing\. please reload to review the latest state\./i,
        ),
      ).not.toBeInTheDocument();
    });

    // Typed value remains after reload
    expect(screen.getByLabelText(/description/i)).toHaveValue('My custom typed description update');

    // Saving again uses the reloaded version and leaves the untouched action date alone
    const updateSpy = vi.spyOn(api, 'updateAction').mockResolvedValue(reloadedAction);
    fireEvent.click(screen.getByRole('button', { name: /save action/i }));
    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const [actionId, input, version] = updateSpy.mock.calls[0];
    expect(actionId).toBe(102);
    expect(version).toBe(2);
    expect(input.description).toBe('My custom typed description update');
    expect(input.actionAt).toBeUndefined();
  });

  // UI-11 (AC-25)
  it('UI-11: Save is disabled with a spinner while the request is in flight', async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    vi.spyOn(api, 'createAction').mockReturnValue(pendingPromise as any);

    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ add action taken/i }));

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Replacing power unit' } });
    const saveBtn = screen.getByRole('button', { name: /save action/i });

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveBtn).toBeDisabled();
      expect(saveBtn.querySelector('.spinner-border')).toBeInTheDocument();
    });

    // Cleanup promise
    resolvePromise!(mockActions[0]);
  });

  // UI-17 (AC-09)
  it('UI-17: Double click on Save calls createAction exactly once', async () => {
    let resolvePromise: (val: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    const createSpy = vi.spyOn(api, 'createAction').mockReturnValue(pendingPromise as any);

    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ add action taken/i }));

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Single submit test' } });
    const saveBtn = screen.getByRole('button', { name: /save action/i });

    // Double click synchronously
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);

    expect(createSpy).toHaveBeenCalledTimes(1);

    resolvePromise!(mockActions[0]);
  });

  // UI-18 (AC-09, AC-25)
  it('UI-18: Create fails, typed values are kept, retry sends the same Idempotency-Key, success adds one action', async () => {
    const createSpy = vi
      .spyOn(api, 'createAction')
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(mockActions[0]);

    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ add action taken/i }));

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Initial typed description' } });
    const saveBtn = screen.getByRole('button', { name: /save action/i });

    // First attempt fails
    fireEvent.click(saveBtn);

    expect(await screen.findByText(/network failure/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toHaveValue('Initial typed description');

    const firstKey = createSpy.mock.calls[0][2];
    expect(firstKey).toBeTruthy();

    // Retry succeeds
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(2);
    });
    const secondKey = createSpy.mock.calls[1][2];
    expect(secondKey).toBe(firstKey);

    expect(await screen.findByText(/action taken recorded successfully/i)).toBeInTheDocument();
  });

  // UI-19 (AC-07)
  it('UI-19: Loading, empty and load-failure-with-Retry states', async () => {
    let resolveActions: (val: api.ActionTaken[]) => void;
    const pendingActions = new Promise<api.ActionTaken[]>((resolve) => {
      resolveActions = resolve;
    });
    const fetchSpy = vi
      .spyOn(api, 'fetchActions')
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockReturnValueOnce(pendingActions);

    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');
    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));

    // 1. Load failure with Retry
    expect(await screen.findByText(/database unavailable/i)).toBeInTheDocument();
    expect(screen.queryByTestId('action-row')).not.toBeInTheDocument();

    // 2. Loading state while the retry is in flight
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(await screen.findByText(/loading actions taken/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // 3. Empty state
    resolveActions!([]);
    expect(
      await screen.findByText(/no actions have been recorded for this ticket yet\./i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/database unavailable/i)).not.toBeInTheDocument();
  });

  // UI-20 (AC-04)
  it('UI-20: Server 422 fieldErrors are shown under the matching fields and values are kept', async () => {
    vi.spyOn(api, 'createAction').mockRejectedValue(
      new api.ApiError(422, 'VALIDATION_ERROR', 'One or more fields are invalid.', {
        description: 'Server: Description cannot exceed 2000 characters.',
        result: 'Server: Result must be provided.',
      }),
    );

    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));
    fireEvent.click(await screen.findByRole('button', { name: /\+ add action taken/i }));

    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: 'Valid client description' } });
    fireEvent.click(screen.getByRole('button', { name: /save action/i }));

    expect(
      await screen.findByText(/server: description cannot exceed 2000 characters\./i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/server: result must be provided\./i)).toBeInTheDocument();

    expect(screen.getByLabelText(/description/i)).toHaveValue('Valid client description');
  });

  // UI-21 (AC-27)
  it('UI-21: Table rows and mobile cards are both rendered with labels (action-row, action-card counts equal the number of actions)', async () => {
    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));

    const rows = await screen.findAllByTestId('action-row');
    const cards = await screen.findAllByTestId('action-card');

    expect(rows).toHaveLength(4);
    expect(cards).toHaveLength(4);

    expect(cards[0]).toHaveTextContent(/description:/i);
    expect(cards[0]).toHaveTextContent(/result:/i);
    expect(cards[0]).toHaveTextContent(/performed by:/i);
    expect(cards[0]).toHaveTextContent(/assigned to:/i);
    expect(cards[0]).toHaveTextContent(/follow-up:/i);
    expect(cards[0]).toHaveTextContent(/attachment notes:/i);
  });

  // UI-22 (AC-01)
  it('UI-22: Administrator can open the create form; Assigned To lists IT Staff and Administrators and defaults to the current user', async () => {
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockAdminUser);

    renderTicketDetail();
    await screen.findByText('TCK-2026-000020');

    fireEvent.click(screen.getByRole('button', { name: /actions taken/i }));

    const addBtn = await screen.findByRole('button', { name: /\+ add action taken/i });
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    const assigneeSelect = screen.getByLabelText(/assigned to/i) as HTMLSelectElement;
    expect(assigneeSelect).toBeInTheDocument();

    const options = Array.from(assigneeSelect.options);
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent('Bob Staff (IT Staff)');
    expect(options[1]).toHaveTextContent('Alice Staff (IT Staff)');
    expect(options[2]).toHaveTextContent('Admin Boss (Admin)');

    // Defaults to current admin user (id: 99)
    expect(assigneeSelect.value).toBe('99');
  });
});
