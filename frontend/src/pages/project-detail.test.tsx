import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { MemberResponse, ProjectDetailResponse, ProjectRole } from '@team-task-tracker/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/lib/auth/auth-context';
import { setSessionExpiredHandler } from '@/lib/api/client';
import { setAccessToken } from '@/lib/auth/token';
import { routes } from '@/routes/router';
import { createTestQueryClient } from '@/test/render';

const USER = { id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90', email: 'ada@example.com', name: 'Ada' };
const HINT = 'ttt.session';
const PROJECT_ID = '7d1c0b52-8a3e-4f7b-b6a1-000000000001';
const BASE = `/api/v1/projects/${PROJECT_ID}`;
const BOB_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string): Response {
  return jsonResponse(status, { error: { code, message: 'x' } });
}

function detail(
  role: ProjectRole,
  overrides: Partial<ProjectDetailResponse> = {},
): ProjectDetailResponse {
  return {
    id: PROJECT_ID,
    name: 'Apollo',
    description: 'Moon landing',
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    role,
    ...overrides,
  };
}

const ADA: MemberResponse = { userId: USER.id, email: USER.email, name: 'Ada', role: 'OWNER' };
const BOB: MemberResponse = {
  userId: BOB_ID,
  email: 'bob@example.com',
  name: 'Bob',
  role: 'MEMBER',
};

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

interface Server {
  project: ProjectDetailResponse;
  members: MemberResponse[];
  /** Return a response to override the default behaviour for a request. */
  override?: (method: string, path: string, init?: RequestInit) => Response | undefined;
}

function serve(server: Server): void {
  fetchMock.mockImplementation((input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const method = init?.method ?? 'GET';
    const path = url.pathname;
    if (path === '/api/v1/auth/refresh') {
      return Promise.resolve(jsonResponse(200, { accessToken: 'restored' }));
    }
    if (path === '/api/v1/auth/me') return Promise.resolve(jsonResponse(200, USER));
    const custom = server.override?.(method, path, init);
    if (custom) return Promise.resolve(custom);
    if (path === BASE && method === 'GET') {
      return Promise.resolve(jsonResponse(200, server.project));
    }
    if (path === `${BASE}/members` && method === 'GET') {
      return Promise.resolve(jsonResponse(200, { data: server.members }));
    }
    return Promise.resolve(errorResponse(404, 'NOT_FOUND'));
  });
}

function calls(method: string, path: string): [string, RequestInit | undefined][] {
  return fetchMock.mock.calls
    .filter(([input, init]) => {
      const url = new URL(String(input), 'http://localhost');
      return url.pathname === path && (init?.method ?? 'GET') === method;
    })
    .map(([input, init]) => [String(input), init]);
}

function renderDetail(): void {
  localStorage.setItem(HINT, '1');
  const router = createMemoryRouter(routes, { initialEntries: [`/projects/${PROJECT_ID}`] });
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

describe('Project detail: edit and archive', () => {
  it('owner edits the project name via PATCH and the new name is shown', async () => {
    const server: Server = {
      project: detail('OWNER'),
      members: [ADA, BOB],
      override: (method, path, init) => {
        if (method === 'PATCH' && path === BASE) {
          const body = JSON.parse(String(init?.body)) as { name: string };
          server.project = { ...server.project, name: body.name };
          return jsonResponse(200, server.project);
        }
        return undefined;
      },
    };
    serve(server);
    const user = userEvent.setup();
    renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Apollo' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Artemis');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Artemis' })).toBeInTheDocument();
    const patches = calls('PATCH', BASE);
    expect(patches).toHaveLength(1);
    expect(JSON.parse(String(patches[0]?.[1]?.body))).toMatchObject({ name: 'Artemis' });
  });

  it('owner confirms archiving and the project is shown as archived with write actions hidden', async () => {
    const server: Server = {
      project: detail('OWNER'),
      members: [ADA, BOB],
      override: (method, path) => {
        if (method === 'POST' && path === `${BASE}/archive`) {
          server.project = { ...server.project, archivedAt: '2026-03-01T00:00:00.000Z' };
          return jsonResponse(200, server.project);
        }
        return undefined;
      },
    };
    serve(server);
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(calls('POST', `${BASE}/archive`)).toHaveLength(0);
    await user.click(await screen.findByRole('button', { name: 'Confirm archive' }));

    expect(await screen.findByText('Archived')).toBeInTheDocument();
    expect(calls('POST', `${BASE}/archive`)).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull());
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
  });

  it('shows a Not found state when the detail request returns 404', async () => {
    serve({
      project: detail('OWNER'),
      members: [],
      override: (method, path) =>
        method === 'GET' && path === BASE ? errorResponse(404, 'NOT_FOUND') : undefined,
    });
    renderDetail();

    expect(await screen.findByText('Not found')).toBeInTheDocument();
  });

  it('shows a permission message when the detail request returns 403', async () => {
    serve({
      project: detail('OWNER'),
      members: [],
      override: (method, path) =>
        method === 'GET' && path === BASE ? errorResponse(403, 'FORBIDDEN') : undefined,
    });
    renderDetail();

    expect(await screen.findByText('You do not have permission')).toBeInTheDocument();
  });

  it('shows a permission message and leaves the project unchanged when update returns 403', async () => {
    serve({
      project: detail('OWNER'),
      members: [ADA],
      override: (method, path) =>
        method === 'PATCH' && path === BASE ? errorResponse(403, 'FORBIDDEN') : undefined,
    });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Artemis');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('You do not have permission')).toBeInTheDocument();
    expect(calls('PATCH', BASE)).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Apollo' })).toBeInTheDocument();
  });

  it('shows a permission message and leaves the project unchanged when archive returns 403', async () => {
    serve({
      project: detail('OWNER'),
      members: [ADA],
      override: (method, path) =>
        method === 'POST' && path === `${BASE}/archive`
          ? errorResponse(403, 'FORBIDDEN')
          : undefined,
    });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm archive' }));

    expect(await screen.findByText('You do not have permission')).toBeInTheDocument();
    expect(calls('POST', `${BASE}/archive`)).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Apollo' })).toBeInTheDocument();
    expect(screen.queryByText('Archived')).toBeNull();
  });
});

describe('Project detail: members management', () => {
  it('owner adds a member by email and role and the member list shows the new member', async () => {
    const server: Server = {
      project: detail('OWNER'),
      members: [ADA],
      override: (method, path) => {
        if (method === 'POST' && path === `${BASE}/members`) {
          server.members = [ADA, BOB];
          return jsonResponse(201, BOB);
        }
        return undefined;
      },
    };
    serve(server);
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.type(screen.getByLabelText('Email'), 'bob@example.com');
    await user.selectOptions(screen.getByLabelText('Role'), 'MEMBER');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    const posts = calls('POST', `${BASE}/members`);
    expect(posts).toHaveLength(1);
    expect(JSON.parse(String(posts[0]?.[1]?.body))).toEqual({
      email: 'bob@example.com',
      role: 'MEMBER',
    });
  });

  it('shows an inline message and leaves the list unchanged when the email is unknown (404)', async () => {
    serve({
      project: detail('OWNER'),
      members: [ADA],
      override: (method, path) =>
        method === 'POST' && path === `${BASE}/members`
          ? errorResponse(404, 'NOT_FOUND')
          : undefined,
    });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.type(screen.getByLabelText('Email'), 'ghost@example.com');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('No user with this email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Bob' })).toBeNull();
  });

  it('shows an inline message and leaves the list unchanged when the user is already a member (409)', async () => {
    serve({
      project: detail('OWNER'),
      members: [ADA, BOB],
      override: (method, path) =>
        method === 'POST' && path === `${BASE}/members`
          ? errorResponse(409, 'CONFLICT')
          : undefined,
    });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.type(screen.getByLabelText('Email'), 'bob@example.com');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    expect(await screen.findByText('This user is already a member')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Remove / })).toHaveLength(2);
  });

  it('owner confirms removing a member and the member disappears from the list', async () => {
    const server: Server = {
      project: detail('OWNER'),
      members: [ADA, BOB],
      override: (method, path) => {
        if (method === 'DELETE' && path === `${BASE}/members/${BOB_ID}`) {
          server.members = [ADA];
          return new Response(null, { status: 204 });
        }
        return undefined;
      },
    };
    serve(server);
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.click(await screen.findByRole('button', { name: 'Remove Bob' }));
    expect(calls('DELETE', `${BASE}/members/${BOB_ID}`)).toHaveLength(0);
    await user.click(await screen.findByRole('button', { name: 'Confirm remove' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remove Bob' })).toBeNull());
    expect(calls('DELETE', `${BASE}/members/${BOB_ID}`)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Remove Ada' })).toBeInTheDocument();
  });

  it('shows "A project needs at least one owner" and keeps the member when removal returns 409 LAST_OWNER', async () => {
    serve({
      project: detail('OWNER'),
      members: [ADA],
      override: (method, path) =>
        method === 'DELETE' && path === `${BASE}/members/${USER.id}`
          ? errorResponse(409, 'LAST_OWNER')
          : undefined,
    });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.click(await screen.findByRole('button', { name: 'Remove Ada' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm remove' }));

    expect(await screen.findByText('A project needs at least one owner')).toBeInTheDocument();
    expect(calls('DELETE', `${BASE}/members/${USER.id}`)).toHaveLength(1);
    // The signed-in user's name is also shown in the layout header, so scope to the Members section.
    expect(
      within(screen.getByRole('region', { name: 'Members' })).getByText('Ada'),
    ).toBeInTheDocument();
  });

  it('shows a field error and sends no request for an invalid member email', async () => {
    serve({ project: detail('OWNER'), members: [ADA] });
    const user = userEvent.setup();
    renderDetail();

    await screen.findByRole('heading', { level: 1, name: 'Apollo' });
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Add member' }));

    await waitFor(() =>
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(calls('POST', `${BASE}/members`)).toHaveLength(0);
  });
});

describe('Project detail: role-based actions', () => {
  it('shows a MEMBER a read-only project with no write controls', async () => {
    serve({ project: detail('MEMBER'), members: [ADA, BOB] });
    renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Apollo' })).toBeInTheDocument();
    expect(screen.getByText('Moon landing')).toBeInTheDocument();
    expect(screen.getByText('Role: MEMBER')).toBeInTheDocument();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
    // The signed-in user's name is also shown in the layout header, so scope to the Members section.
    expect(
      within(screen.getByRole('region', { name: 'Members' })).getByText('Ada'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
  });

  it('shows an OWNER of a non-archived project all write controls', async () => {
    serve({ project: detail('OWNER'), members: [ADA, BOB] });
    renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Apollo' })).toBeInTheDocument();
    expect(screen.getByText('Role: OWNER')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add member' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Remove Bob' })).toBeInTheDocument();
  });

  it('shows no write controls to an OWNER of an archived project', async () => {
    serve({
      project: detail('OWNER', { archivedAt: '2026-02-01T00:00:00.000Z' }),
      members: [ADA, BOB],
    });
    renderDetail();

    expect(await screen.findByRole('heading', { level: 1, name: 'Apollo' })).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add member' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Remove / })).toBeNull();
  });
});
