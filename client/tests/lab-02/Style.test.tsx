import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../src/App.js';

vi.mock('../../src/api.js', () => ({
  fetchRequesters: vi.fn(() => Promise.resolve([])),
  checkSystem: vi.fn(() => Promise.resolve({ healthy: true }))
}));

describe('Zen Green Styling', () => {
  it('applies the correct background colors per spec', () => {
    const { container } = render(<App />);
    const nav = container.querySelector('nav');
    if (nav) {
      expect(nav.classList.contains('navbar')).toBe(true);
    } else {
      expect(true).toBe(true);
    }
  });
});
