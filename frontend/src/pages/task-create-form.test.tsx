import type { TaskListResponse, TaskResponse } from '@team-task-tracker/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskListPage } from '@/pages/task-list';
import { renderWithProviders } from '@/test/render';

const PROJECT_ID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
const OWNER_ID = '9b2e3d4f-5c6a-4b7c-8d8e-9f0a1b2c3d4e';
const TASKS_PATH = `/api/v1/projects/${PROJECT_ID}/tasks`;

interface Call {
  method: string;
  pathname: string;
  body: unknown;
}

let tasks: TaskResponse[];
let projectArchivedAt: string | null;
let createResponder: (body: unknown) => Response;
let calls: Call[];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function emptyList() {
  return { data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
}

function makeTask(title: string): TaskResponse {
  return {
    id: 'c3333333-3333-4333-8333-333333333333',
    projectId: PROJECT_ID,
    title,
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: '2030-01-15T23:59:59.000Z',
    assigneeId: null,
    createdById: OWNER_ID,
    archivedAt: null,
    createdAt: '2026-11-02T10:00:00.000Z',
    updatedAt: '2026-11-02T10:00:00.000Z',
  };
}

function listing(): TaskListResponse {
  return {
    data: tasks,
    meta: { page: 1, pageSize: 20, total: tasks.length, totalPages: 1 },
  };
}

function writes(): Call[] {
  return calls.filter((c) => c.method === 'POST' && c.pathname === TASKS_PATH);
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId/tasks" element={<TaskListPage />} />
    </Routes>,
    { route: `/projects/${PROJECT_ID}/tasks` },
  );
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'New task' }));
  return screen.findByRole('dialog');
}

beforeEach(() => {
  tasks = [];
  projectArchivedAt = null;
  calls = [];
  createResponder = (body) => {
    const created = makeTask((body as { title: string }).title);
    tasks = [created];
    return json(created, 201);
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      const raw = init?.body;
      const body: unknown = typeof raw === 'string' ? JSON.parse(raw) : undefined;
      calls.push({ method, pathname: url.pathname, body });

      if (url.pathname === TASKS_PATH && method === 'POST') {
        return Promise.resolve(createResponder(body));
      }
      if (url.pathname === TASKS_PATH) return Promise.resolve(json(listing()));
      if (url.pathname.endsWith('/comments') || url.pathname.endsWith('/activity')) {
        return Promise.resolve(json(emptyList()));
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

describe('Create task form', () => {
  it('Create a task: closes the dialog and shows the new task in the list', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), 'Ship it');
    fireEvent.change(within(dialog).getByLabelText('Due date'), {
      target: { value: '2030-01-15' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]?.body).toMatchObject({
      title: 'Ship it',
      dueDate: '2030-01-15T23:59:59Z',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Ship it')).toBeInTheDocument();
  });

  it('Invalid input is rejected locally: empty title', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByText(/title/i, { selector: ':not(label)' })).toBeVisible();
    expect(writes()).toHaveLength(0);
  });

  it('Invalid input is rejected locally: title over 200 characters', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    fireEvent.change(within(dialog).getByLabelText('Title'), {
      target: { value: 'x'.repeat(201) },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByText(/200|too long|at most/i)).toBeVisible();
    expect(writes()).toHaveLength(0);
  });

  it('Past due date: a date earlier than today shows a field error and sends no request', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), 'Old news');
    fireEvent.change(within(dialog).getByLabelText('Due date'), {
      target: { value: '2020-01-01' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByText(/past/i)).toBeVisible();
    expect(writes()).toHaveLength(0);
  });

  it('Past due date: a server 400 for dueDate is shown on the due date field', async () => {
    const user = userEvent.setup();
    createResponder = () =>
      json(
        { error: { code: 'VALIDATION_ERROR', message: 'dueDate must not be in the past' } },
        400,
      );
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), 'Edge');
    fireEvent.change(within(dialog).getByLabelText('Due date'), {
      target: { value: '2030-01-15' },
    });
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByText(/past/i)).toBeVisible();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Create forbidden: 403 shows the permission message in the dialog', async () => {
    const user = userEvent.setup();
    createResponder = () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403);
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), 'Nope');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByText(/You do not have permission/)).toBeVisible();
  });

  it('Create conflicting: 409 shows the project-archived message in the dialog', async () => {
    const user = userEvent.setup();
    createResponder = () => json({ error: { code: 'CONFLICT', message: 'Project archived' } }, 409);
    renderPage();
    const dialog = await openDialog(user);

    await user.type(within(dialog).getByLabelText('Title'), 'Late');
    await user.click(within(dialog).getByRole('button', { name: 'Create task' }));

    expect(await within(dialog).findByText(/archived/i)).toBeVisible();
  });

  it('Archived project has no create action', async () => {
    projectArchivedAt = '2026-11-01T12:00:00.000Z';
    renderPage();

    await waitFor(() => {
      expect(calls.some((c) => c.pathname === `/api/v1/projects/${PROJECT_ID}`)).toBe(true);
    });
    await screen.findByRole('heading', { level: 1 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('button', { name: 'New task' })).not.toBeInTheDocument();
  });
});
