import type { CommentResponse, TaskResponse } from '@team-task-tracker/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailPage } from '@/pages/task-detail';
import { renderWithProviders } from '@/test/render';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: '00000000-0000-4000-8000-000000000001',
      email: 'viewer@example.com',
      name: 'Viewer',
    },
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

const PROJECT_ID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
const TASK_ID = 'a1111111-1111-4111-8111-111111111111';
const OWNER_ID = '9b2e3d4f-5c6a-4b7c-8d8e-9f0a1b2c3d4e';
const ALICE_ID = 'b2222222-2222-4222-8222-222222222222';
const BOB_ID = 'c3333333-3333-4333-8333-333333333333';
const TASK_PATH = `/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}`;
const COMMENTS_PATH = `${TASK_PATH}/comments`;

interface Call {
  method: string;
  pathname: string;
  search: URLSearchParams;
  body: unknown;
}

let comments: CommentResponse[];
let listResponder: ((search: URLSearchParams) => Response) | null;
let postResponder: ((body: Record<string, unknown>) => Response) | null;
let calls: Call[];

function makeComment(n: number, overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id: `d000000${n}-0000-4000-8000-000000000000`,
    taskId: TASK_ID,
    body: `Comment number ${n}`,
    author: { id: ALICE_ID, name: 'Alice Author' },
    createdAt: `2026-11-0${n}T10:00:00.000Z`,
    updatedAt: `2026-11-0${n}T10:00:00.000Z`,
    ...overrides,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function listBody(data: CommentResponse[], meta?: Partial<Record<string, number>>) {
  return {
    data,
    meta: { page: 1, pageSize: 20, total: data.length, totalPages: data.length ? 1 : 0, ...meta },
  };
}

function posts(): Call[] {
  return calls.filter((c) => c.method === 'POST' && c.pathname === COMMENTS_PATH);
}

function commentGets(): Call[] {
  return calls.filter((c) => c.method === 'GET' && c.pathname === COMMENTS_PATH);
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
    </Routes>,
    { route: `/projects/${PROJECT_ID}/tasks/${TASK_ID}` },
  );
}

beforeEach(() => {
  comments = [];
  listResponder = null;
  postResponder = null;
  calls = [];
  const task: TaskResponse = {
    id: TASK_ID,
    projectId: PROJECT_ID,
    title: 'Write docs',
    description: 'Document the public API',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2030-12-24T23:59:59.000Z',
    assigneeId: OWNER_ID,
    createdById: OWNER_ID,
    archivedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      const raw = init?.body;
      const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;
      calls.push({ method, pathname: url.pathname, search: url.searchParams, body });

      if (url.pathname === COMMENTS_PATH && method === 'POST') {
        const parsed = body as Record<string, unknown>;
        if (postResponder) return Promise.resolve(postResponder(parsed));
        const created = makeComment(comments.length + 1, {
          body: String(parsed.body),
          author: { id: OWNER_ID, name: 'Olivia Owner' },
        });
        comments = [...comments, created];
        return Promise.resolve(json(created, 201));
      }
      if (url.pathname === COMMENTS_PATH) {
        if (listResponder) return Promise.resolve(listResponder(url.searchParams));
        return Promise.resolve(json(listBody(comments)));
      }
      if (url.pathname === `${TASK_PATH}/activity`) {
        return Promise.resolve(
          json({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
        );
      }
      if (url.pathname === TASK_PATH) return Promise.resolve(json(task));
      if (url.pathname === `/api/v1/projects/${PROJECT_ID}/members`) {
        return Promise.resolve(
          json({
            data: [
              { userId: OWNER_ID, email: 'owner@example.com', name: 'Olivia Owner', role: 'OWNER' },
            ],
          }),
        );
      }
      if (url.pathname === `/api/v1/projects/${PROJECT_ID}`) {
        return Promise.resolve(
          json({
            id: PROJECT_ID,
            name: 'Alpha',
            description: null,
            role: 'OWNER',
            archivedAt: null,
            createdAt: '2026-10-01T10:00:00.000Z',
          }),
        );
      }
      return Promise.resolve(new Response('{}', { status: 404 }));
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Comment list', () => {
  it('Comments listed oldest first with author and time', async () => {
    comments = [
      makeComment(1, { body: 'First thoughts' }),
      makeComment(2, { body: 'Second thoughts', author: { id: BOB_ID, name: 'Bob Builder' } }),
      makeComment(3, { body: 'Third thoughts' }),
    ];
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Comments' })).toBeInTheDocument();
    const first = await screen.findByText('First thoughts');
    const second = screen.getByText('Second thoughts');
    const third = screen.getByText('Third thoughts');
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(second.compareDocumentPosition(third) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByText('Alice Author')).toHaveLength(2);
    expect(screen.getByText('Bob Builder')).toBeInTheDocument();
    // Each comment shows its time in a <time> element.
    expect(document.querySelectorAll('time')).toHaveLength(3);
  });

  it('Comment bodies are rendered as plain text', async () => {
    comments = [makeComment(1, { body: '<img src=x onerror=alert(1)>' })];
    renderPage();

    expect(await screen.findByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });

  it('Pagination: Next requests the next page with page and pageSize, Previous disabled on page 1', async () => {
    const user = userEvent.setup();
    listResponder = (search) => {
      const page = Number(search.get('page') ?? '1');
      const meta = { page, pageSize: 20, total: 21, totalPages: 2 };
      return json({
        data: [makeComment(page, { body: page === 1 ? 'On page one' : 'On page two' })],
        meta,
      });
    };
    renderPage();

    expect(await screen.findByText('On page one')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    const first = commentGets()[0];
    expect(first?.search.get('page')).toBe('1');
    expect(first?.search.get('pageSize')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('On page two')).toBeInTheDocument();
    const next = commentGets().find((c) => c.search.get('page') === '2');
    expect(next).toBeDefined();
    expect(next?.search.get('pageSize')).toBe(first?.search.get('pageSize'));
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('Empty state: shows "No comments yet"', async () => {
    renderPage();

    expect(await screen.findByText('No comments yet')).toBeInTheDocument();
  });

  it('Loading state: shown while the list is pending', async () => {
    listResponder = null;
    let release: (() => void) | undefined;
    const original = globalThis.fetch;
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input), 'http://localhost');
        if (url.pathname === COMMENTS_PATH && (init?.method ?? 'GET') === 'GET') {
          return new Promise<Response>((resolve) => {
            release = () => resolve(json(listBody([makeComment(1)])));
          });
        }
        return original(input, init);
      }),
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Comments' })).toBeInTheDocument();
    await waitFor(() => expect(release).toBeDefined());
    expect(screen.queryByText('No comments yet')).not.toBeInTheDocument();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);

    release?.();
    expect(await screen.findByText('Comment number 1')).toBeInTheDocument();
  });

  it('List 404 shows the shared not-found error state without retry', async () => {
    listResponder = () => json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    renderPage();

    expect(await screen.findByText('Not found')).toBeInTheDocument();
    expect(screen.queryByText('No comments yet')).not.toBeInTheDocument();
  });

  it('List failure shows an error state and Retry reloads the list', async () => {
    const user = userEvent.setup();
    let fail = true;
    listResponder = () =>
      fail
        ? json({ error: { code: 'INTERNAL', message: 'boom' } }, 500)
        : json(listBody([makeComment(1, { body: 'Recovered comment' })]));
    renderPage();

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Recovered comment')).toBeInTheDocument();
  });
});

describe('Add comment', () => {
  it('Add a comment: posts the body, shows it at the end and clears the field', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1, { body: 'Existing comment' })];
    renderPage();
    await screen.findByText('Existing comment');

    const field = screen.getByLabelText('Add a comment');
    await user.type(field, 'Looks good');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(posts()[0]?.body).toEqual({ body: 'Looks good' });
    const added = await screen.findByText('Looks good');
    const existing = screen.getByText('Existing comment');
    expect(existing.compareDocumentPosition(added) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await waitFor(() => expect(screen.getByLabelText('Add a comment')).toHaveValue(''));
  });

  it('Invalid body: empty body shows a field error and sends no request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No comments yet');

    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(
      await screen.findByText(/^(?!no comments yet).*(body|comment|required|at least|too small)/i, {
        selector: ':not(label):not(h2):not(button)',
      }),
    ).toBeVisible();
    expect(posts()).toHaveLength(0);
  });

  it('Invalid body: whitespace-only body shows a field error and sends no request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No comments yet');

    fireEvent.change(screen.getByLabelText('Add a comment'), { target: { value: '   ' } });
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(
      await screen.findByText(/^(?!no comments yet).*(body|comment|required|at least|too small)/i, {
        selector: ':not(label):not(h2):not(button)',
      }),
    ).toBeVisible();
    expect(posts()).toHaveLength(0);
  });

  it('Invalid body: 2001-character body shows a field error and sends no request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('No comments yet');

    fireEvent.change(screen.getByLabelText('Add a comment'), {
      target: { value: 'x'.repeat(2001) },
    });
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByText(/2000|too long|at most|too big/i)).toBeVisible();
    expect(posts()).toHaveLength(0);
  });

  it('Add forbidden: 403 shows an inline message and keeps the typed text', async () => {
    const user = userEvent.setup();
    postResponder = () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403);
    renderPage();
    await screen.findByText('No comments yet');

    await user.type(screen.getByLabelText('Add a comment'), 'Keep me');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByText(/You do not have permission/)).toBeVisible();
    expect(screen.getByLabelText('Add a comment')).toHaveValue('Keep me');
  });

  it('Add conflicting: 409 shows an inline archived message and keeps the typed text', async () => {
    const user = userEvent.setup();
    postResponder = () => json({ error: { code: 'CONFLICT', message: 'Task archived' } }, 409);
    renderPage();
    await screen.findByText('No comments yet');

    await user.type(screen.getByLabelText('Add a comment'), 'Keep me too');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByText(/archived/i)).toBeVisible();
    expect(screen.getByLabelText('Add a comment')).toHaveValue('Keep me too');
  });
});
