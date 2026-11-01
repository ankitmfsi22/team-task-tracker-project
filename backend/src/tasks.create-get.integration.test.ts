// Spec: tasks (DEV-1008 task 2.1) -- "Create task", "View task", "Due date rule" (create), "Assign task" (create).
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

const makeTask = (projectId: string, createdById: string, archived = false) =>
  prisma.task.create({
    data: { projectId, createdById, title: 'Existing', archivedAt: archived ? new Date() : null },
  });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;
const taskUrl = (projectId: string, taskId: string) => `${tasksUrl(projectId)}/${taskId}`;
const futureDate = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
const code = (res: { body: unknown }) => (res.body as ErrorBody).error.code;

async function setup() {
  const member = await makeUser('member@example.com');
  const project = await makeProject();
  await join(project.id, member.id);
  return { member, project };
}

describe('Create task', () => {
  it('Member creates a task', async () => {
    const { member, project } = await setup();
    const dueDate = futureDate();

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send({ title: 'Write tests', description: 'details', dueDate });

    expect(res.status).toBe(201);
    const body = res.body as TaskBody;
    expect(body.title).toBe('Write tests');
    expect(body.description).toBe('details');
    expect(body.projectId).toBe(project.id);
    expect(body.createdById).toBe(member.id);
    expect(body.status).toBe('TODO');
    expect(body.priority).toBe('MEDIUM');
    expect(new Date(body.dueDate as string).toISOString()).toBe(dueDate);
    expect(await prisma.task.count()).toBe(1);
  });

  it('Member creates a task with an explicit priority and a member assignee', async () => {
    const { member, project } = await setup();
    const other = await makeUser('other@example.com');
    await join(project.id, other.id);

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send({ title: 'Assigned', priority: 'HIGH', assigneeId: other.id });

    expect(res.status).toBe(201);
    const body = res.body as TaskBody;
    expect(body.priority).toBe('HIGH');
    expect(body.assigneeId).toBe(other.id);
  });

  it.each([
    ['an empty title', { title: '' }],
    ['an over-long title', { title: 'x'.repeat(201) }],
    ['an unknown priority', { title: 'T', priority: 'CRITICAL' }],
    ['a status field', { title: 'T', status: 'DONE' }],
    ['a date-only dueDate', { title: 'T', dueDate: '2099-01-01' }],
    ['a dueDate with an offset', { title: 'T', dueDate: '2099-01-01T10:00:00+02:00' }],
  ])('Invalid input is rejected: %s', async (_label, payload) => {
    const { member, project } = await setup();

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send(payload);

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
    expect(await prisma.task.count()).toBe(0);
  });

  it('Past due date on create is 400 VALIDATION_ERROR', async () => {
    const { member, project } = await setup();

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send({ title: 'Late', dueDate: new Date(Date.now() - 24 * 3600 * 1000).toISOString() });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
    expect(await prisma.task.count()).toBe(0);
  });

  it('Assignee who is a registered non-member is 400 ASSIGNEE_NOT_MEMBER', async () => {
    const { member, project } = await setup();
    const outsider = await makeUser('outsider@example.com');

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send({ title: 'T', assigneeId: outsider.id });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('ASSIGNEE_NOT_MEMBER');
    expect(await prisma.task.count()).toBe(0);
  });

  it('Assignee who is an unknown user is 400 ASSIGNEE_NOT_MEMBER', async () => {
    const { member, project } = await setup();

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send({ title: 'T', assigneeId: unknownId });

    expect(res.status).toBe(400);
    expect(code(res)).toBe('ASSIGNEE_NOT_MEMBER');
    expect(await prisma.task.count()).toBe(0);
  });

  it('Non-member is denied with 404 PROJECT_NOT_FOUND', async () => {
    const outsider = await makeUser('outsider@example.com');
    const project = await makeProject();

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(outsider))
      .send({ title: 'T' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
    expect(await prisma.task.count()).toBe(0);
  });

  it('Nonexistent project is 404 PROJECT_NOT_FOUND', async () => {
    const user = await makeUser('user@example.com');

    const res = await request(app)
      .post(tasksUrl(unknownId))
      .set('Authorization', bearer(user))
      .send({ title: 'T' });

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
    expect(await prisma.task.count()).toBe(0);
  });

  it('Archived project rejects new tasks with 409 PROJECT_ARCHIVED', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject(true);
    await join(project.id, member.id);

    const res = await request(app)
      .post(tasksUrl(project.id))
      .set('Authorization', bearer(member))
      .send({ title: 'T' });

    expect(res.status).toBe(409);
    expect(code(res)).toBe('PROJECT_ARCHIVED');
  });

  it('Unauthenticated create is 401', async () => {
    const project = await makeProject();

    const res = await request(app).post(tasksUrl(project.id)).send({ title: 'T' });

    expect(res.status).toBe(401);
  });
});

describe('View task', () => {
  it('Member views a task', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    const res = await request(app)
      .get(taskUrl(project.id, task.id))
      .set('Authorization', bearer(member));

    expect(res.status).toBe(200);
    const body = res.body as TaskBody;
    expect(body.id).toBe(task.id);
    expect(body.title).toBe('Existing');
    expect(body.status).toBe('TODO');
  });

  it('Member views an archived task', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, true);

    const res = await request(app)
      .get(taskUrl(project.id, task.id))
      .set('Authorization', bearer(member));

    expect(res.status).toBe(200);
    expect((res.body as TaskBody).archivedAt).not.toBeNull();
  });

  it('Non-member gets 404 PROJECT_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);
    const outsider = await makeUser('outsider@example.com');

    const res = await request(app)
      .get(taskUrl(project.id, task.id))
      .set('Authorization', bearer(outsider));

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Unknown task id is 404 TASK_NOT_FOUND', async () => {
    const { member, project } = await setup();

    const res = await request(app)
      .get(taskUrl(project.id, unknownId))
      .set('Authorization', bearer(member));

    expect(res.status).toBe(404);
    expect(code(res)).toBe('TASK_NOT_FOUND');
  });

  it('Task of another project is 404 TASK_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const other = await makeProject();
    await join(other.id, member.id);
    const foreign = await makeTask(other.id, member.id);

    const res = await request(app)
      .get(taskUrl(project.id, foreign.id))
      .set('Authorization', bearer(member));

    expect(res.status).toBe(404);
    expect(code(res)).toBe('TASK_NOT_FOUND');
  });

  it('Non-UUID taskId is 400 VALIDATION_ERROR', async () => {
    const { member, project } = await setup();

    const res = await request(app)
      .get(taskUrl(project.id, 'not-a-uuid'))
      .set('Authorization', bearer(member));

    expect(res.status).toBe(400);
    expect(code(res)).toBe('VALIDATION_ERROR');
  });
});
