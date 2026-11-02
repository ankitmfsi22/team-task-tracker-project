import type { ActivityResponse, TaskResponse } from '@team-task-tracker/shared';
import { screen, waitFor, within } from '@testing-library/react';
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
const MIA_ID = 'b2222222-2222-4222-8222-222222222222';
const GONE_ID = 'e5555555-5555-4555-8555-555555555555';
const TASK_PATH = `/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}`;
const ACTIVITY_PATH = `${TASK_PATH}/activity`;

interface Call {
  method: string;
  pathname: string;
  search: URLSearchParams;
}

let role: 'OWNER' | 'MEMBER';
let projectArchivedAt: string | null;
let taskArchivedAt: string | null;
let activityResponder: (page: number) => Response | Promise<Response>;
let calls: Call[];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function listOf(data: ActivityResponse[], page = 1, totalPages = 1): Response {
  return json({
    data,
    meta: { page, pageSize: 20, total: data.length, totalPages },
  });
}

function entry<T extends ActivityResponse>(
  n: number,
  rest: Omit<T, 'id' | 'taskId' | 'createdAt'>,
): T {
  return {
    id: `f000000${n}-0000-4000-8000-000000000000`,
    taskId: TASK_ID,
    createdAt: `2026-11-0${n}T10:00:00.000Z`,
    ...rest,
  } as T;
}

function activityCalls(): Call[] {
  return calls.filter((c) => c.method === 'GET' && c.pathname === ACTIVITY_PATH);
}

function activityRegion(): HTMLElement {
  return screen.getByRole('region', { name: 'Activity' });
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
  role = 'OWNER';
  projectArchivedAt = null;
  taskArchivedAt = null;
  activityResponder = () => listOf([]);
  calls = [];
  vi.mocked(useAuth).mockReturnValue({
    status: 'authenticated',
    user: { id: OWNER_ID, email: 'owner@example.com', name: 'Olivia Owner' },
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), 'http://localhost');
      const method = (init?.method ?? 'GET').toUpperCase();
      calls.push({ method, pathname: url.pathname, search: url.searchParams });

      if (url.pathname === ACTIVITY_PATH) {
        const page = Number(url.searchParams.get('page') ?? '1');
        return Promise.resolve(activityResponder(page));
      }
      if (url.pathname === `${TASK_PATH}/comments`) {
        return Promise.resolve(
          json({ data: [], meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }),
        );
      }
      if (url.pathname === `${TASK_PATH}/status` && method === 'POST') {
        return Promise.resolve(json(makeTask({ status: 'IN_REVIEW' })));
      }
      if (url.pathname === TASK_PATH) {
        return Promise.resolve(json(makeTask({})));
      }
      if (url.pathname === `/api/v1/projects/${PROJECT_ID}/members`) {
        return Promise.resolve(
          json({
            data: [
              { userId: OWNER_ID, email: 'owner@example.com', name: 'Olivia Owner', role: 'OWNER' },
              { userId: MIA_ID, email: 'mia@example.com', name: 'Mia Member', role: 'MEMBER' },
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

function makeTask(overrides: Partial<TaskResponse>): TaskResponse {
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
    archivedAt: taskArchivedAt,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(useAuth).mockReset();
});

describe('Activity history', () => {
  it('Activity entries are described: actor, readable action, values and time, newest first', async () => {
    const owner = { id: OWNER_ID, name: 'Olivia Owner' };
    const mia = { id: MIA_ID, name: 'Mia Member' };
    activityResponder = () =>
      listOf([
        entry(5, { action: 'TASK_ARCHIVED', metadata: {}, actor: owner }),
        entry(4, {
          action: 'TASK_ASSIGNED',
          metadata: { from: MIA_ID, to: null },
          actor: owner,
        }),
        entry(3, {
          action: 'TASK_ASSIGNED',
          metadata: { from: GONE_ID, to: MIA_ID },
          actor: owner,
        }),
        entry(2, {
          action: 'TASK_STATUS_CHANGED',
          metadata: { from: 'TODO', to: 'IN_PROGRESS' },
          actor: mia,
        }),
        entry(1, {
          action: 'TASK_ASSIGNED',
          metadata: { from: null, to: MIA_ID },
          actor: owner,
        }),
        entry(0, {
          action: 'TASK_CREATED',
          metadata: { title: 'Write docs', priority: 'HIGH', assigneeId: null },
          actor: owner,
        }),
      ]);
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    const items = await within(region).findAllByRole('listitem');
    expect(items).toHaveLength(6);

    const text = items.map((li) => li.textContent ?? '');
    expect(text[0]).toMatch(/Olivia Owner/);
    expect(text[0]).toMatch(/archived the task/i);
    expect(text[1]).toMatch(/changed assignee from Mia Member to Unassigned/i);
    expect(text[2]).toMatch(/changed assignee from Former member to Mia Member/i);
    expect(text[3]).toMatch(/Mia Member/);
    expect(text[3]).toMatch(/changed status from To do to In progress/i);
    expect(text[4]).toMatch(/changed assignee from Unassigned to Mia Member/i);
    expect(text[5]).toMatch(/created the task/i);
    expect(text[5]).toMatch(/Write docs/);
    for (const li of items) {
      expect(li.querySelectorAll('time')).toHaveLength(1);
    }
  });

  it('Pagination, empty and error states: Next and Previous page the history', async () => {
    const user = userEvent.setup();
    const owner = { id: OWNER_ID, name: 'Olivia Owner' };
    activityResponder = (page) =>
      listOf(
        page === 1
          ? [entry(2, { action: 'TASK_ARCHIVED', metadata: {}, actor: owner })]
          : [
              entry(1, {
                action: 'TASK_STATUS_CHANGED',
                metadata: { from: 'TODO', to: 'IN_PROGRESS' },
                actor: owner,
              }),
            ],
        page,
        2,
      );
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    await within(region).findByText(/archived the task/i);
    expect(within(region).getByRole('button', { name: 'Previous' })).toBeDisabled();

    await user.click(within(region).getByRole('button', { name: 'Next' }));

    await within(activityRegion()).findByText(/changed status from To do to In progress/i);
    const page2 = activityCalls().find((c) => c.search.get('page') === '2');
    expect(page2).toBeDefined();
    expect(page2?.search.get('pageSize')).toBeTruthy();
    expect(within(activityRegion()).queryByText(/archived the task/i)).toBeNull();
    expect(within(activityRegion()).getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('Pagination, empty and error states: no pagination buttons for a single page', async () => {
    const owner = { id: OWNER_ID, name: 'Olivia Owner' };
    activityResponder = () =>
      listOf([entry(1, { action: 'TASK_ARCHIVED', metadata: {}, actor: owner })]);
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    await within(region).findByText(/archived the task/i);
    expect(within(region).queryByRole('button', { name: 'Next' })).toBeNull();
    expect(within(region).queryByRole('button', { name: 'Previous' })).toBeNull();
  });

  it('Pagination, empty and error states: shows a loading status while pending', async () => {
    activityResponder = () => new Promise<Response>(() => undefined);
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    const status = await within(region).findByRole('status');
    expect(status).toHaveTextContent('Loading activity…');
  });

  it('Pagination, empty and error states: an empty history shows "No activity yet"', async () => {
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    expect(await within(region).findByText('No activity yet')).toBeInTheDocument();
  });

  it('Pagination, empty and error states: a 403 shows "You do not have permission"', async () => {
    activityResponder = () => json({ error: { code: 'FORBIDDEN', message: 'Forbidden' } }, 403);
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    expect(await within(region).findByText(/You do not have permission/)).toBeVisible();
  });

  it('Pagination, empty and error states: a 404 shows "Not found"', async () => {
    activityResponder = () => json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    expect(await within(region).findByText(/Not found/)).toBeVisible();
  });

  it('Pagination, empty and error states: a 500 shows "Something went wrong" and Retry refetches', async () => {
    const user = userEvent.setup();
    const owner = { id: OWNER_ID, name: 'Olivia Owner' };
    let fail = true;
    activityResponder = () =>
      fail
        ? json({ error: { code: 'INTERNAL', message: 'Boom' } }, 500)
        : listOf([entry(1, { action: 'TASK_ARCHIVED', metadata: {}, actor: owner })]);
    renderPage();

    const region = await screen.findByRole('region', { name: 'Activity' });
    expect(await within(region).findByText(/Something went wrong/)).toBeVisible();
    const before = activityCalls().length;
    fail = false;
    await user.click(within(region).getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(activityCalls().length).toBeGreaterThan(before));
    expect(await within(activityRegion()).findByText(/archived the task/i)).toBeInTheDocument();
  });
});

describe('Archived task still shows history', () => {
  const owner = { id: OWNER_ID, name: 'Olivia Owner' };

  async function expectHistoryOnly(): Promise<void> {
    const region = await screen.findByRole('region', { name: 'Activity' });
    expect(await within(region).findByText(/archived the task/i)).toBeInTheDocument();
    expect(within(region).queryByRole('button')).toBeNull();
  }

  it('Archived task: the activity panel is still shown without controls', async () => {
    taskArchivedAt = '2026-11-02T10:00:00.000Z';
    activityResponder = () =>
      listOf([entry(1, { action: 'TASK_ARCHIVED', metadata: {}, actor: owner })]);
    renderPage();

    await expectHistoryOnly();
  });

  it('Archived project: the activity panel is still shown without controls', async () => {
    projectArchivedAt = '2026-11-02T10:00:00.000Z';
    activityResponder = () =>
      listOf([entry(1, { action: 'TASK_ARCHIVED', metadata: {}, actor: owner })]);
    renderPage();

    await expectHistoryOnly();
  });
});

describe('Activity refresh after task mutations', () => {
  it('A successful status change requests the activity list again', async () => {
    const user = userEvent.setup();
    renderPage();
    const region = await screen.findByRole('region', { name: 'Activity' });
    await within(region).findByText('No activity yet');
    const before = activityCalls().length;

    await user.click(await screen.findByRole('button', { name: 'Move to In review' }));

    await waitFor(() =>
      expect(calls.some((c) => c.method === 'POST' && c.pathname === `${TASK_PATH}/status`)).toBe(
        true,
      ),
    );
    await waitFor(() => expect(activityCalls().length).toBeGreaterThan(before));
  });
});
