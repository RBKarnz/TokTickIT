import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MyTicketsPage from '../../src/pages/MyTicketsPage.tsx';
import { RequesterProvider } from '../../src/RequesterContext.tsx';

vi.mock('../../src/api.ts', () => ({
  fetchCategories: vi.fn(() => Promise.resolve([])),
  fetchMyTickets: vi.fn(() => Promise.resolve({ data: [], pagination: { total: 0 } }))
}));

describe('MyTickets UI', () => {
  it('renders the search filters and loading state initially', () => {
    render(
      <MemoryRouter>
        <RequesterProvider>
          <MyTicketsPage />
        </RequesterProvider>
      </MemoryRouter>
    );
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading your tickets.../i)).toBeInTheDocument();
  });
});
