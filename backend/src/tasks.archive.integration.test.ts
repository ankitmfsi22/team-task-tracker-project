// Spec: tasks (DEV-1008 task 2.4) -- "Archive task".
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

const archive = (projectId: string, taskId: string, actor: Actor) =>
  request(app)
    .post(`${taskUrl(projectId, taskId)}/archive`)
    .set('Authorization', bearer(actor));

describe('Archive task', () => {
  it.each<['MEMBER' | 'OWNER']>([['MEMBER'], ['OWNER']])(
    'A %s archives a task and it is still readable',
    async (role) => {
      const user = await makeUser('user@example.com');
      const project = await makeProject();
      await join(project.id, user.id, role);
      const task = await makeTask(project.id, user.id);

      const res = await archive(project.id, task.id, user);

      expect(res.status).toBe(200);
      expect((res.body as TaskBody).archivedAt).not.toBeNull();

      const got = await request(app)
        .get(taskUrl(project.id, task.id))
        .set('Authorization', bearer(user));
      expect(got.status).toBe(200);
      expect((got.body as TaskBody).archivedAt).not.toBeNull();
    },
  );

  it('Already archived task is 409 TASK_ARCHIVED', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { archived: true });

    const res = await archive(project.id, task.id, member);

    expect(res.status).toBe(409);
    expect(code(res)).toBe('TASK_ARCHIVED');
  });

  it('Non-member is denied with 404 PROJECT_NOT_FOUND', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);
    const outsider = await makeUser('outsider@example.com');

    const res = await archive(project.id, task.id, outsider);

    expect(res.status).toBe(404);
    expect(code(res)).toBe('PROJECT_NOT_FOUND');
  });

  it('Unknown task is 404 TASK_NOT_FOUND', async () => {
    const { member, project } = await setup();

    const res = await archive(project.id, unknownId, member);

    expect(res.status).toBe(404);
    expect(code(res)).toBe('TASK_NOT_FOUND');
  });

  it('Archived project is 409 PROJECT_ARCHIVED', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject(true);
    await join(project.id, member.id);
    const task = await makeTask(project.id, member.id);

    const res = await archive(project.id, task.id, member);

    expect(res.status).toBe(409);
    expect(code(res)).toBe('PROJECT_ARCHIVED');
  });
});
