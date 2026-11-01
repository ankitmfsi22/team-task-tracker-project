// Spec: activity (DEV-1010 task 3.2) -- "View activity history".
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

interface ActivityBody {
  id: string;
  taskId: string;
  action: string;
  metadata: unknown;
  actor: { id: string; name: string };
  createdAt: string;
}

interface ListBody {
  data: ActivityBody[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

interface TaskBody {
  id: string;
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
    'TRUNCATE TABLE "Activity", "Comment", "Task", "ProjectMember", "Project", "RefreshToken", "User" CASCADE',
  );
});

interface Actor {
  id: string;
  token: string;
}

async function makeUser(email: string, name = 'Test User'): Promise<Actor> {
  const reg = await request(app).post('/api/v1/auth/register').send({ email, name, password });
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

const bearer = (a: Actor) => `Bearer ${a.token}`;
const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;
const taskUrl = (projectId: string, taskId: string) => `${tasksUrl(projectId)}/${taskId}`;
const activityUrl = (projectId: string, taskId: string) => `${taskUrl(projectId, taskId)}/activity`;
const code = (res: { body: unknown }) => (res.body as ErrorBody).error.code;

const listActivity = (projectId: string, taskId: string, actor: Actor, query = '') =>
  request(app)
    .get(`${activityUrl(projectId, taskId)}${query}`)
    .set('Authorization', bearer(actor));

const createTask = (projectId: string, actor: Actor, body: object) =>
  request(app).post(tasksUrl(projectId)).set('Authorization', bearer(actor)).send(body);

const setStatus = (projectId: string, taskId: string, actor: Actor, body: object) =>
  request(app)
    .post(`${taskUrl(projectId, taskId)}/status`)
    .set('Authorization', bearer(actor))
    .send(body);

async function setup() {
  const member = await makeUser('member@example.com', 'Maya Member');
  const project = await makeProject();
  await join(project.id, member.id);
  const task = await makeTask(project.id, member.id);
  return { member, project, task };
}

describe('View activity history', () => {
  it('Member views history newest first with meta and actor', async () => {
    const member = await makeUser('member@example.com', 'Maya Member');
    const project = await makeProject();
    await join(project.id, member.id);

    const created = await createTask(project.id, member, { title: 'Write docs', priority: 'HIGH' });
    expect(created.status).toBe(201);
    const taskId = (created.body as TaskBody).id;
    expect((await setStatus(project.id, taskId, member, { status: 'IN_PROGRESS' })).status).toBe(
      200,
    );

    const res = await listActivity(project.id, taskId, member);

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data.map((e) => e.action)).toEqual(['TASK_STATUS_CHANGED', 'TASK_CREATED']);
    expect(body.meta.total).toBe(2);
    expect(body.meta.page).toBe(1);
    expect(body.data[0]?.taskId).toBe(taskId);
    expect(body.data[0]?.metadata).toEqual({ from: 'TODO', to: 'IN_PROGRESS' });
    expect(body.data[0]?.actor).toEqual({ id: member.id, name: 'Maya Member' });
    expect(body.data[0]?.createdAt).toBeTruthy();
  });

  it('Archived task and archived project histories are readable', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject();
    await join(project.id, member.id);
    const archivedTask = await makeTask(project.id, member.id, true);
    const archivedProject = await makeProject(true);
    await join(archivedProject.id, member.id);
    const taskInArchived = await makeTask(archivedProject.id, member.id);

    const a = await listActivity(project.id, archivedTask.id, member);
    const b = await listActivity(archivedProject.id, taskInArchived.id, member);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });

  it('Pagination page and pageSize are respected', async () => {
    const { member, project, task } = await setup();
    const now = Date.now();
    for (let i = 0; i < 3; i += 1) {
      await prisma.activity.create({
        data: {
          taskId: task.id,
          actorId: member.id,
          action: 'TASK_ARCHIVED',
          metadata: {},
          createdAt: new Date(now - (3 - i) * 1000),
        },
      });
    }

    const res = await listActivity(project.id, task.id, member, '?page=2&pageSize=2');

    expect(res.status).toBe(200);
    const body = res.body as ListBody;
    expect(body.data).toHaveLength(1);
    expect(body.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('Non-member is denied with 404 and no data', async () => {
    const { member, project, task } = await setup();
    await prisma.activity.create({
      data: { taskId: task.id, actorId: member.id, action: 'TASK_ARCHIVED', metadata: {} },
    });
    const outsider = await makeUser('outsider@example.com');

    const res = await listActivity(project.id, task.id, outsider);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it('Task of another project is 404 with no data', async () => {
    const { member, project } = await setup();
    const other = await makeProject();
    await join(other.id, member.id);
    const otherTask = await makeTask(other.id, member.id);

    const res = await listActivity(project.id, otherTask.id, member);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it('Nonexistent task is 404 with no data', async () => {
    const { member, project } = await setup();

    const res = await listActivity(project.id, unknownId, member);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it('Nonexistent project is 404 with no data', async () => {
    const { member, task } = await setup();

    const res = await listActivity(unknownId, task.id, member);

    expect(res.status).toBe(404);
    expect(res.body).not.toHaveProperty('data');
  });

  it.each([['?page=0'], ['?bogus=1']])('Invalid query %s is 400 VALIDATION_ERROR', async (q) => {
    const { member, project, task } = await setup();

    const res = await listActivity(project.id, task.id, member, q);

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
  });

  it('Unauthenticated request is 401', async () => {
    const { project, task } = await setup();

    const res = await request(app).get(activityUrl(project.id, task.id));

    expect(res.status).toBe(401);
  });
});

describe('Activity is append-only', () => {
  it.each(['post', 'patch', 'delete'] as const)(
    '%s to the activity path and an entry path is 404 and changes nothing',
    async (method) => {
      const { member, project, task } = await setup();
      await prisma.activity.create({
        data: { taskId: task.id, actorId: member.id, action: 'TASK_ARCHIVED', metadata: {} },
      });
      const before = await prisma.activity.count();

      const onPath = await request(app)
        [method](activityUrl(project.id, task.id))
        .set('Authorization', bearer(member))
        .send({});
      const onEntry = await request(app)
        [method](`${activityUrl(project.id, task.id)}/${unknownId}`)
        .set('Authorization', bearer(member))
        .send({});

      expect(onPath.status).toBe(404);
      expect(onEntry.status).toBe(404);
      expect(await prisma.activity.count()).toBe(before);
    },
  );

  it('Comment add, edit and delete add no activity entry', async () => {
    const { member, project, task } = await setup();
    const base = `${taskUrl(project.id, task.id)}/comments`;

    const added = await request(app)
      .post(base)
      .set('Authorization', bearer(member))
      .send({ body: 'first' });
    expect(added.status).toBe(201);
    const commentId = (added.body as { id: string }).id;
    const edited = await request(app)
      .patch(`${base}/${commentId}`)
      .set('Authorization', bearer(member))
      .send({ body: 'edited' });
    expect(edited.status).toBe(200);
    const removed = await request(app)
      .delete(`${base}/${commentId}`)
      .set('Authorization', bearer(member));
    expect(removed.status).toBe(204);

    expect(await prisma.activity.count()).toBe(0);
  });
});
