import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateTicketPage from '../../src/pages/CreateTicketPage.js';
import { RequesterProvider } from '../../src/RequesterContext.js';

vi.mock('../../src/api.js', () => ({
  fetchCategories: vi.fn(() => Promise.resolve([])),
  fetchSystems: vi.fn(() => Promise.resolve([]))
}));

describe('CreateTicket UI', () => {
  it('renders the form fields correctly', async () => {
    render(
      <MemoryRouter>
        <RequesterProvider>
          <CreateTicketPage />
        </RequesterProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByPlaceholderText(/Detailed explanation/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Submit Ticket/i })).toBeInTheDocument();
  });
});