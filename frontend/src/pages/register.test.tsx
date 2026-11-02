import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/auth-context';
import { setSessionExpiredHandler } from '@/lib/api/client';
import { setAccessToken } from '@/lib/auth/token';
import { routes } from '@/routes/router';
import { createTestQueryClient } from '@/test/render';

const USER = { id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90', email: 'ada@example.com', name: 'Ada' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function calledPaths(): string[] {
  return fetchMock.mock.calls.map(([url]) => String(url));
}

function renderRegister(): void {
  const router = createMemoryRouter(routes, { initialEntries: ['/register'] });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(values: { email: string; name: string; password: string }) {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Email'), values.email);
  await user.type(screen.getByLabelText('Name'), values.name);
  await user.type(screen.getByLabelText('Password'), values.password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
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

describe('Register page', () => {
  it('registers, signs in and shows the project list', async () => {
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/v1/auth/register') return Promise.resolve(jsonResponse(201, USER));
      if (url === '/api/v1/auth/login') {
        return Promise.resolve(jsonResponse(200, { accessToken: 'new-token' }));
      }
      if (url === '/api/v1/auth/me') return Promise.resolve(jsonResponse(200, USER));
      return Promise.resolve(jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } }));
    });
    renderRegister();

    await fillAndSubmit({ email: 'ada@example.com', name: 'Ada', password: 'correct-horse-1' });

    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(calledPaths()).toContain('/api/v1/auth/register');
    expect(calledPaths()).toContain('/api/v1/auth/login');
  });

  it('rejects an invalid email without sending a request', async () => {
    renderRegister();
    await fillAndSubmit({ email: 'not-an-email', name: 'Ada', password: 'correct-horse-1' });

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 8 characters without sending a request', async () => {
    renderRegister();
    await fillAndSubmit({ email: 'ada@example.com', name: 'Ada', password: 'short' });

    await waitFor(() =>
      expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an empty name without sending a request', async () => {
    const user = userEvent.setup();
    renderRegister();
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a duplicate email message and keeps the entered values on 409', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: 'CONFLICT', message: 'Email already registered' } }),
    );
    renderRegister();

    await fillAndSubmit({ email: 'ada@example.com', name: 'Ada', password: 'correct-horse-1' });

    expect(
      await screen.findByText('An account with this email already exists'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Name')).toHaveValue('Ada');
    expect(screen.getByLabelText('Password')).toHaveValue('correct-horse-1');
  });
});
