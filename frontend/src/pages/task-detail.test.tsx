import type { TaskResponse } from '@team-task-tracker/shared';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskDetailPage } from '@/pages/task-detail';
import { renderWithProviders } from '@/test/render';

const PROJECT_ID = '3f1c2b4e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
const TASK_ID = 'a1111111-1111-4111-8111-111111111111';
const MEMBER_ID = '7a1d2c3e-4b5f-4a6b-9c7d-8e9f0a1b2c3d';
const OWNER_ID = '9b2e3d4f-5c6a-4b7c-8d8e-9f0a1b2c3d4e';

function makeTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: TASK_ID,
    projectId: PROJECT_ID,
    title: 'Write docs',
    description: 'Document the public API',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    dueDate: '2026-12-24T00:00:00.000Z',
    assigneeId: MEMBER_ID,
    createdById: OWNER_ID,
    archivedAt: null,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:00:00.000Z',
    ...overrides,
  };
}

let taskHandler: () => Response | Promise<Response>;

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

beforeEach(() => {
  taskHandler = () => json(makeTask());
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname === `/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}`) {
      return Promise.resolve(taskHandler());
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

describe('TaskDetailPage', () => {
  it('shows the task fields including the assignee name', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Write docs' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Document the public API')).toBeInTheDocument();
    expect(screen.getByText(/In progress/i)).toBeInTheDocument();
    expect(screen.getByText(/High/i)).toBeInTheDocument();
    expect(screen.getByText(/2026/)).toBeInTheDocument();
    expect(await screen.findByText('Mia Member')).toBeInTheDocument();
    expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
  });

  it('shows Unassigned when the task has no assignee', async () => {
    taskHandler = () => json(makeTask({ assigneeId: null }));
    renderPage();

    expect(await screen.findByText('Unassigned')).toBeInTheDocument();
  });

  it('shows a loading status while the request is pending', async () => {
    taskHandler = () => new Promise<Response>(() => undefined);
    renderPage();

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });

  it('shows not found without task data on 404', async () => {
    taskHandler = () => json(errorBody('NOT_FOUND', 'Task not found'), 404);
    renderPage();

    expect(await screen.findByText('Not found')).toBeInTheDocument();
    expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
  });

  it('shows a permission message on forbidden (403)', async () => {
    taskHandler = () => json(errorBody('FORBIDDEN', 'Forbidden'), 403);
    renderPage();

    expect(await screen.findByText(/You do not have permission/)).toBeInTheDocument();
    expect(screen.queryByText('Write docs')).not.toBeInTheDocument();
  });

  it('shows an error with Retry on server error (500)', async () => {
    taskHandler = () => json(errorBody('INTERNAL', 'Server exploded'), 500);
    renderPage();

    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
