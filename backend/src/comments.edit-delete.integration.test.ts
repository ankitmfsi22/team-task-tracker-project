// Spec: comments (DEV-1010 task 2.1) -- "Edit comment" and "Delete comment".
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

const makeProject = () => prisma.project.create({ data: { name: 'P' } });

const join = (projectId: string, userId: string, role: 'OWNER' | 'MEMBER' = 'MEMBER') =>
  prisma.projectMember.create({ data: { projectId, userId, role } });

const makeTask = (projectId: string, createdById: string) =>
  prisma.task.create({ data: { projectId, createdById, title: 'Existing', priority: 'LOW' } });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const commentsUrl = (projectId: string, taskId: string) =>
  `/api/v1/projects/${projectId}/tasks/${taskId}/comments`;
const code = (res: { body: unknown }) => (res.body as ErrorBody).error.code;

async function setupComment() {
  const author = await makeUser('member@example.com');
  const project = await makeProject();
  await join(project.id, author.id);
  const task = await makeTask(project.id, author.id);
  const comment = await prisma.comment.create({
    data: {
      taskId: task.id,
      authorId: author.id,
      body: 'original',
      createdAt: new Date(Date.now() - 60_000),
    },
  });
  return { author, project, task, comment };
}

const patch = (projectId: string, taskId: string, commentId: string, actor: Actor, body: unknown) =>
  request(app)
    .patch(`${commentsUrl(projectId, taskId)}/${commentId}`)
    .set('Authorization', bearer(actor))
    .send(body as object);

const remove = (projectId: string, taskId: string, commentId: string, actor: Actor) =>
  request(app)
    .delete(`${commentsUrl(projectId, taskId)}/${commentId}`)
    .set('Authorization', bearer(actor));

async function bodyOf(id: string) {
  return (await prisma.comment.findUnique({ where: { id } }))?.body;
}

describe('Edit comment', () => {
  it('Author edits own comment, updatedAt moves and no activity is added', async () => {
    const { author, project, task, comment } = await setupComment();

    const res = await patch(project.id, task.id, comment.id, author, { body: ' edited ' });

    expect(res.status).toBe(200);
    const body = res.body as CommentBody;
    expect(body.body).toBe('edited');
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(new Date(body.createdAt).getTime());
    expect(await prisma.activity.count()).toBe(0);
  });

  it.each<['MEMBER' | 'OWNER']>([['MEMBER'], ['OWNER']])(
    'Another %s is denied with 403 FORBIDDEN and body unchanged',
    async (role) => {
      const { project, task, comment } = await setupComment();
      const other = await makeUser('other@example.com');
      await join(project.id, other.id, role);

      const res = await patch(project.id, task.id, comment.id, other, { body: 'hijack' });

      expect(res.status).toBe(403);
      expect(code(res)).toBe('FORBIDDEN');
      expect(await bodyOf(comment.id)).toBe('original');
    },
  );

  it('Empty body is 400 VALIDATION_ERROR', async () => {
    const { author, project, task, comment } = await setupComment();

    const res = await patch(project.id, task.id, comment.id, author, { body: '' });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
  });

  it('Non-member is 404 PROJECT_NOT_FOUND', async () => {
    const { project, task, comment } = await setupComment();
    const outsider = await makeUser('outsider@example.com');

    const res = await patch(project.id, task.id, comment.id, outsider, { body: 'x' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Unknown comment is 404 COMMENT_NOT_FOUND', async () => {
    const { author, project, task } = await setupComment();

    const res = await patch(project.id, task.id, unknownId, author, { body: 'x' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('COMMENT_NOT_FOUND');
  });

  it('Comment of another task is 404 COMMENT_NOT_FOUND', async () => {
    const { author, project, comment } = await setupComment();
    const otherTask = await makeTask(project.id, author.id);

    const res = await patch(project.id, otherTask.id, comment.id, author, { body: 'x' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('COMMENT_NOT_FOUND');
  });

  it('Unauthenticated request is 401', async () => {
    const { project, task, comment } = await setupComment();

    const res = await request(app)
      .patch(`${commentsUrl(project.id, task.id)}/${comment.id}`)
      .send({ body: 'x' });

    expect(res.status).toBe(401);
  });
});

describe('Delete comment', () => {
  it('Author deletes own comment, it leaves the list and no activity is added', async () => {
    const { author, project, task, comment } = await setupComment();

    const res = await remove(project.id, task.id, comment.id, author);

    expect(res.status).toBe(204);
    const listed = await request(app)
      .get(commentsUrl(project.id, task.id))
      .set('Authorization', bearer(author));
    expect((listed.body as { data: CommentBody[] }).data).toHaveLength(0);
    expect(await prisma.comment.count()).toBe(0);
    expect(await prisma.activity.count()).toBe(0);
  });

  it("Owner deletes a MEMBER's comment", async () => {
    const { project, task, comment } = await setupComment();
    const owner = await makeUser('owner@example.com');
    await join(project.id, owner.id, 'OWNER');

    const res = await remove(project.id, task.id, comment.id, owner);

    expect(res.status).toBe(204);
    expect(await prisma.comment.count()).toBe(0);
  });

  it('Other MEMBER is denied with 403 FORBIDDEN and the comment remains', async () => {
    const { project, task, comment } = await setupComment();
    const other = await makeUser('other@example.com');
    await join(project.id, other.id);

    const res = await remove(project.id, task.id, comment.id, other);

    expect(res.status).toBe(403);
    expect(code(res)).toBe('FORBIDDEN');
    expect(await prisma.comment.count()).toBe(1);
  });

  it('Non-member is 404 PROJECT_NOT_FOUND', async () => {
    const { project, task, comment } = await setupComment();
    const outsider = await makeUser('outsider@example.com');

    const res = await remove(project.id, task.id, comment.id, outsider);

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
    expect(await prisma.comment.count()).toBe(1);
  });

  it('Unknown comment is 404 COMMENT_NOT_FOUND', async () => {
    const { author, project, task } = await setupComment();

    const res = await remove(project.id, task.id, unknownId, author);

    expect(res.status).toBe(404);
    expect(code(res)).toBe('COMMENT_NOT_FOUND');
  });
});
