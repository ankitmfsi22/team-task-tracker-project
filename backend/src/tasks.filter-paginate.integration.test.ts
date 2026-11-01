// Spec: tasks (DEV-1009 task 2.2) -- "Filter tasks" and "Paginate tasks".
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const password = 'correct-horse-9';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface TaskBody {
  id: string;
  title: string;
}

interface ListBody {
  data: TaskBody[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface TaskOptions {
  status?: Status;
  priority?: Priority;
  assigneeId?: string;
  dueDate?: Date;
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

const baseTime = Date.parse('2026-01-01T00:00:00.000Z');

const makeTask = (
  projectId: string,
  createdById: string,
  title: string,
  minutes: number,
  options: TaskOptions = {},
) =>
  prisma.task.create({
    data: {
      projectId,
      createdById,
      title,
      createdAt: new Date(baseTime + minutes * 60_000),
      ...options,
    },
  });

const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;
const list = (projectId: string, actor: Actor, query = '') =>
  request(app)
    .get(`${tasksUrl(projectId)}${query}`)
    .set('Authorization', `Bearer ${actor.token}`);

async function setup() {
  const member = await makeUser('member@example.com');
  const other = await makeUser('other@example.com');
  const project = await prisma.project.create({ data: { name: 'P' } });
  await prisma.projectMember.create({
    data: { projectId: project.id, userId: member.id, role: 'MEMBER' },
  });
  await prisma.projectMember.create({
    data: { projectId: project.id, userId: other.id, role: 'MEMBER' },
  });
  return { member, other, project };
}

const ids = (res: { body: unknown }) => (res.body as ListBody).data.map((t) => t.id);

describe('Filter tasks', () => {
  it('Filter by status, priority and assignee', async () => {
    const { member, other, project } = await setup();
    const match1 = await makeTask(project.id, member.id, 'match1', 1, {
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: member.id,
    });
    const match2 = await makeTask(project.id, member.id, 'match2', 2, {
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: member.id,
    });
    await makeTask(project.id, member.id, 'wrong-status', 3, {
      status: 'TODO',
      priority: 'HIGH',
      assigneeId: member.id,
    });
    await makeTask(project.id, member.id, 'wrong-priority', 4, {
      status: 'IN_PROGRESS',
      priority: 'LOW',
      assigneeId: member.id,
    });
    await makeTask(project.id, member.id, 'wrong-assignee', 5, {
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: other.id,
    });
    await makeTask(project.id, member.id, 'unassigned', 6, {
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    });

    const res = await list(
      project.id,
      member,
      `?status=IN_PROGRESS&priority=HIGH&assigneeId=${member.id}`,
    );

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([match2.id, match1.id]);
    expect((res.body as ListBody).meta).toEqual({
      page: 1,
      pageSize: 20,
      total: 2,
      totalPages: 1,
    });
  });

  it('Filter by due-date range, both ends included, no task without dueDate', async () => {
    const { member, project } = await setup();
    const from = new Date('2026-03-01T00:00:00.000Z');
    const to = new Date('2026-03-31T23:59:59.000Z');
    await makeTask(project.id, member.id, 'before', 1, {
      dueDate: new Date(from.getTime() - 1000),
    });
    const onFrom = await makeTask(project.id, member.id, 'on-from', 2, { dueDate: from });
    const inside = await makeTask(project.id, member.id, 'inside', 3, {
      dueDate: new Date('2026-03-15T12:00:00.000Z'),
    });
    const onTo = await makeTask(project.id, member.id, 'on-to', 4, { dueDate: to });
    await makeTask(project.id, member.id, 'after', 5, {
      dueDate: new Date(to.getTime() + 1000),
    });
    await makeTask(project.id, member.id, 'no-due', 6);

    const res = await list(
      project.id,
      member,
      `?dueFrom=${from.toISOString()}&dueTo=${to.toISOString()}`,
    );

    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([onTo.id, inside.id, onFrom.id]);
    expect((res.body as ListBody).meta.total).toBe(3);
  });

  it.each([
    ['unknown status', 'status=BLOCKED'],
    ['unknown priority', 'priority=urgent'],
    ['non-UUID assigneeId', 'assigneeId=not-a-uuid'],
    ['malformed dueFrom', 'dueFrom=tomorrow'],
    ['dueFrom later than dueTo', 'dueFrom=2026-04-01T00:00:00.000Z&dueTo=2026-03-01T00:00:00.000Z'],
    ['unknown parameter', 'color=red'],
  ])('Invalid filter is rejected: %s', async (_name, query) => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'task', 1);

    const res = await list(project.id, member, `?${query}`);

    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    expect(res.body).not.toHaveProperty('data');
  });
});

describe('Paginate tasks', () => {
  it('Second page', async () => {
    const { member, project } = await setup();
    for (let i = 1; i <= 25; i += 1) {
      await makeTask(project.id, member.id, `task-${i}`, i);
    }

    const res = await list(project.id, member, '?page=2&pageSize=20');

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data).toHaveLength(5);
    expect(body.data.map((t) => t.title)).toEqual([
      'task-5',
      'task-4',
      'task-3',
      'task-2',
      'task-1',
    ]);
    expect(body.meta).toEqual({ page: 2, pageSize: 20, total: 25, totalPages: 2 });
  });

  it('Page beyond the end', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'a', 1);
    await makeTask(project.id, member.id, 'b', 2);

    const res = await list(project.id, member, '?page=9');

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data).toEqual([]);
    expect(body.meta).toEqual({ page: 9, pageSize: 20, total: 2, totalPages: 1 });
  });

  it.each([['page=0'], ['pageSize=101'], ['pageSize=abc']])(
    'Invalid pagination is rejected: %s',
    async (query) => {
      const { member, project } = await setup();
      await makeTask(project.id, member.id, 'task', 1);

      const res = await list(project.id, member, `?${query}`);

      expect(res.status).toBe(400);
      expect((res.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('pageSize 100 is accepted', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'task', 1);

    const res = await list(project.id, member, '?pageSize=100');

    expect(res.status).toBe(200);
    expect((res.body as ListBody).meta).toEqual({
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    });
  });
});
