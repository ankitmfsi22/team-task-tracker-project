// Spec: tasks (DEV-1009 task 2.3) -- "Sort tasks".
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
  id?: string;
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

async function makeUser(email: string, name: string): Promise<Actor> {
  const reg = await request(app).post('/api/v1/auth/register').send({ email, name, password });
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
  const member = await makeUser('member@example.com', 'Member');
  const project = await prisma.project.create({ data: { name: 'P' } });
  await prisma.projectMember.create({
    data: { projectId: project.id, userId: member.id, role: 'MEMBER' },
  });
  return { member, project };
}

// Deterministic UUIDs so id tie-breaks are known and differ from createdAt order.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const ids = (res: { body: unknown }) => (res.body as ListBody).data.map((t) => t.id);
const titles = (res: { body: unknown }) => (res.body as ListBody).data.map((t) => t.title);

describe('Sort tasks', () => {
  it('Default order without sortBy is createdAt descending', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'old', 1, { priority: 'URGENT' });
    await makeTask(project.id, member.id, 'mid', 2, { priority: 'LOW' });
    await makeTask(project.id, member.id, 'new', 3, { priority: 'HIGH' });

    const res = await list(project.id, member);

    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['new', 'mid', 'old']);
  });

  describe('priority', () => {
    async function seed() {
      const { member, project } = await setup();
      await makeTask(project.id, member.id, 'MEDIUM', 1, { priority: 'MEDIUM' });
      await makeTask(project.id, member.id, 'URGENT', 2, { priority: 'URGENT' });
      await makeTask(project.id, member.id, 'LOW', 3, { priority: 'LOW' });
      await makeTask(project.id, member.id, 'HIGH', 4, { priority: 'HIGH' });
      return { member, project };
    }

    it('Sort by priority desc: URGENT first, LOW last', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=priority&sortOrder=desc');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['URGENT', 'HIGH', 'MEDIUM', 'LOW']);
    });

    it('Sort by priority asc (explicit): LOW first, URGENT last', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=priority&sortOrder=asc');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
    });

    it('sortOrder defaults to asc', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=priority');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
    });
  });

  it('Sort by status asc uses enum order, not alphabetical', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'IN_REVIEW', 1, { status: 'IN_REVIEW' });
    await makeTask(project.id, member.id, 'TODO', 2, { status: 'TODO' });
    await makeTask(project.id, member.id, 'DONE', 3, { status: 'DONE' });
    await makeTask(project.id, member.id, 'IN_PROGRESS', 4, { status: 'IN_PROGRESS' });

    const res = await list(project.id, member, '?sortBy=status&sortOrder=asc');

    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
  });

  describe('dueDate', () => {
    async function seed() {
      const { member, project } = await setup();
      // Created newest-last; nulls have ids 1 and 2, dated tasks have ids 3..5.
      await makeTask(project.id, member.id, 'none-b', 1, { id: uuid(2) });
      await makeTask(project.id, member.id, 'mar2', 2, {
        id: uuid(3),
        dueDate: new Date('2026-03-02T00:00:00.000Z'),
      });
      await makeTask(project.id, member.id, 'none-a', 3, { id: uuid(1) });
      await makeTask(project.id, member.id, 'mar3', 4, {
        id: uuid(4),
        dueDate: new Date('2026-03-03T00:00:00.000Z'),
      });
      await makeTask(project.id, member.id, 'mar1', 5, {
        id: uuid(5),
        dueDate: new Date('2026-03-01T00:00:00.000Z'),
      });
      return { member, project };
    }

    it('Sort by dueDate asc: earliest first, no dueDate last', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=dueDate&sortOrder=asc');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['mar1', 'mar2', 'mar3', 'none-a', 'none-b']);
    });

    it('Sort by dueDate desc: latest first, no dueDate still last', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=dueDate&sortOrder=desc');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['mar3', 'mar2', 'mar1', 'none-a', 'none-b']);
    });
  });

  describe('assignee', () => {
    async function seed() {
      const { member, project } = await setup();
      const alice = await makeUser('alice@example.com', 'Alice');
      const bruno = await makeUser('bruno@example.com', 'Bruno');
      const cara = await makeUser('cara@example.com', 'Cara');
      for (const u of [alice, bruno, cara]) {
        await prisma.projectMember.create({
          data: { projectId: project.id, userId: u.id, role: 'MEMBER' },
        });
      }
      // Assignee ids are random; display-name order (Alice < Bruno < Cara) differs from
      // creation order and from the default createdAt-desc order.
      await makeTask(project.id, member.id, 'unassigned-b', 1, { id: uuid(2) });
      await makeTask(project.id, member.id, 'cara', 2, { assigneeId: cara.id });
      await makeTask(project.id, member.id, 'alice', 3, { assigneeId: alice.id });
      await makeTask(project.id, member.id, 'unassigned-a', 4, { id: uuid(1) });
      await makeTask(project.id, member.id, 'bruno', 5, { assigneeId: bruno.id });
      return { member, project };
    }

    it('Sort by assignee asc: by display name, unassigned last', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=assignee&sortOrder=asc');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['alice', 'bruno', 'cara', 'unassigned-a', 'unassigned-b']);
    });

    it('Sort by assignee desc: by display name descending, unassigned still last', async () => {
      const { member, project } = await seed();

      const res = await list(project.id, member, '?sortBy=assignee&sortOrder=desc');

      expect(res.status).toBe(200);
      expect(titles(res)).toEqual(['cara', 'bruno', 'alice', 'unassigned-a', 'unassigned-b']);
    });

    it.each([
      ['asc', ['alice', 'bruno', 'cara']],
      ['desc', ['cara', 'bruno', 'alice']],
    ])(
      'Paging by assignee (%s) spans the assigned/unassigned boundary without gaps or duplicates',
      async (order, assignedTitles) => {
        const { member, project } = await setup();
        const alice = await makeUser('alice@example.com', 'Alice');
        const bruno = await makeUser('bruno@example.com', 'Bruno');
        const cara = await makeUser('cara@example.com', 'Cara');
        for (const u of [alice, bruno, cara]) {
          await prisma.projectMember.create({
            data: { projectId: project.id, userId: u.id, role: 'MEMBER' },
          });
        }
        await makeTask(project.id, member.id, 'unassigned-c', 1, { id: uuid(3) });
        await makeTask(project.id, member.id, 'cara', 2, { assigneeId: cara.id });
        await makeTask(project.id, member.id, 'unassigned-a', 3, { id: uuid(1) });
        await makeTask(project.id, member.id, 'alice', 4, { assigneeId: alice.id });
        await makeTask(project.id, member.id, 'unassigned-b', 5, { id: uuid(2) });
        await makeTask(project.id, member.id, 'bruno', 6, { assigneeId: bruno.id });
        const expected = [...assignedTitles, 'unassigned-a', 'unassigned-b', 'unassigned-c'];
        const query = (page: number) =>
          `?sortBy=assignee&sortOrder=${order}&page=${page}&pageSize=4`;

        const p1 = await list(project.id, member, query(1));
        const p2 = await list(project.id, member, query(2));
        const p3 = await list(project.id, member, query(3));

        expect(p1.status).toBe(200);
        expect(p2.status).toBe(200);
        expect(p3.status).toBe(200);
        expect(titles(p1)).toEqual([...assignedTitles, 'unassigned-a']);
        expect(titles(p2)).toEqual(['unassigned-b', 'unassigned-c']);
        expect([...titles(p1), ...titles(p2)]).toEqual(expected);
        expect(new Set([...ids(p1), ...ids(p2)]).size).toBe(6);
        for (const res of [p1, p2]) {
          expect((res.body as ListBody).meta.total).toBe(6);
          expect((res.body as ListBody).meta.totalPages).toBe(2);
        }
        expect((p3.body as ListBody).data).toEqual([]);
        expect((p3.body as ListBody).meta.total).toBe(6);
      },
    );
  });

  it('Ties are broken by id ascending and are stable across pages', async () => {
    const { member, project } = await setup();
    // Ids ascend with createdAt, so the default createdAt-desc order is id descending.
    for (let i = 1; i <= 5; i += 1) {
      await makeTask(project.id, member.id, `t${i}`, i, { id: uuid(i), priority: 'HIGH' });
    }
    const expected = [uuid(1), uuid(2), uuid(3), uuid(4), uuid(5)];

    const full = await list(project.id, member, '?sortBy=priority&sortOrder=desc');
    const p1 = await list(project.id, member, '?sortBy=priority&sortOrder=desc&page=1&pageSize=2');
    const p2 = await list(project.id, member, '?sortBy=priority&sortOrder=desc&page=2&pageSize=2');
    const p3 = await list(project.id, member, '?sortBy=priority&sortOrder=desc&page=3&pageSize=2');

    expect(ids(full)).toEqual(expected);
    expect([...ids(p1), ...ids(p2), ...ids(p3)]).toEqual(expected);
    expect(new Set([...ids(p1), ...ids(p2), ...ids(p3)]).size).toBe(5);
  });

  it('Sorting combines with a filter', async () => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'todo-low', 1, { status: 'TODO', priority: 'LOW' });
    await makeTask(project.id, member.id, 'done-urgent', 2, { status: 'DONE', priority: 'URGENT' });
    await makeTask(project.id, member.id, 'todo-urgent', 3, { status: 'TODO', priority: 'URGENT' });
    await makeTask(project.id, member.id, 'todo-medium', 4, { status: 'TODO', priority: 'MEDIUM' });

    const res = await list(project.id, member, '?status=TODO&sortBy=priority&sortOrder=desc');

    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['todo-urgent', 'todo-medium', 'todo-low']);
    expect((res.body as ListBody).meta.total).toBe(3);
  });

  it.each([['sortBy=title'], ['sortOrder=up']])('Invalid sort is rejected: %s', async (query) => {
    const { member, project } = await setup();
    await makeTask(project.id, member.id, 'task', 1);

    const res = await list(project.id, member, `?${query}`);

    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
    expect(res.body).not.toHaveProperty('data');
  });
});
