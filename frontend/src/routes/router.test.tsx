import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/auth/auth-context';
import { createTestQueryClient } from '@/test/render';
import { routes } from './router';

vi.mock('@/lib/auth/auth-context', () => ({ useAuth: vi.fn() }));

type AuthValue = ReturnType<typeof useAuth>;

function mockAuth(status: AuthValue['status']): void {
  vi.mocked(useAuth).mockReturnValue({
    status,
    user: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
}

function renderAt(path: string): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('route guards', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReset();
  });

  it('redirects an anonymous user from /projects to the login page', async () => {
    mockAuth('anonymous');
    renderAt('/projects');
    expect(await screen.findByRole('heading', { level: 1, name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('shows the loading state without redirecting while the session is loading', async () => {
    mockAuth('loading');
    renderAt('/projects');
    expect(await screen.findByRole('status')).toHaveTextContent('Loading');
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Projects' })).not.toBeInTheDocument();
  });

  it('redirects an authenticated user from /login to the projects page', async () => {
    mockAuth('authenticated');
    renderAt('/login');
    expect(await screen.findByRole('heading', { level: 1, name: 'Projects' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument();
  });
});
