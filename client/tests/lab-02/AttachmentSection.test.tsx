import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CreateTicketPage from '../../src/pages/CreateTicketPage.js';

vi.mock('../../src/api.js', () => ({
  fetchCategories: vi.fn(() => Promise.resolve([])),
  fetchSystems: vi.fn(() => Promise.resolve([]))
}));

describe('Attachment Section (in CreateTicketPage)', () => {
  it('renders the attachments upload area', async () => {
    render(
      <MemoryRouter>
        <CreateTicketPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Attachments/i)).toBeInTheDocument());
    expect(screen.getByText(/Add Files/i)).toBeInTheDocument();
  });
});