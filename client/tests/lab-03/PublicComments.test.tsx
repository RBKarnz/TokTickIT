import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TicketDetailPage from '../../src/pages/TicketDetailPage.js';
import { AuthProvider } from '../../src/AuthContext.js';
import * as api from '../../src/api.js';
import * as authApi from '../../src/authApi.js';

const mockUser = {
  id: 1,
  name: 'Jennifer Anderson',
  email: 'requester1@toktickit.com',
  role: 'REQUESTER',
  mustChangePassword: false,
};

const mockTicket = {
  id: 10,
  ticketNumber: 'TCK-2026-000010',
  summary: 'VPN Issue',
  description: 'Cannot connect to campus VPN',
  requestedPriority: 'HIGH',
  itPriority: 'HIGH',
  currentStatus: 'OPEN',
  requesterResolvedAt: null,
  requesterId: 1,
  createdAt: '2026-09-17T00:00:00.000Z',
  updatedAt: '2026-09-17T00:00:00.000Z',
  requester: { id: 1, name: 'Jennifer Anderson', email: 'requester1@toktickit.com' },
  category: { id: 1, name: 'Network' },
  relatedSystem: { id: 1, name: 'VPN' },
  attachments: [],
};

const mockComments = [
  {
    id: 101,
    ticketId: 10,
    content: 'Initial public comment from requester',
    createdAt: '2026-09-17T00:05:00.000Z',
    author: { id: 1, name: 'Jennifer Anderson', role: 'REQUESTER' },
  },
  {
    id: 102,
    ticketId: 10,
    content: '<script>alert("xss")</script> IT staff response',
    createdAt: '2026-09-17T00:10:00.000Z',
    author: { id: 5, name: 'Staff One', role: 'IT_STAFF' },
  },
];

function renderTicketDetail() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/tickets/10']}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('TicketDetailPage - Public Comments & Problem Appears Resolved (Lab 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authApi, 'fetchCurrentUser').mockResolvedValue(mockUser);
    vi.spyOn(api, 'fetchTicketDetail').mockResolvedValue({ ...mockTicket });
    vi.spyOn(api, 'fetchPublicComments').mockResolvedValue([...mockComments]);
  });

  it('renders Public Comments tab and shows comment count', async () => {
    renderTicketDetail();
    expect(await screen.findByText('VPN Issue')).toBeInTheDocument();

    const commentsTab = await screen.findByRole('button', { name: /public comments/i });
    expect(commentsTab).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 comments badge
  });

  it('switches to Public Comments tab and displays comments in plain text (SEC-09)', async () => {
    renderTicketDetail();
    const commentsTab = await screen.findByRole('button', { name: /public comments/i });
    fireEvent.click(commentsTab);

    // Initial comment
    expect(await screen.findByText('Initial public comment from requester')).toBeInTheDocument();

    // Plain text rendering: script tags rendered literally as text, not HTML
    expect(screen.getByText('<script>alert("xss")</script> IT staff response')).toBeInTheDocument();
    expect(document.querySelector('script[src*="xss"]')).toBeNull();

    // Roles displayed
    expect(screen.getByText('IT Staff')).toBeInTheDocument();
  });

  it('allows posting a new public comment (AC-13)', async () => {
    const createdComment = {
      id: 103,
      ticketId: 10,
      content: 'Here is an update on my connection.',
      createdAt: '2026-09-17T00:15:00.000Z',
      author: { id: 1, name: 'Jennifer Anderson', role: 'REQUESTER' },
    };
    vi.spyOn(api, 'postPublicComment').mockResolvedValueOnce(createdComment);

    renderTicketDetail();
    const commentsTab = await screen.findByRole('button', { name: /public comments/i });
    fireEvent.click(commentsTab);

    const textarea = await screen.findByPlaceholderText(/provide additional details/i);
    const postBtn = screen.getByRole('button', { name: /post comment/i });

    // Button disabled when empty
    expect(postBtn).toBeDisabled();

    // Type comment
    fireEvent.change(textarea, { target: { value: 'Here is an update on my connection.' } });
    expect(postBtn).not.toBeDisabled();

    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(api.postPublicComment).toHaveBeenCalledWith(10, 'Here is an update on my connection.');
      expect(screen.getByText('Here is an update on my connection.')).toBeInTheDocument();
    });
  });

  it('Problem Appears Resolved action updates timestamp without changing formal status (AC-12)', async () => {
    vi.spyOn(api, 'markProblemResolved').mockResolvedValueOnce({
      ticketId: 10,
      requesterResolvedAt: '2026-09-17T00:20:00.000Z',
    });

    renderTicketDetail();
    expect(await screen.findByText('VPN Issue')).toBeInTheDocument();

    // Status badge is OPEN
    expect(screen.getByText('OPEN')).toBeInTheDocument();

    const resolveBtn = screen.getByRole('button', { name: /problem appears resolved/i });
    expect(resolveBtn).toBeInTheDocument();

    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(api.markProblemResolved).toHaveBeenCalledWith(10);
      expect(screen.getByText(/problem marked as resolved/i)).toBeInTheDocument();
    });

    // Formal status MUST remain OPEN
    expect(screen.getByText('OPEN')).toBeInTheDocument();
  });

  it('Problem Appears Resolved button is not displayed if ticket is CLOSED or CANCELLED', async () => {
    vi.spyOn(api, 'fetchTicketDetail').mockResolvedValueOnce({
      ...mockTicket,
      currentStatus: 'CLOSED',
    });

    renderTicketDetail();
    expect(await screen.findByText('VPN Issue')).toBeInTheDocument();

    // Should not render Problem Appears Resolved button
    expect(screen.queryByRole('button', { name: /problem appears resolved/i })).not.toBeInTheDocument();
  });
});
