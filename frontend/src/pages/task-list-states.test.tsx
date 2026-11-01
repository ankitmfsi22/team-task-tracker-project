import type { TaskListResponse, TaskResponse } from '@team-task-tracker/shared';
import { screen, waitFor } from '@testing-library/react';
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

let listHandler: (url: URL) => Response | Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function listing(tasks: TaskResponse[], page = 1, totalPages = 1): TaskListResponse {
  return {
    data: tasks,
    meta: { page, pageSize: 20, total: tasks.length, totalPages },
  };
}

function errorBody(code: string, message: string) {
  return { error: { code, message } };
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

function columnHeader(name: string): HTMLElement {
  const th = screen.getByRole('button', { name }).closest('th');
  if (th === null) throw new Error(`button "${name}" is not inside a <th>`);
  return th;
}

beforeEach(() => {
  listHandler = () => json(listing([activeTask]));
  fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === `/api/v1/projects/${PROJECT_ID}/tasks`) {
      return Promise.resolve(listHandler(url));
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

describe('TaskListPage sorting', () => {
  it('toggles sort direction on repeated header clicks', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('link', { name: 'Write docs' });
    expect(columnHeader('Priority')).toHaveAttribute('aria-sort', 'none');

    await user.click(screen.getByRole('button', { name: 'Priority' }));
    await waitFor(() => {
      const url = lastTaskRequest();
      expect(url.searchParams.get('sortBy')).toBe('priority');
      expect(url.searchParams.get('sortOrder')).toBe('asc');
    });
    expect(screen.getByTestId('search').textContent).toContain('sortBy=priority');
    expect(columnHeader('Priority')).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: 'Priority' }));
    await waitFor(() => {
      expect(lastTaskRequest().searchParams.get('sortOrder')).toBe('desc');
    });
    expect(columnHeader('Priority')).toHaveAttribute('aria-sort', 'descending');
  });
});

describe('TaskListPage pagination', () => {
  it('moves to the next and previous page', async () => {
    const user = userEvent.setup();
    listHandler = (url) => {
      const page = Number(url.searchParams.get('page') ?? '1');
      return json(listing([activeTask], page, 3));
    };
    renderPage();
    await screen.findByText('Page 1 of 3');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    await screen.findByText('Page 2 of 3');
    expect(screen.getByTestId('search').textContent).toContain('page=2');
    expect(lastTaskRequest().searchParams.get('page')).toBe('2');
    expect(lastTaskRequest().searchParams.get('pageSize')).toBe('20');

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await screen.findByText('Page 1 of 3');
    expect(lastTaskRequest().searchParams.get('page')).toBe('1');
  });

  it('disables Previous on the first page and Next on the last page', async () => {
    listHandler = (url) => {
      const page = Number(url.searchParams.get('page') ?? '1');
      return json(listing([activeTask], page, 2));
    };
    const first = renderPage();
    await screen.findByText('Page 1 of 2');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
    first.unmount();

    renderPage('?page=2');
    await screen.findByText('Page 2 of 2');
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });
});

describe('TaskListPage states', () => {
  it('shows a loading status while the request is pending', async () => {
    listHandler = () => new Promise<Response>(() => undefined);
    renderPage();

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Write docs' })).not.toBeInTheDocument();
  });

  it('shows the empty state for a project without tasks', async () => {
    listHandler = () => json(listing([]));
    renderPage();

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  });

  it('offers to clear filters when a filtered list is empty', async () => {
    const user = userEvent.setup();
    listHandler = () => json(listing([]));
    renderPage('?status=DONE');

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
    const buttons = await screen.findAllByRole('button', { name: 'Clear filters' });
    const button = buttons[buttons.length - 1];
    if (button === undefined) throw new Error('no Clear filters button');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByTestId('search').textContent).not.toContain('status=');
    });
  });

  it('shows not found without task data for a non-member (404)', async () => {
    listHandler = () => json(errorBody('NOT_FOUND', 'Project not found'), 404);
    renderPage();

    expect(await screen.findByText('Not found')).toBeInTheDocument();
    expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
  });

  it('shows a permission message on forbidden (403)', async () => {
    listHandler = () => json(errorBody('FORBIDDEN', 'Forbidden'), 403);
    renderPage();

    expect(await screen.findByText(/You do not have permission/)).toBeInTheDocument();
    expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
  });

  it('shows an error with Retry on server error (500) and refetches on click', async () => {
    const user = userEvent.setup();
    listHandler = () => json(errorBody('INTERNAL', 'Server exploded'), 500);
    renderPage();

    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Retry' });
    const before = taskRequests().length;

    await user.click(retry);

    await waitFor(() => {
      expect(taskRequests().length).toBeGreaterThan(before);
    });
  });
});
