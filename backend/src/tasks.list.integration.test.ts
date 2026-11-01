// Spec: tasks (DEV-1009 task 2.1) -- "List tasks".
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
  archivedAt: string | null;
}

interface ListBody {
  data: TaskBody[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
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

const baseTime = Date.parse('2026-01-01T00:00:00.000Z');

// createdAt = base + minutes, so a larger offset is a newer task.
const makeTask = (
  projectId: string,
  createdById: string,
  title: string,
  minutes: number,
  archived = false,
) =>
  prisma.task.create({
    data: {
      projectId,
      createdById,
      title,
      createdAt: new Date(baseTime + minutes * 60_000),
      archivedAt: archived ? new Date() : null,
    },
  });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;
const list = (projectId: string, actor: Actor, query = '') =>
  request(app)
    .get(`${tasksUrl(projectId)}${query}`)
    .set('Authorization', bearer(actor));

async function setup() {
  const member = await makeUser('member@example.com');
  const project = await makeProject();
  await join(project.id, member.id);
  return { member, project };
}

describe('List tasks', () => {
  it('Member lists tasks: active only, newest first, with meta', async () => {
    const { member, project } = await setup();
    const oldest = await makeTask(project.id, member.id, 'oldest', 1);
    await makeTask(project.id, member.id, 'archived', 2, true);
    const middle = await makeTask(project.id, member.id, 'middle', 3);
    const newest = await makeTask(project.id, member.id, 'newest', 4);

    const res = await list(project.id, member);

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data.map((t) => t.id)).toEqual([newest.id, middle.id, oldest.id]);
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
  });

  it('Archived tasks are included on request', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'active', 1);
    const archived = await makeTask(project.id, member.id, 'archived', 2, true);

    const res = await list(project.id, member, '?includeArchived=true');

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data.map((t) => t.id)).toContain(archived.id);
    expect(body.data).toHaveLength(2);
    expect(body.meta.total).toBe(2);
  });

  it('Non-member is denied with 404 and no task data', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'secret', 1);
    const outsider = await makeUser('outsider@example.com');

    const res = await list(project.id, outsider);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
    expect((res.body as ErrorBody).error.code).toBe('PROJECT_NOT_FOUND');
  });

  it('Nonexistent project is 404', async () => {
    const { member } = await setup();

    const res = await list(unknownId, member);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it('Unauthenticated request is rejected with 401', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'task', 1);

    const res = await request(app).get(tasksUrl(project.id));

    expect(res.status).toBe(401);
  });

  it('Tasks of other projects are not returned', async () => {
    const { member, project } = await setup();
    const other = await makeProject();
    await join(other.id, member.id);
    const mine = await makeTask(project.id, member.id, 'mine', 1);
    await makeTask(other.id, member.id, 'theirs', 2);

    const res = await list(project.id, member);

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data.map((t) => t.id)).toEqual([mine.id]);
    expect(body.data.every((t) => t.projectId === project.id)).toBe(true);
    expect(body.meta.total).toBe(1);
  });

  it('A member can list tasks of an archived project', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject(true);
    await join(project.id, member.id);
    const task = await makeTask(project.id, member.id, 'task', 1);

    const res = await list(project.id, member);

    expect(res.status).toBe(200);
    expect((res.body as ListBody).data.map((t) => t.id)).toEqual([task.id]);
  });
});
