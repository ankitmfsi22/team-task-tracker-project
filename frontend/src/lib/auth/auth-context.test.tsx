import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTestQueryClient } from '../../test/render';
import { setSessionExpiredHandler } from '../api/client';
import { AuthProvider, useAuth } from './auth-context';
import { getAccessToken, setAccessToken } from './token';

const USER = { id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90', email: 'ada@example.com', name: 'Ada' };
const HINT = 'ttt.session';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function paths(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
  setSessionExpiredHandler(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setSessionExpiredHandler(null);
  setAccessToken(null);
  localStorage.clear();
  sessionStorage.clear();
});

describe('AuthProvider session restore', () => {
  it('restores the session when the hint is set and the refresh cookie is valid', async () => {
    localStorage.setItem(HINT, '1');
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve(jsonResponse(200, { accessToken: 'restored' }));
      }
      if (url === '/api/v1/auth/me') return Promise.resolve(jsonResponse(200, USER));
      return Promise.resolve(jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } }));
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.user).toEqual(USER);
    expect(getAccessToken()).toBe('restored');
    expect(paths()).toContain('/api/v1/auth/refresh');
    expect(paths()).toContain('/api/v1/auth/me');
  });

  it('becomes anonymous without an error when the refresh call returns 401', async () => {
    localStorage.setItem(HINT, '1');
    fetchMock.mockResolvedValue(
      jsonResponse(401, { error: { code: 'UNAUTHENTICATED', message: 'No session' } }),
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem(HINT)).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('becomes anonymous without any fetch call when the hint is not set', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('AuthProvider token storage', () => {
  it('never writes the access token to localStorage or sessionStorage after signIn', async () => {
    const token = 'super-secret-access-token';
    fetchMock.mockResolvedValue(jsonResponse(200, USER));

    const { result } = renderHook(() => useAuth(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });
    await waitFor(() => expect(result.current.status).toBe('anonymous'));

    await act(async () => {
      await result.current.signIn(token);
    });

    expect(result.current.status).toBe('authenticated');
    expect(getAccessToken()).toBe(token);
    for (const storage of [localStorage, sessionStorage]) {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (key === null) continue;
        expect(key).not.toContain(token);
        expect(storage.getItem(key) ?? '').not.toContain(token);
      }
    }
    const storedKeys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    expect(storedKeys.every((key) => key === HINT)).toBe(true);
    expect(sessionStorage.length).toBe(0);
  });
});
