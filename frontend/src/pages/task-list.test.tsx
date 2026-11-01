import type { TaskListResponse, TaskResponse } from '@team-task-tracker/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskListPage } from '@/pages/task-list';
import { renderWithProviders } from '@/test/render';

const PROJECT_ID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
const MEMBER_ID = '7a1d2c3e-4b5f-4a6b-9c7d-8e9f0a1b2c3d';
const OWNER_ID = '9b2e3d4f-5c6a-4b7c-8d8e-9f0a1b2c3d4e';

function makeTask(overrides: Partial<TaskResponse> & { id: string; title: string }): TaskResponse {
  return {
    projectId: PROJECT_ID,
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    assigneeId: null,
    createdById: OWNER_ID,
    archivedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

const activeTask = makeTask({ id: 'a1111111-1111-4111-8111-111111111111', title: 'Write docs' });
const archivedTask = makeTask({
  id: 'b2222222-2222-4222-8222-222222222222',
  title: 'Old chore',
  archivedAt: '2026-10-01T10:00:00.000Z',
});

let tasksPayload: TaskListResponse;
let fetchMock: ReturnType<typeof vi.fn>;

function listing(tasks: TaskResponse[]): TaskListResponse {
  return {
    data: tasks,
    meta: { page: 1, pageSize: 20, total: tasks.length, totalPages: 1 },
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function taskRequests(): URL[] {
  return fetchMock.mock.calls
    .map((call) => new URL(String(call[0]), 'http://localhost'))
    .filter((url) => url.pathname === `/api/v1/projects/${PROJECT_ID}/tasks`);
}

function lastTaskRequest(): URL {
  const all = taskRequests();
  const last = all[all.length - 1];
  if (last === undefined) throw new Error('no task list request was made');
  return last;
}

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="search">{location.search}</div>;
}

function renderPage(search = '') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/projects/:projectId/tasks" element={<TaskListPage />} />
      </Routes>
      <LocationProbe />
    </>,
    { route: `/projects/${PROJECT_ID}/tasks${search}` },
  );
}

beforeEach(() => {
  tasksPayload = listing([activeTask]);
  fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === `/api/v1/projects/${PROJECT_ID}/tasks`) {
      return Promise.resolve(json(tasksPayload));
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
          archivedAt: null,
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

describe('TaskListPage filters', () => {
  it('updates the URL and the request when a status is selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('link', { name: 'Write docs' });

    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');

    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).toContain('status=IN_PROGRESS');
    });
    await waitFor(() => {
      const url = lastTaskRequest();
      expect(url.searchParams.get('status')).toBe('IN_PROGRESS');
      expect(url.searchParams.get('page')).toBe('1');
    });
  });

  it('restores filters from the URL', async () => {
    renderPage(`?priority=HIGH&assigneeId=${MEMBER_ID}&includeArchived=true`);
    await screen.findByRole('link', { name: 'Write docs' });

    await waitFor(() => {
      expect(screen.getByLabelText('Priority')).toHaveValue('HIGH');
      expect(screen.getByLabelText('Assignee')).toHaveValue(MEMBER_ID);
      expect(screen.getByLabelText('Include archived')).toBeChecked();
    });
    const url = lastTaskRequest();
    expect(url.searchParams.get('priority')).toBe('HIGH');
    expect(url.searchParams.get('assigneeId')).toBe(MEMBER_ID);
    expect(url.searchParams.get('includeArchived')).toBe('true');
  });

  it('maps the due range to UTC datetimes', async () => {
    renderPage();
    await screen.findByRole('link', { name: 'Write docs' });

    fireEvent.change(screen.getByLabelText('Due from'), { target: { value: '2026-12-01' } });
    fireEvent.change(screen.getByLabelText('Due to'), { target: { value: '2026-12-31' } });

    await waitFor(() => {
      const url = lastTaskRequest();
      expect(url.searchParams.get('dueFrom')).toBe('2026-12-01T00:00:00.000Z');
      expect(url.searchParams.get('dueTo')).toBe('2026-12-31T23:59:59.999Z');
    });
  });

  it('ignores invalid URL values and requests the unfiltered first page', async () => {
    renderPage('?status=BOGUS&page=-3');
    await screen.findByRole('link', { name: 'Write docs' });

    expect(taskRequests().length).toBeGreaterThan(0);
    for (const url of taskRequests()) {
      expect(url.searchParams.has('status')).toBe(false);
      expect(url.searchParams.get('page')).toBe('1');
    }
    expect(screen.getByLabelText('Status')).toHaveValue('');
  });

  it('removes all filters from the URL when "Clear filters" is clicked', async () => {
    const user = userEvent.setup();
    renderPage(`?status=DONE&priority=HIGH&assigneeId=${MEMBER_ID}&includeArchived=true`);
    await screen.findByRole('link', { name: 'Write docs' });

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    await waitFor(() => {
      const search = screen.getByTestId('search').textContent ?? '';
      for (const key of ['status', 'priority', 'assigneeId', 'includeArchived']) {
        expect(search).not.toContain(`${key}=`);
      }
    });
    await waitFor(() => {
      const url = lastTaskRequest();
      for (const key of ['status', 'priority', 'assigneeId', 'includeArchived']) {
        expect(url.searchParams.has(key)).toBe(false);
      }
    });
  });
});

describe('TaskListPage archived toggle', () => {
  it('requests archived tasks and marks them with an Archived badge', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('link', { name: 'Write docs' });
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();

    tasksPayload = listing([activeTask, archivedTask]);
    await user.click(screen.getByLabelText('Include archived'));

    await waitFor(() => {
      expect(lastTaskRequest().searchParams.get('includeArchived')).toBe('true');
    });
    await screen.findByRole('link', { name: 'Old chore' });
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });
});
