import type { TaskResponse } from '@team-task-tracker/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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
const TASK_PATH = `/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}`;

interface Call {
  method: string;
  pathname: string;
  body: unknown;
}

let task: TaskResponse;
let projectArchivedAt: string | null;
let patchResponder: ((body: Record<string, unknown>) => Response) | null;
let calls: Call[];

function makeTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
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
    ...overrides,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function patches(): Call[] {
  return calls.filter((c) => c.method === 'PATCH' && c.pathname === TASK_PATH);
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
    </Routes>,
    { route: `/projects/${PROJECT_ID}/tasks/${TASK_ID}` },
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Edit' }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  task = makeTask();
  projectArchivedAt = null;
  patchResponder = null;
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      const raw = init?.body;
      const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;
      calls.push({ method, pathname: url.pathname, body });

      if (url.pathname === TASK_PATH && method === 'PATCH') {
        const parsed = body as Record<string, unknown>;
        if (patchResponder) return Promise.resolve(patchResponder(parsed));
        task = { ...task, ...(parsed as Partial<TaskResponse>) };
        return Promise.resolve(json(task));
      }
      if (url.pathname === TASK_PATH) return Promise.resolve(json(task));
      if (url.pathname.endsWith('/comments') || url.pathname.endsWith('/activity')) {
        return Promise.resolve(
          json({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
        );
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
            role: 'OWNER',
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
});

describe('Edit task form', () => {
  it('Edit a task: shows new values and sends only the changed fields', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    const title = within(dialog).getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Write better docs');
    await user.selectOptions(within(dialog).getByLabelText('Priority'), 'URGENT');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]?.body).toEqual({ title: 'Write better docs', priority: 'URGENT' });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write better docs' }),
    ).toBeInTheDocument();
  });

  it('Save is disabled when nothing changed', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('Invalid edit is rejected locally: cleared title', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    await user.clear(within(dialog).getByLabelText('Title'));
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/title/i, { selector: ':not(label)' })).toBeVisible();
    expect(patches()).toHaveLength(0);
  });

  it('Invalid edit is rejected locally: title over 200 characters', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    fireEvent.change(within(dialog).getByLabelText('Title'), {
      target: { value: 'x'.repeat(201) },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/200|too long|at most/i)).toBeVisible();
    expect(patches()).toHaveLength(0);
  });

  it('Past due date on edit: an earlier date shows a field error and sends no request', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    fireEvent.change(within(dialog).getByLabelText('Due date'), {
      target: { value: '2020-01-01' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/past/i)).toBeVisible();
    expect(patches()).toHaveLength(0);
    // The modal dialog hides the page from the accessibility tree, hence hidden: true.
    expect(
      screen.getByRole('heading', { level: 1, name: 'Write docs', hidden: true }),
    ).toBeInTheDocument();
  });

  it('Past due date on edit: a server 400 is shown on the due date field', async () => {
    const user = userEvent.setup();
    patchResponder = () =>
      json(
        { error: { code: 'VALIDATION_ERROR', message: 'dueDate must not be in the past' } },
        400,
      );
    renderPage();
    const dialog = await openDialog(user);

    fireEvent.change(within(dialog).getByLabelText('Due date'), {
      target: { value: '2030-12-25' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/past/i)).toBeVisible();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Write docs', hidden: true }),
    ).toBeInTheDocument();
  });

  it('Unchanged past due date is omitted, and clearing the due date sends null', async () => {
    const user = userEvent.setup();
    task = makeTask({ dueDate: '2020-01-01T23:59:59.000Z' });
    renderPage();
    let dialog = await openDialog(user);

    const title = within(dialog).getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Renamed');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]?.body).toEqual({ title: 'Renamed' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    dialog = await openDialog(user);
    fireEvent.change(within(dialog).getByLabelText('Due date'), { target: { value: '' } });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(patches()).toHaveLength(2));
    expect(patches()[1]?.body).toEqual({ dueDate: null });
  });

  it('Edit forbidden: 403 shows the permission message in the dialog', async () => {
    const user = userEvent.setup();
    patchResponder = () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403);
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), ' more');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/You do not have permission/)).toBeVisible();
  });

  it('Edit conflicting: 409 shows the task-archived message and reloads the task', async () => {
    const user = userEvent.setup();
    patchResponder = () => json({ error: { code: 'CONFLICT', message: 'Task archived' } }, 409);
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), ' more');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(await within(dialog).findByText(/archived/i)).toBeVisible();
    await waitFor(() => {
      expect(calls.filter((c) => c.method === 'GET' && c.pathname === TASK_PATH).length).toBe(2);
    });
  });

  it('Archived task has no edit action', async () => {
    task = makeTask({ archivedAt: '2026-11-01T12:00:00.000Z' });
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write docs' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Archived: this (task|project) is read-only/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('Archived project has no edit action', async () => {
    projectArchivedAt = '2026-11-01T12:00:00.000Z';
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write docs' }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Archived: this (task|project) is read-only/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
