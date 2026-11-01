// Spec: comments (DEV-1010 task 2.1) -- "Add comment" and "List comments".
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

interface CommentBody {
  id: string;
  taskId: string;
  body: string;
  author: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface ListBody {
  data: CommentBody[];
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

const makeTask = (projectId: string, createdById: string, archived = false) =>
  prisma.task.create({
    data: {
      projectId,
      createdById,
      title: 'Existing',
      priority: 'LOW',
      archivedAt: archived ? new Date() : null,
    },
  });

const makeComment = (taskId: string, authorId: string, body: string, createdAt: Date) =>
  prisma.comment.create({ data: { taskId, authorId, body, createdAt } });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const commentsUrl = (projectId: string, taskId: string) =>
  `/api/v1/projects/${projectId}/tasks/${taskId}/comments`;
const code = (res: { body: unknown }) => (res.body as ErrorBody).error.code;

async function setup() {
  const member = await makeUser('member@example.com');
  const project = await makeProject();
  await join(project.id, member.id);
  const task = await makeTask(project.id, member.id);
  return { member, project, task };
}

const add = (projectId: string, taskId: string, actor: Actor, body: unknown) =>
  request(app)
    .post(commentsUrl(projectId, taskId))
    .set('Authorization', bearer(actor))
    .send(body as object);

const list = (projectId: string, taskId: string, actor: Actor, query = '') =>
  request(app)
    .get(`${commentsUrl(projectId, taskId)}${query}`)
    .set('Authorization', bearer(actor));

describe('Add comment', () => {
  it('Member adds a comment (trimmed) and no activity is added', async () => {
    const { member, project, task } = await setup();

    const res = await add(project.id, task.id, member, { body: '  Looks good  ' });

    expect(res.status).toBe(201);
    const body = res.body as CommentBody;
    expect(body.body).toBe('Looks good');
    expect(body.taskId).toBe(task.id);
    expect(body.author.id).toBe(member.id);
    expect(body.createdAt).toBeTruthy();
    expect(await prisma.comment.count()).toBe(1);
    expect(await prisma.activity.count()).toBe(0);
  });

  it.each<[string, unknown]>([
    ['empty body', { body: '' }],
    ['whitespace-only body', { body: '   ' }],
    ['2001-character body', { body: 'x'.repeat(2001) }],
    ['unknown field', { body: 'ok', extra: 1 }],
  ])('Invalid comment (%s) is 400 VALIDATION_ERROR', async (_name, payload) => {
    const { member, project, task } = await setup();

    const res = await add(project.id, task.id, member, payload);

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
    expect(await prisma.comment.count()).toBe(0);
  });

  it('Non-member is denied with 404 PROJECT_NOT_FOUND', async () => {
    const { project, task } = await setup();
    const outsider = await makeUser('outsider@example.com');

    const res = await add(project.id, task.id, outsider, { body: 'hi' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
    expect(await prisma.comment.count()).toBe(0);
  });

  it('Nonexistent project is 404 PROJECT_NOT_FOUND', async () => {
    const { member, task } = await setup();

    const res = await add(unknownId, task.id, member, { body: 'hi' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Task of another project is 404 TASK_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const other = await makeProject();
    await join(other.id, member.id);
    const otherTask = await makeTask(other.id, member.id);

    const res = await add(project.id, otherTask.id, member, { body: 'hi' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('TASK_NOT_FOUND');
    expect(await prisma.comment.count()).toBe(0);
  });

  it('Nonexistent task is 404 TASK_NOT_FOUND', async () => {
    const { member, project } = await setup();

    const res = await add(project.id, unknownId, member, { body: 'hi' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('TASK_NOT_FOUND');
  });

  it('Archived task is 409 TASK_ARCHIVED and still readable', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject();
    await join(project.id, member.id);
    const task = await makeTask(project.id, member.id, true);

    const res = await add(project.id, task.id, member, { body: 'hi' });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('TASK_ARCHIVED');
    expect(await prisma.comment.count()).toBe(0);
    expect((await list(project.id, task.id, member)).status).toBe(200);
  });

  it('Archived project is 409 PROJECT_ARCHIVED and still readable', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject(true);
    await join(project.id, member.id);
    const task = await makeTask(project.id, member.id);

    const res = await add(project.id, task.id, member, { body: 'hi' });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('PROJECT_ARCHIVED');
    expect(await prisma.comment.count()).toBe(0);
    expect((await list(project.id, task.id, member)).status).toBe(200);
  });

  it('Unauthenticated request is 401', async () => {
    const { project, task } = await setup();

    const res = await request(app).post(commentsUrl(project.id, task.id)).send({ body: 'hi' });

    expect(res.status).toBe(401);
  });
});

describe('List comments', () => {
  it('Member lists three comments oldest first with meta', async () => {
    const { member, project, task } = await setup();
    const now = Date.now();
    await makeComment(task.id, member.id, 'second', new Date(now - 2000));
    await makeComment(task.id, member.id, 'third', new Date(now - 1000));
    await makeComment(task.id, member.id, 'first', new Date(now - 3000));

    const res = await list(project.id, task.id, member);

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data.map((c) => c.body)).toEqual(['first', 'second', 'third']);
    expect(body.data[0]?.author).toEqual({ id: member.id, name: 'Test User' });
    expect(body.meta.total).toBe(3);
    expect(body.meta.page).toBe(1);
  });

  it('Non-member is denied with 404 and no data', async () => {
    const { member, project, task } = await setup();
    await makeComment(task.id, member.id, 'secret', new Date());
    const outsider = await makeUser('outsider@example.com');

    const res = await list(project.id, task.id, outsider);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it.each([['?pageSize=101'], ['?bogus=1']])(
    'Invalid query %s is 400 VALIDATION_ERROR',
    async (q) => {
      const { member, project, task } = await setup();

      const res = await list(project.id, task.id, member, q);

      expect(res.status).toBe(400);
      expect(code(res)).toBe('VALIDATION_ERROR');
    },
  );
});
