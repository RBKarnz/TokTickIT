import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RequesterSelectionPage from '../../src/pages/RequesterSelectionPage.tsx';
import { RequesterProvider } from '../../src/RequesterContext.tsx';

vi.mock('../../src/api.ts', () => ({
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