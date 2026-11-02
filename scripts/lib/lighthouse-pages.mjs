// Page list and stub API routes for the Lighthouse gate (DEV-1011, task detail added in DEV-1013).
// Pure data and routing, so it is unit-tested without a browser.

// seedSession: the page needs a signed-in session, so the session hint is set before the audit.
export const PAGES = [
  { path: '/login', seedSession: false },
  { path: '/projects', seedSession: true },
  { path: '/projects/3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90/tasks', seedSession: true },
  {
    path: '/projects/3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90/tasks/5a2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90',
    seedSession: true,
  },
];

const USER = { id: '3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a90', email: 'ada@example.com', name: 'Ada' };
const PROJECTS = Array.from({ length: 3 }, (_, i) => ({
  id: `3f2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a9${i}`,
  name: `Project ${i + 1}`,
  description: 'Fixture project served by the Lighthouse stub API.',
  archivedAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
}));

const TASK_PROJECT = PROJECTS[0];
const TASKS = Array.from({ length: 5 }, (_, i) => ({
  id: `5a2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a9${i}`,
  projectId: TASK_PROJECT.id,
  title: `Fixture task ${i + 1}`,
  description: 'Fixture task served by the Lighthouse stub API.',
  status: ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'TODO'][i],
  priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'MEDIUM'][i],
  dueDate: '2026-12-31T00:00:00.000Z',
  assigneeId: USER.id,
  createdById: USER.id,
  archivedAt: null,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
}));

const DETAIL_TASK = TASKS[0];
const AUTHOR = { id: USER.id, name: USER.name };

// Comments oldest first.
const COMMENTS = ['Started looking into this.', 'Ready for review, please take a look.'].map(
  (body, i) => ({
    id: `7c2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a9${i}`,
    taskId: DETAIL_TASK.id,
    body,
    author: AUTHOR,
    createdAt: `2026-11-01T0${i + 1}:00:00.000Z`,
    updatedAt: `2026-11-01T0${i + 1}:00:00.000Z`,
  }),
);

// Activity newest first.
const ACTIVITY = [
  {
    action: 'TASK_STATUS_CHANGED',
    metadata: { from: 'TODO', to: 'IN_PROGRESS' },
    createdAt: '2026-11-01T03:00:00.000Z',
  },
  {
    action: 'TASK_ASSIGNED',
    metadata: { from: null, to: USER.id },
    createdAt: '2026-11-01T02:00:00.000Z',
  },
  {
    action: 'TASK_CREATED',
    metadata: { title: DETAIL_TASK.title, priority: DETAIL_TASK.priority, assigneeId: null },
    createdAt: '2026-11-01T00:00:00.000Z',
  },
].map((entry, i) => ({
  id: `9d2b8c1e-6d4a-4b7e-9a10-2c5d8e7f1a9${i}`,
  taskId: DETAIL_TASK.id,
  actor: AUTHOR,
  ...entry,
}));

function page(data) {
  return {
    status: 200,
    body: { data, meta: { page: 1, pageSize: 20, total: data.length, totalPages: 1 } },
  };
}

// Maps a request to the stub API response, or null when the route is not served.
export function stubRoute(method, pathname) {
  const project = `/api/v1/projects/${TASK_PROJECT.id}`;
  const task = `${project}/tasks/${DETAIL_TASK.id}`;
  if (method === 'POST' && pathname === '/api/v1/auth/refresh') {
    return { status: 200, body: { accessToken: 'lighthouse-fixture-token' } };
  }
  if (method !== 'GET') return null;
  if (pathname === '/api/v1/auth/me') return { status: 200, body: USER };
  if (pathname === '/api/v1/projects') return page(PROJECTS);
  if (pathname === project) return { status: 200, body: { ...TASK_PROJECT, role: 'OWNER' } };
  if (pathname === `${project}/members`) {
    const member = { userId: USER.id, email: USER.email, name: USER.name, role: 'OWNER' };
    return { status: 200, body: { data: [member] } };
  }
  if (pathname === `${project}/tasks`) return page(TASKS);
  if (pathname === task) return { status: 200, body: DETAIL_TASK };
  if (pathname === `${task}/comments`) return page(COMMENTS);
  if (pathname === `${task}/activity`) return page(ACTIVITY);
  return null;
}
