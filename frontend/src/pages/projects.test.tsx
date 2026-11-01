import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { ProjectListResponse, ProjectResponse } from '@team-task-tracker/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/auth-context';
import { setSessionExpiredHandler } from '@/lib/api/client';
import { setAccessToken } from '@/lib/auth/token';
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

function project(n: number, archivedAt: string | null = null): ProjectResponse {
  const hex = n.toString(16).padStart(12, '0');
  return {
    id: `7d1c0b52-8a3e-4f7b-b6a1-${hex}`,
    name: `Project ${n}`,
    description: null,
    archivedAt,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function page(data: ProjectResponse[], p: number, total: number): ProjectListResponse {
  return { data, meta: { page: p, pageSize: 20, total, totalPages: Math.ceil(total / 20) } };
}

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
type Handler = (url: URL, init?: RequestInit) => Response;

function serve(projectsHandler: Handler): void {
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === '/api/v1/auth/refresh') {
      return Promise.resolve(jsonResponse(200, { accessToken: 'restored' }));
    }
    if (url.pathname === '/api/v1/auth/me') return Promise.resolve(jsonResponse(200, USER));
    if (url.pathname === '/api/v1/projects') return Promise.resolve(projectsHandler(url, init));
    return Promise.resolve(jsonResponse(404, { error: { code: 'NOT_FOUND', message: 'x' } }));
  });
}

function projectCalls(method: string): URL[] {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = new URL(String(input), 'http://localhost');
      return url.pathname === '/api/v1/projects' && (init?.method ?? 'GET') === method;
    })
    .map(([input]) => new URL(String(input), 'http://localhost'));
}

function renderProjects(): void {
  localStorage.setItem(HINT, '1');
  const router = createMemoryRouter(routes, { initialEntries: ['/projects'] });
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
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

describe('Projects page: list', () => {
  it('shows the first page with next enabled and previous disabled, and next requests page 2', async () => {
    const first = Array.from({ length: 20 }, (_, i) => project(i + 1));
    const second = [project(21)];
    serve((url) =>
      url.searchParams.get('page') === '2'
        ? jsonResponse(200, page(second, 2, 21))
        : jsonResponse(200, page(first, 1, 21)),
    );
    const user = userEvent.setup();
    renderProjects();

    expect(await screen.findByText('Project 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(projectCalls('GET')[0]?.searchParams.get('pageSize')).toBe('20');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Project 21')).toBeInTheDocument();
    expect(projectCalls('GET').some((u) => u.searchParams.get('page') === '2')).toBe(true);
  });

  it('requests includeArchived=true and marks archived projects when the toggle is on', async () => {
    const active = project(1);
    const archived = project(2, '2026-02-01T00:00:00.000Z');
    serve((url) =>
      url.searchParams.get('includeArchived') === 'true'
        ? jsonResponse(200, page([active, archived], 1, 2))
        : jsonResponse(200, page([active], 1, 1)),
    );
    const user = userEvent.setup();
    renderProjects();

    await screen.findByText('Project 1');
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Include archived'));

    expect(await screen.findByText('Project 2')).toBeInTheDocument();
    expect(projectCalls('GET').some((u) => u.searchParams.get('includeArchived') === 'true')).toBe(
      true,
    );
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows an empty state with a Create project action when there are no projects', async () => {
    serve(() => jsonResponse(200, page([], 1, 0)));
    renderProjects();

    expect(await screen.findByRole('button', { name: 'Create project' })).toBeInTheDocument();
  });

  it('shows an error state with Retry when the list request fails', async () => {
    let calls = 0;
    serve(() => {
      calls += 1;
      return calls === 1
        ? jsonResponse(500, { error: { code: 'INTERNAL', message: 'boom' } })
        : jsonResponse(200, page([project(1)], 1, 1));
    });
    const user = userEvent.setup();
    renderProjects();

    await user.click(await screen.findByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Project 1')).toBeInTheDocument();
    expect(calls).toBe(2);
  });
});

describe('Projects page: create', () => {
  it('posts a valid project and shows it in the list', async () => {
    const created = project(2);
    let isCreated = false;
    serve((_url, init) => {
      if (init?.method === 'POST') {
        isCreated = true;
        return jsonResponse(201, created);
      }
      return jsonResponse(200, page(isCreated ? [project(1), created] : [project(1)], 1, 1));
    });
    const user = userEvent.setup();
    renderProjects();

    await screen.findByText('Project 1');
    await user.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText('Name'), 'Project 2');
    await user.type(within(dialog).getByLabelText('Description'), 'Second one');
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    expect(await screen.findByText('Project 2')).toBeInTheDocument();
    // The session restore also POSTs /auth/refresh; only project creation is counted here.
    const posts = fetchMock.mock.calls.filter(
      ([input, init]) => init?.method === 'POST' && String(input) === '/api/v1/projects',
    );
    expect(posts).toHaveLength(1);
    expect(String(posts[0]?.[0])).toBe('/api/v1/projects');
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({
      name: 'Project 2',
      description: 'Second one',
    });
  });

  it.each([
    ['empty', ''],
    ['over 100 characters', 'x'.repeat(101)],
  ])('rejects a name that is %s without sending a request', async (_label, name) => {
    serve(() => jsonResponse(200, page([project(1)], 1, 1)));
    const user = userEvent.setup();
    renderProjects();

    await screen.findByText('Project 1');
    await user.click(screen.getByRole('button', { name: 'New project' }));
    const dialog = await screen.findByRole('dialog');
    if (name) {
      await user.click(within(dialog).getByLabelText('Name'));
      await user.paste(name);
    }
    await user.click(within(dialog).getByRole('button', { name: 'Create project' }));

    await waitFor(() =>
      expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(projectCalls('POST')).toHaveLength(0);
  });
});
