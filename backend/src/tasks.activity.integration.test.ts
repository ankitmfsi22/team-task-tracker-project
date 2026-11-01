// Spec: activity (DEV-1010 task 3.1) -- "Record activity on task changes".
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const password = 'correct-horse-9';

interface TaskBody {
  id: string;
  status: string;
  assigneeId: string | null;
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
    'TRUNCATE TABLE "Activity", "Task", "ProjectMember", "Project", "RefreshToken", "User" CASCADE',
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

type Status = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

const makeTask = (
  projectId: string,
  createdById: string,
  extra: { archived?: boolean; status?: Status; assigneeId?: string } = {},
) =>
  prisma.task.create({
    data: {
      projectId,
      createdById,
      title: 'Existing',
      description: 'desc',
      priority: 'LOW',
      status: extra.status ?? 'TODO',
      assigneeId: extra.assigneeId ?? null,
      archivedAt: extra.archived ? new Date() : null,
    },
  });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const tasksUrl = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;
const taskUrl = (projectId: string, taskId: string) => `${tasksUrl(projectId)}/${taskId}`;

const create = (projectId: string, actor: Actor, body: object) =>
  request(app).post(tasksUrl(projectId)).set('Authorization', bearer(actor)).send(body);

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

const archive = (projectId: string, taskId: string, actor: Actor) =>
  request(app)
    .post(`${taskUrl(projectId, taskId)}/archive`)
    .set('Authorization', bearer(actor));

const patchTask = (projectId: string, taskId: string, actor: Actor, body: object) =>
  request(app).patch(taskUrl(projectId, taskId)).set('Authorization', bearer(actor)).send(body);

const activityOf = (taskId: string) =>
  prisma.activity.findMany({ where: { taskId }, orderBy: { createdAt: 'asc' } });

const activityCount = () => prisma.activity.count();

async function setup() {
  const member = await makeUser('member@example.com');
  const project = await makeProject();
  await join(project.id, member.id);
  return { member, project };
}

describe('Record activity on task changes', () => {
  it('Creation, assignment, status change and archive are recorded', async () => {
    const { member, project } = await setup();
    const other = await makeUser('other@example.com');
    await join(project.id, other.id);

    const created = await create(project.id, member, { title: 'Write docs', priority: 'HIGH' });
    expect(created.status).toBe(201);
    const taskId = (created.body as TaskBody).id;

    expect((await assign(project.id, taskId, member, { assigneeId: other.id })).status).toBe(200);
    expect((await setStatus(project.id, taskId, member, { status: 'IN_PROGRESS' })).status).toBe(
      200,
    );
    expect((await archive(project.id, taskId, member)).status).toBe(200);

    const entries = await activityOf(taskId);
    expect(entries.map((e) => e.action)).toEqual([
      'TASK_CREATED',
      'TASK_ASSIGNED',
      'TASK_STATUS_CHANGED',
      'TASK_ARCHIVED',
    ]);
    expect(entries.map((e) => e.metadata)).toEqual([
      { title: 'Write docs', priority: 'HIGH', assigneeId: null },
      { from: null, to: other.id },
      { from: 'TODO', to: 'IN_PROGRESS' },
      {},
    ]);
    for (const entry of entries) {
      expect(entry.actorId).toBe(member.id);
      expect(entry.createdAt).toBeInstanceOf(Date);
    }
  });

  it('Creation with an assignee records one entry', async () => {
    const { member, project } = await setup();
    const other = await makeUser('other@example.com');
    await join(project.id, other.id);

    const created = await create(project.id, member, {
      title: 'With assignee',
      priority: 'LOW',
      assigneeId: other.id,
    });
    expect(created.status).toBe(201);

    const entries = await activityOf((created.body as TaskBody).id);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.action).toBe('TASK_CREATED');
    expect(entries[0]?.metadata).toMatchObject({ assigneeId: other.id });
  });

  it('Unassign records TASK_ASSIGNED to null and unchanged assignment records nothing', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id, { assigneeId: member.id });

    const unassigned = await assign(project.id, task.id, member, { assigneeId: null });
    expect(unassigned.status).toBe(200);

    const afterUnassign = await activityOf(task.id);
    expect(afterUnassign).toHaveLength(1);
    expect(afterUnassign[0]?.action).toBe('TASK_ASSIGNED');
    expect(afterUnassign[0]?.metadata).toEqual({ from: member.id, to: null });
    expect(afterUnassign[0]?.actorId).toBe(member.id);

    const again = await assign(project.id, task.id, member, { assigneeId: member.id });
    expect(again.status).toBe(200);
    const unchanged = await assign(project.id, task.id, member, { assigneeId: member.id });
    expect(unchanged.status).toBe(200);

    // Only the unassign and the first re-assignment (null -> member) are changes.
    const entries = await activityOf(task.id);
    expect(entries).toHaveLength(2);
    expect(entries[1]?.metadata).toEqual({ from: null, to: member.id });
  });

  it('Rejected changes and other edits record nothing', async () => {
    const { member, project } = await setup();
    const outsider = await makeUser('outsider@example.com');
    const task = await makeTask(project.id, member.id);
    const archivedTask = await makeTask(project.id, member.id, { archived: true });

    const invalid = await setStatus(project.id, task.id, member, { status: 'DONE' });
    expect(invalid.status).toBe(409);

    const notMember = await assign(project.id, task.id, member, { assigneeId: outsider.id });
    expect(notMember.status).toBe(400);

    const denied = await setStatus(project.id, task.id, outsider, { status: 'IN_PROGRESS' });
    expect(denied.status).toBe(404);

    const onArchived = await setStatus(project.id, archivedTask.id, member, {
      status: 'IN_PROGRESS',
    });
    expect(onArchived.status).toBe(409);

    const titled = await patchTask(project.id, task.id, member, { title: 'Renamed' });
    expect(titled.status).toBe(200);

    expect(await activityCount()).toBe(0);
  });
});

describe('Change and entry are atomic', () => {
  const failInsert = async () => {
    await prisma.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION activity_fail() RETURNS trigger AS $$
       BEGIN RAISE EXCEPTION 'activity insert blocked for test'; END;
       $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER activity_fail_trg BEFORE INSERT ON "Activity" FOR EACH ROW EXECUTE FUNCTION activity_fail()',
    );
  };
  const restoreInsert = async () => {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS activity_fail_trg ON "Activity"');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS activity_fail()');
  };

  it('Failing activity write during a status change keeps the previous status', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    await failInsert();
    try {
      const res = await setStatus(project.id, task.id, member, { status: 'IN_PROGRESS' });
      expect(res.status).toBe(500);
    } finally {
      await restoreInsert();
    }

    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.status).toBe('TODO');
    expect(await activityOf(task.id)).toHaveLength(0);
  });

  it('Failing activity write during an archive keeps the task unarchived', async () => {
    const { member, project } = await setup();
    const task = await makeTask(project.id, member.id);

    await failInsert();
    try {
      const res = await archive(project.id, task.id, member);
      expect(res.status).toBe(500);
    } finally {
      await restoreInsert();
    }

    const stored = await prisma.task.findUniqueOrThrow({ where: { id: task.id } });
    expect(stored.archivedAt).toBeNull();
    expect(await activityOf(task.id)).toHaveLength(0);
  });
});
