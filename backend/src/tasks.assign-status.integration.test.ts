// Spec: tasks (DEV-1008 task 2.3) -- "Assign task" and "Status transitions".
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const password = 'correct-horse-9';
const unknownId = '00000000-0000-4000-8000-000000000000';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface TaskBody {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string | null;
  createdById: string;
  archivedAt: string | null;
}

let prisma: PrismaClient;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const databaseUrl = inject('testDatabaseUrl');
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  app = createApp(
    { databaseUrl, jwtAccessSecret: accessSecret, jwtRefreshSecret: refreshSecret },
    { prisma },
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Task", "ProjectMember", "Project", "RefreshToken", "User" CASCADE',
  );
});

interface Actor {
  id: string;
  token: string;
}

async function makeUser(email: string): Promise<Actor> {
  const reg = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, name: 'Test User', password });
  expect(reg.status).toBe(201);
  const login = await request(app).post('/api/v1/auth/login').send({ email, password });
  expect(login.status).toBe(200);
  return {
    id: (reg.body as { id: string }).id,
    token: (login.body as { accessToken: string }).accessToken,
  };
}

const makeProject = (archived = false) =>
  prisma.project.create({ data: { name: 'P', archivedAt: archived ? new Date() : null } });

const join = (projectId: string, userId: string, role: 'OWNER' | 'MEMBER' = 'MEMBER') =>
  prisma.projectMember.create({ data: { projectId, userId, role } });

type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

const makeTask = (
  projectId: string,
  createdById: string,
  extra: { archived?: boolean; dueDate?: Date; status?: Status; assigneeId?: string } = {},
) =>
  prisma.task.create({
    data: {
      projectId,
      createdById,
      title: 'Existing',
      description: 'desc',
      priority: 'LOW',
      dueDate: extra.dueDate ?? null,
      status: extra.status ?? 'TODO',
      assigneeId: extra.assigneeId ?? null,
      archivedAt: extra.archived ? new Date() : null,
    },
  });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;
const taskUrl = (projectId: string, taskId: string) => `${tasksUrl(projectId)}/${taskId}`;
const code = (res: { body: unknown }) => (res.body as ErrorBody).error.code;

async function setup() {
  const member = await makeUser('member@example.com');
  const project = await makeProject();
  await join(project.id, member.id);
  return { member, project };
}

const assign = (projectId: string, taskId: string, actor: Actor, body: object) =>
  request(app)
    .put(`${taskUrl(projectId, taskId)}/assignee`)
    .set('Authorization', bearer(actor))
    .send(body);

const setStatus = (projectId: string, taskId: string, actor: Actor, body: object) =>
  request(app)
    .post(`${taskUrl(projectId, taskId)}/status`)
    .set('Authorization', bearer(actor))
    .send(body);

describe('Assign task', () => {
  it('Assign to a member', async () => {
    const { member, project } = await setup();
    const other = await makeUser('other@example.com');
    await join(project.id, other.id);
    const task = await makeTask(project.id, member.id);

    const res = await assign(project.id, task.id, member, { assigneeId: other.id });

    expect(res.status).toBe(200);
    expect((res.body as TaskBody).assigneeId).toBe(other.id);
  });

  it('Unassign with null', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { assigneeId: member.id });

    const res = await assign(project.id, task.id, member, { assigneeId: null });

    expect(res.status).toBe(200);
    expect((res.body as TaskBody).assigneeId).toBeNull();
  });

  it('Registered non-member assignee is 400 ASSIGNEE_NOT_MEMBER and task unchanged', async () => {
    const { member, project } = await setup();
    const outsider = await makeUser('outsider@example.com');
    const task = await makeTask(project.id, member.id);

    const res = await assign(project.id, task.id, member, { assigneeId: outsider.id });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('ASSIGNEE_NOT_MEMBER');
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.assigneeId).toBeNull();
  });

  it('Unknown-user assignee is 400 ASSIGNEE_NOT_MEMBER and task unchanged', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    const res = await assign(project.id, task.id, member, { assigneeId: unknownId });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('ASSIGNEE_NOT_MEMBER');
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.assigneeId).toBeNull();
  });

  it.each([
    ['a missing assigneeId', {}],
    ['a non-UUID assigneeId', { assigneeId: 'not-a-uuid' }],
  ])('Invalid body is rejected: %s', async (_label, payload) => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    const res = await assign(project.id, task.id, member, payload);

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
  });

  it('Non-member is denied with 404 PROJECT_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);
    const outsider = await makeUser('outsider@example.com');

    const res = await assign(project.id, task.id, outsider, { assigneeId: null });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Archived task cannot be assigned: 409 TASK_ARCHIVED', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { archived: true });

    const res = await assign(project.id, task.id, member, { assigneeId: member.id });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('TASK_ARCHIVED');
  });
});

describe('Status transitions', () => {
  it.each<[Status, Status]>([
    ['TODO', 'IN_PROGRESS'],
    ['IN_PROGRESS', 'TODO'],
    ['IN_PROGRESS', 'IN_REVIEW'],
    ['IN_REVIEW', 'IN_PROGRESS'],
    ['IN_REVIEW', 'DONE'],
    ['DONE', 'IN_PROGRESS'],
  ])('Allowed transition %s -> %s', async (from, to) => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { status: from });

    const res = await setStatus(project.id, task.id, member, { status: to });

    expect(res.status).toBe(200);
    expect((res.body as TaskBody).status).toBe(to);
  });

  it.each<[Status, Status]>([
    ['TODO', 'DONE'],
    ['DONE', 'TODO'],
    ['TODO', 'TODO'],
  ])('Invalid transition %s -> %s is 409 INVALID_TRANSITION', async (from, to) => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { status: from });

    const res = await setStatus(project.id, task.id, member, { status: to });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('INVALID_TRANSITION');
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.status).toBe(from);
  });

  it.each([
    ['an unknown status', { status: 'BLOCKED' }],
    ['a missing status', {}],
  ])('Invalid status value is rejected: %s', async (_label, payload) => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    const res = await setStatus(project.id, task.id, member, payload);

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
  });

  it('Non-member is denied with 404 PROJECT_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);
    const outsider = await makeUser('outsider@example.com');

    const res = await setStatus(project.id, task.id, outsider, { status: 'IN_PROGRESS' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Archived task is 409 TASK_ARCHIVED', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { archived: true });

    const res = await setStatus(project.id, task.id, member, { status: 'IN_PROGRESS' });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('TASK_ARCHIVED');
  });
});
