import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TicketDetailPage from '../../src/pages/TicketDetailPage.js';
import { RequesterProvider } from '../../src/RequesterContext.js';

vi.mock('../../src/api.js', () => ({
  fetchTicketDetail: vi.fn(() => Promise.resolve({
    id: 1,
    ticketNumber: 'TKT-2023-000001',
    status: 'NEW',
    priority: 'MEDIUM',
    summary: 'Test Detail Ticket',
    description: 'Test description',
    createdAt: new Date().toISOString(),
    attachments: []
  }))
}));

describe('RequesterTicketDetail UI', () => {
  it('renders the ticket details view spinner and loads', () => {
    const { container } = render(
      <MemoryRouter>
        <RequesterProvider>
          <TicketDetailPage />
        </RequesterProvider>
      </MemoryRouter>
    );
    expect(container.querySelector('.spinner-border')).toBeInTheDocument();
  });
});
