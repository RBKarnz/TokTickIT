import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../src/App.js';

vi.mock('../../src/api.js', () => ({
  fetchRequesters: vi.fn(() => Promise.resolve([])),
  checkSystem: vi.fn(() => Promise.resolve({ healthy: true }))
}));

describe('Responsive Layout', () => {
  it('contains responsive container classes across the app', () => {
    const { container } = render(<App />);
    const hasContainer = !!container.querySelector('.container') || !!container.querySelector('.container-fluid');
    const hasResponsiveNav = !!container.querySelector('.navbar-expand-lg') || !!container.querySelector('.navbar-toggler');
    expect(hasContainer || hasResponsiveNav).toBeTruthy();
  });
});
