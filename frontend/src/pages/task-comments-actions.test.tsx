import type { CommentResponse, TaskResponse } from '@team-task-tracker/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '@/lib/auth/auth-context';
import { TaskDetailPage } from '@/pages/task-detail';
import { renderWithProviders } from '@/test/render';

vi.mock('@/lib/auth/auth-context', () => ({ useAuth: vi.fn() }));

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
  body: unknown;
}

let comments: CommentResponse[];
let role: 'OWNER' | 'MEMBER';
let projectArchivedAt: string | null;
let taskArchivedAt: string | null;
let patchResponder: ((id: string, body: Record<string, unknown>) => Response) | null;
let deleteResponder: ((id: string) => Response) | null;
let calls: Call[];

function mockUser(id: string): void {
  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    user: { id, email: 'user@example.com', name: 'Current User' },
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
}

function makeComment(n: number, overrides: Partial<CommentResponse> = {}): CommentResponse {
  return {
    id: `d000000${n}-0000-4000-8000-000000000000`,
    taskId: TASK_ID,
    body: `Original text ${n}`,
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

function commentCalls(method: string): Call[] {
  return calls.filter((c) => c.method === method && c.pathname.startsWith(`${COMMENTS_PATH}/`));
}

function itemOf(text: string): HTMLElement {
  const item = screen.getByText(text).closest('li');
  if (!item) throw new Error(`No list item for ${text}`);
  return item;
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
  role = 'MEMBER';
  projectArchivedAt = null;
  taskArchivedAt = null;
  patchResponder = null;
  deleteResponder = null;
  calls = [];
  mockUser(ALICE_ID);
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      const raw = init?.body;
      const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;
      calls.push({ method, pathname: url.pathname, body });

      const itemMatch = url.pathname.startsWith(`${COMMENTS_PATH}/`)
        ? url.pathname.slice(COMMENTS_PATH.length + 1)
        : null;
      if (itemMatch && method === 'PATCH') {
        const parsed = body as Record<string, unknown>;
        if (patchResponder) return Promise.resolve(patchResponder(itemMatch, parsed));
        const existing = comments.find((c) => c.id === itemMatch);
        if (!existing) return Promise.resolve(json({ error: { code: 'NOT_FOUND' } }, 404));
        const updated = { ...existing, body: String(parsed.body) };
        comments = comments.map((c) => (c.id === itemMatch ? updated : c));
        return Promise.resolve(json(updated));
      }
      if (itemMatch && method === 'DELETE') {
        if (deleteResponder) return Promise.resolve(deleteResponder(itemMatch));
        comments = comments.filter((c) => c.id !== itemMatch);
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      if (url.pathname === COMMENTS_PATH) {
        return Promise.resolve(
          json({
            data: comments,
            meta: {
              page: 1,
              pageSize: 20,
              total: comments.length,
              totalPages: comments.length ? 1 : 0,
            },
          }),
        );
      }
      if (url.pathname === `${TASK_PATH}/activity`) {
        return Promise.resolve(
          json({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
        );
      }
      if (url.pathname === TASK_PATH) {
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
          archivedAt: taskArchivedAt,
          createdAt: '2026-11-01T10:00:00.000Z',
          updatedAt: '2026-11-01T10:00:00.000Z',
        };
        return Promise.resolve(json(task));
      }
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
            role,
            archivedAt: projectArchivedAt,
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
  vi.mocked(useAuth).mockReset();
});

describe('Edit comment', () => {
  it('Author edits: saving a new body sends PATCH and shows the new body', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1)];
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Edit' }));
    const field = screen.getByLabelText('Edit comment');
    expect(field).toHaveValue('Original text 1');
    fireEvent.change(field, { target: { value: 'Revised text' } });
    await user.click(screen.getByRole('button', { name: 'Save comment' }));

    await waitFor(() => expect(commentCalls('PATCH')).toHaveLength(1));
    expect(commentCalls('PATCH')[0]?.pathname).toBe(`${COMMENTS_PATH}/${comments[0]?.id}`);
    expect(commentCalls('PATCH')[0]?.body).toEqual({ body: 'Revised text' });
    expect(await screen.findByText('Revised text')).toBeInTheDocument();
    expect(screen.queryByText('Original text 1')).not.toBeInTheDocument();
  });

  it('Cancel sends no request and keeps the original body', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1)];
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: 'Discarded' } });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(commentCalls('PATCH')).toHaveLength(0);
    expect(screen.queryByLabelText('Edit comment')).not.toBeInTheDocument();
    expect(screen.getByText('Original text 1')).toBeInTheDocument();
  });

  it('Others are not offered Edit: a project OWNER who is not the author gets no Edit', async () => {
    mockUser(OWNER_ID);
    role = 'OWNER';
    comments = [makeComment(1)];
    renderPage();
    await screen.findByText('Original text 1');
    // Delete is offered, which proves the actions have rendered for this user.
    await within(itemOf('Original text 1')).findByRole('button', { name: 'Delete' });

    expect(within(itemOf('Original text 1')).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('Others are not offered Edit: a MEMBER who is not the author gets no Edit', async () => {
    mockUser(BOB_ID);
    comments = [makeComment(1), makeComment(2, { author: { id: BOB_ID, name: 'Bob Builder' } })];
    renderPage();
    await screen.findByText('Original text 1');
    // Bob's own comment gets Edit, which proves the actions have rendered for this user.
    await within(itemOf('Original text 2')).findByRole('button', { name: 'Edit' });

    expect(within(itemOf('Original text 1')).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('Edit rejected: an empty body shows a field error and sends no request', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1)];
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: 'Save comment' }));

    const item = screen.getByLabelText('Edit comment').closest('li');
    if (!item) throw new Error('Edit field is not inside a list item');
    expect(
      await within(item).findByText(/body|comment|required|at least|too small/i, {
        selector: ':not(label):not(button)',
      }),
    ).toBeVisible();
    expect(commentCalls('PATCH')).toHaveLength(0);
  });

  it('Edit rejected: a 403 shows "You do not have permission" and leaves the comment unchanged', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1)];
    patchResponder = () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403);
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Edit comment'), { target: { value: 'Rejected text' } });
    await user.click(screen.getByRole('button', { name: 'Save comment' }));

    expect(await screen.findByText(/You do not have permission/)).toBeVisible();
    expect(commentCalls('PATCH')).toHaveLength(1);
    expect(comments[0]?.body).toBe('Original text 1');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Original text 1')).toBeInTheDocument();
    expect(screen.queryByText('Rejected text')).not.toBeInTheDocument();
  });
});

describe('Delete comment', () => {
  it('Author deletes: confirming sends DELETE and removes the comment', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1), makeComment(2, { author: { id: BOB_ID, name: 'Bob Builder' } })];
    renderPage();
    await screen.findByText('Original text 1');
    const id = comments[0]?.id;

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this comment?')).toBeInTheDocument();
    expect(commentCalls('DELETE')).toHaveLength(0);
    await user.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(commentCalls('DELETE')).toHaveLength(1));
    expect(commentCalls('DELETE')[0]?.pathname).toBe(`${COMMENTS_PATH}/${id}`);
    await waitFor(() => expect(screen.queryByText('Original text 1')).not.toBeInTheDocument());
    expect(screen.getByText('Original text 2')).toBeInTheDocument();
  });

  it('Author deletes: cancelling sends no request and keeps the comment', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1)];
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(commentCalls('DELETE')).toHaveLength(0);
    expect(screen.getByText('Original text 1')).toBeInTheDocument();
  });

  it('Owner deletes a comment by another user: DELETE is called and the comment is removed', async () => {
    const user = userEvent.setup();
    mockUser(OWNER_ID);
    role = 'OWNER';
    comments = [makeComment(1, { author: { id: BOB_ID, name: 'Bob Builder' } })];
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));

    await waitFor(() => expect(commentCalls('DELETE')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText('Original text 1')).not.toBeInTheDocument());
  });

  it('Member is not offered Delete: a MEMBER who is not the author gets no Delete', async () => {
    mockUser(BOB_ID);
    comments = [makeComment(1), makeComment(2, { author: { id: BOB_ID, name: 'Bob Builder' } })];
    renderPage();
    await screen.findByText('Original text 1');
    // Bob's own comment gets Delete, which proves the actions have rendered for this user.
    await within(itemOf('Original text 2')).findByRole('button', { name: 'Delete' });

    expect(within(itemOf('Original text 1')).queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(within(itemOf('Original text 1')).queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('Delete forbidden: a 403 shows "You do not have permission" and the comment remains', async () => {
    const user = userEvent.setup();
    comments = [makeComment(1)];
    deleteResponder = () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403);
    renderPage();
    await screen.findByText('Original text 1');

    await user.click(within(itemOf('Original text 1')).getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));

    expect(await screen.findByText(/You do not have permission/)).toBeVisible();
    expect(commentCalls('DELETE')).toHaveLength(1);
    expect(screen.getByText('Original text 1')).toBeInTheDocument();
  });
});

describe('Comments are read-only on archived items', () => {
  async function expectReadOnly(): Promise<void> {
    await screen.findByText('Original text 1');
    const region = screen.getByRole('region', { name: 'Comments' });
    expect(await within(region).findByText(/archived/i)).toBeInTheDocument();
    expect(screen.getByText('Original text 2')).toBeInTheDocument();
    expect(screen.queryByLabelText('Add a comment')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Post comment' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
  }

  it('Archived task: comments listed with an Archived notice and no form, Edit or Delete', async () => {
    mockUser(OWNER_ID);
    role = 'OWNER';
    taskArchivedAt = '2026-11-02T10:00:00.000Z';
    comments = [makeComment(1, { author: { id: OWNER_ID, name: 'Olivia Owner' } }), makeComment(2)];
    renderPage();

    await expectReadOnly();
  });

  it('Archived project: comments listed with an Archived notice and no form, Edit or Delete', async () => {
    mockUser(OWNER_ID);
    role = 'OWNER';
    projectArchivedAt = '2026-11-02T10:00:00.000Z';
    comments = [makeComment(1, { author: { id: OWNER_ID, name: 'Olivia Owner' } }), makeComment(2)];
    renderPage();

    await expectReadOnly();
  });
});
