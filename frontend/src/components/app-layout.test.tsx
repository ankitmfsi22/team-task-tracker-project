import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/auth-context';
import { setSessionExpiredHandler } from '@/lib/api/client';
import { getAccessToken, setAccessToken } from '@/lib/auth/token';
import { routes } from '@/routes/router';
import { createTestQueryClient } from '@/test/render';

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

function mockServer(logout: () => Promise<Response>): void {
  fetchMock.mockImplementation((input) => {
    const url = String(input);
    if (url === '/api/v1/auth/refresh') {
      return Promise.resolve(jsonResponse(200, { accessToken: 'restored' }));
    }
    if (url === '/api/v1/auth/me') return Promise.resolve(jsonResponse(200, USER));
    if (url === '/api/v1/auth/logout') return logout();
    return Promise.resolve(jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } }));
  });
}

// A signed-in session is restored through the session hint plus the refresh cookie.
async function renderSignedIn() {
  localStorage.setItem(HINT, '1');
  const router = createMemoryRouter(routes, { initialEntries: ['/projects'] });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Projects' });
  return router;
}

beforeEach(() => {
  localStorage.clear();
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
});

describe('Logout', () => {
  it('calls logout, shows the login page and protects /projects again', async () => {
    mockServer(() => Promise.resolve(new Response(null, { status: 204 })));
    const router = await renderSignedIn();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(paths()).toContain('/api/v1/auth/logout');
    expect(getAccessToken()).toBeNull();

    await act(async () => {
      await router.navigate('/projects');
    });
    expect(router.state.location.pathname).toBe('/login');
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('still clears the local session when the logout call fails', async () => {
    mockServer(() => Promise.reject(new TypeError('Failed to fetch')));
    await renderSignedIn();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem(HINT)).toBeNull();
  });
});
