// Spec: tasks (DEV-1008 task 2.2) -- "Update task" and "Due date rule" (update).
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

const patch = (projectId: string, taskId: string, actor: Actor, body: object) =>
  request(app).patch(taskUrl(projectId, taskId)).set('Authorization', bearer(actor)).send(body);

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600 * 1000);

describe('Update task', () => {
  it('Member updates fields and leaves the rest unchanged', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    const res = await patch(project.id, task.id, member, { title: 'Renamed', priority: 'HIGH' });

    expect(res.status).toBe(200);
    const body = res.body as TaskBody;
    expect(body.title).toBe('Renamed');
    expect(body.priority).toBe('HIGH');
    expect(body.description).toBe('desc');
    expect(body.status).toBe('TODO');
  });

  it.each([
    ['an empty body', {}],
    ['an empty title', { title: '' }],
    ['a status field', { title: 'New', status: 'DONE' }],
    ['an assigneeId field', { title: 'New', assigneeId: unknownId }],
  ])('Invalid body is rejected: %s', async (_label, payload) => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    const res = await patch(project.id, task.id, member, payload);

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.title).toBe('Existing');
    expect(stored.status).toBe('TODO');
    expect(stored.assigneeId).toBeNull();
  });

  it('Non-member is denied with 404 PROJECT_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);
    const outsider = await makeUser('outsider@example.com');

    const res = await patch(project.id, task.id, outsider, { title: 'Nope' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Archived task cannot be edited: 409 TASK_ARCHIVED', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { archived: true });

    const res = await patch(project.id, task.id, member, { title: 'Nope' });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('TASK_ARCHIVED');
    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.title).toBe('Existing');
  });
});

describe('Due date rule (update)', () => {
  it('Past due date that differs from the stored one is 400 VALIDATION_ERROR', async () => {
    const { member, project } = await setup();
    const stored = hoursFromNow(-48);
    const task = await makeTask(project.id, member.id, { dueDate: stored });

    const res = await patch(project.id, task.id, member, {
      dueDate: hoursFromNow(-24).toISOString(),
    });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
    const after = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(after.dueDate?.toISOString()).toBe(stored.toISOString());
  });

  it('Unchanged past due date is accepted', async () => {
    const { member, project } = await setup();
    const stored = hoursFromNow(-48);
    const task = await makeTask(project.id, member.id, { dueDate: stored });

    const res = await patch(project.id, task.id, member, {
      title: 'Renamed',
      dueDate: stored.toISOString(),
    });

    expect(res.status).toBe(200);
    expect((res.body as TaskBody).title).toBe('Renamed');
  });

  it('Due date can be cleared with null', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { dueDate: hoursFromNow(48) });

    const res = await patch(project.id, task.id, member, { dueDate: null });

    expect(res.status).toBe(200);
    expect((res.body as TaskBody).dueDate).toBeNull();
  });
});
