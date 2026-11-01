import type { TaskResponse } from '@team-task-tracker/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailPage } from '@/pages/task-detail';
import { renderWithProviders } from '@/test/render';

const PROJECT_ID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
const TASK_ID = 'a1111111-1111-4111-8111-111111111111';
const MEMBER_ID = '7a1d2c3e-4b5f-4a6b-9c7d-8e9f0a1b2c3d';
const OWNER_ID = '9b2e3d4f-5c6a-4b7c-8d8e-9f0a1b2c3d4e';

const TASK_PATH = `/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}`;

function makeTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: TASK_ID,
    projectId: PROJECT_ID,
    title: 'Write docs',
    description: 'Document the public API',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-12-24T00:00:00.000Z',
    assigneeId: OWNER_ID,
    createdById: OWNER_ID,
    archivedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

interface Call {
  method: string;
  pathname: string;
  body: unknown;
}

let task: TaskResponse;
let projectArchivedAt: string | null;
let currentUserRole: 'OWNER' | 'MEMBER';
let calls: Call[];
let mutationHandler: ((call: Call) => Response | null) | null;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorBody(code: string, message: string) {
  return { error: { code, message } };
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
    </Routes>,
    { route: `/projects/${PROJECT_ID}/tasks/${TASK_ID}` },
  );
}

function mutationCalls(): Call[] {
  return calls.filter((c) => c.method !== 'GET' && c.pathname.startsWith(TASK_PATH));
}

beforeEach(() => {
  task = makeTask();
  projectArchivedAt = null;
  currentUserRole = 'OWNER';
  calls = [];
  mutationHandler = null;

  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost');
    const method = (init?.method ?? 'GET').toUpperCase();
    const rawBody = init?.body;
    const body: unknown = typeof rawBody === 'string' ? JSON.parse(rawBody) : undefined;
    const call: Call = { method, pathname: url.pathname, body };
    calls.push(call);

    if (url.pathname === TASK_PATH && method === 'GET') {
      return Promise.resolve(json(task));
    }
    if (method !== 'GET' && url.pathname.startsWith(`${TASK_PATH}/`)) {
      const custom = mutationHandler?.(call);
      if (custom) return Promise.resolve(custom);
      if (url.pathname === `${TASK_PATH}/status`) {
        const next = (body as { status: TaskResponse['status'] }).status;
        task = { ...task, status: next };
        return Promise.resolve(json(task));
      }
      if (url.pathname === `${TASK_PATH}/assignee`) {
        const next = (body as { assigneeId: string | null }).assigneeId;
        task = { ...task, assigneeId: next };
        return Promise.resolve(json(task));
      }
      if (url.pathname === `${TASK_PATH}/archive`) {
        task = { ...task, archivedAt: '2026-11-02T10:00:00.000Z' };
        return Promise.resolve(json(task));
      }
    }
    if (url.pathname === `/api/v1/projects/${PROJECT_ID}/members`) {
      return Promise.resolve(
        json({
          data: [
            { userId: OWNER_ID, email: 'owner@example.com', name: 'Olivia Owner', role: 'OWNER' },
            { userId: MEMBER_ID, email: 'mia@example.com', name: 'Mia Member', role: 'MEMBER' },
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
          archivedAt: projectArchivedAt,
          createdAt: '2026-10-01T10:00:00.000Z',
        }),
      );
    }
    return Promise.resolve(new Response('{}', { status: 404 }));
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TaskDetailPage actions', () => {
  it('offers only the allowed status transitions', async () => {
    task = makeTask({ status: 'TODO' });
    renderPage();

    expect(await screen.findByRole('button', { name: 'Move to In progress' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move to Done' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move to In review' })).not.toBeInTheDocument();
  });

  it('changes the status and shows the new status', async () => {
    const user = userEvent.setup();
    task = makeTask({ status: 'IN_PROGRESS' });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move to In review' }));

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'POST' && c.pathname === `${TASK_PATH}/status`)).toBe(
        true,
      );
    });
    expect(calls.find((c) => c.pathname === `${TASK_PATH}/status`)?.body).toEqual({
      status: 'IN_REVIEW',
    });
    expect(await screen.findByText(/In review/)).toBeInTheDocument();
  });

  it('shows a conflict alert and reloads the task on status 409', async () => {
    const user = userEvent.setup();
    task = makeTask({ status: 'IN_PROGRESS' });
    mutationHandler = (call) => {
      if (call.pathname === `${TASK_PATH}/status`) {
        task = { ...task, status: 'DONE' };
        return json(errorBody('CONFLICT', 'Invalid status transition'), 409);
      }
      return null;
    };
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move to In review' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').toMatch(/conflict/i);
    await waitFor(() => {
      expect(calls.filter((c) => c.method === 'GET' && c.pathname === TASK_PATH).length).toBe(2);
    });
  });

  it('assigns the task to a member and shows the member name', async () => {
    const user = userEvent.setup();
    renderPage();

    const select = await screen.findByLabelText('Assign to');
    await within(select).findByRole('option', { name: 'Mia Member' });
    await user.selectOptions(select, 'Mia Member');

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'PUT' && c.pathname === `${TASK_PATH}/assignee`)).toBe(
        true,
      );
    });
    expect(calls.find((c) => c.pathname === `${TASK_PATH}/assignee`)?.body).toEqual({
      assigneeId: MEMBER_ID,
    });
    expect(await screen.findByText('Mia Member', { selector: ':not(option)' })).toBeInTheDocument();
  });

  it('unassigns the task by sending a null assigneeId', async () => {
    const user = userEvent.setup();
    renderPage();

    const select = await screen.findByLabelText('Assign to');
    await within(select).findByRole('option', { name: 'Unassigned' });
    await user.selectOptions(select, 'Unassigned');

    await waitFor(() => {
      expect(calls.some((c) => c.method === 'PUT' && c.pathname === `${TASK_PATH}/assignee`)).toBe(
        true,
      );
    });
    expect(calls.find((c) => c.pathname === `${TASK_PATH}/assignee`)?.body).toEqual({
      assigneeId: null,
    });
  });

  it('archives only after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    expect(mutationCalls()).toHaveLength(0);

    await user.click(within(dialog).getByRole('button', { name: 'Confirm archive' }));

    await waitFor(() => {
      expect(mutationCalls().filter((c) => c.pathname === `${TASK_PATH}/archive`)).toHaveLength(1);
    });
    expect(mutationCalls()[0]?.method).toBe('POST');
    expect(await screen.findByText(/Archived/)).toBeInTheDocument();
  });

  it('sends no request when the archive confirmation is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Archive' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(mutationCalls()).toHaveLength(0);
  });

  it('shows a permission message and keeps the task unchanged on 403', async () => {
    const user = userEvent.setup();
    task = makeTask({ status: 'IN_PROGRESS' });
    mutationHandler = () => json(errorBody('FORBIDDEN', 'Forbidden'), 403);
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Move to In review' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').toContain('You do not have permission');
    expect(screen.getByRole('heading', { level: 1, name: 'Write docs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to In review' })).toBeInTheDocument();
  });

  it('hides all actions for an archived task', async () => {
    task = makeTask({ archivedAt: '2026-11-01T12:00:00.000Z' });
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write docs' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Archived/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move to / })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('hides all actions when the project is archived', async () => {
    projectArchivedAt = '2026-11-01T12:00:00.000Z';
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write docs' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Archived/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move to / })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Assign to')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Archive' })).not.toBeInTheDocument();
  });

  it('shows the actions to a MEMBER on an active task', async () => {
    currentUserRole = 'MEMBER';
    expect(currentUserRole).toBe('MEMBER');
    renderPage();

    expect(await screen.findByRole('button', { name: 'Move to In review' })).toBeInTheDocument();
    expect(screen.getByLabelText('Assign to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });
});
