import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { RequesterProvider, useRequester } from '../../src/RequesterContext.js';

describe('RequesterContext', () => {
  it('provides requester state and updater function', () => {
    const { result } = renderHook(() => useRequester(), { wrapper: RequesterProvider });
    expect(result.current.activeRequester).toBeNull();
    act(() => {
      result.current.setActiveRequester({ id: 1, name: 'Test User', email: 'test@k.th', isActive: true });
    });
    expect(result.current.activeRequester?.name).toBe('Test User');
  });
});