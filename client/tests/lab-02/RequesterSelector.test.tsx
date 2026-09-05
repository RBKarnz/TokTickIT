import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequesterSelectionPage from '../../src/pages/RequesterSelectionPage.js';
import { RequesterProvider } from '../../src/RequesterContext.js';

vi.mock('../../src/api.js', () => ({
  fetchRequesters: vi.fn(() => Promise.resolve([
    { id: 1, name: 'Alice', email: 'alice@k.th', isActive: true }
  ]))
}));

describe('RequesterSelector UI', () => {
  it('renders the requester selection modal/page', async () => {
    render(
      <MemoryRouter>
        <RequesterProvider>
          <RequesterSelectionPage />
        </RequesterProvider>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText(/Select Development Requester/i)).toBeInTheDocument());
  });
});