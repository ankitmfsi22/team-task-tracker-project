// Spec: demo-seed-data (DEV-1018 task 1.1) -- seed creates demo data, idempotent, safe.
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';
import { seedDemoData } from './seed.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const password = 'correct-horse-9';

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

async function counts() {
  return {
    users: await prisma.user.count(),
    projects: await prisma.project.count(),
    members: await prisma.projectMember.count(),
    tasks: await prisma.task.count(),
    comments: await prisma.comment.count(),
    activity: await prisma.activity.count(),
  };
}

const zeroCounts = {
  users: 0,
  projects: 0,
  members: 0,
  tasks: 0,
  comments: 0,
  activity: 0,
};

describe('demo seed', () => {
  it('Seeded database is usable', async () => {
    await seedDemoData(prisma, { SEED_DEMO_PASSWORD: password });

    const alice = await prisma.user.findUniqueOrThrow({ where: { email: 'alice@demo.example' } });
    const bob = await prisma.user.findUniqueOrThrow({ where: { email: 'bob@demo.example' } });
    const members = await prisma.projectMember.findMany();
    expect(members).toHaveLength(2);
    expect(members.find((m) => m.userId === alice.id)?.role).toBe('OWNER');
    expect(members.find((m) => m.userId === bob.id)?.role).toBe('MEMBER');
    expect(await prisma.project.count()).toBe(1);

    const tasks = await prisma.task.findMany();
    expect(new Set(tasks.map((t) => t.status))).toEqual(
      new Set(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
    );
    expect(new Set(tasks.map((t) => t.priority))).toEqual(
      new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    );
    expect(tasks.every((t) => t.assigneeId !== null && t.dueDate !== null)).toBe(true);

    expect(await prisma.comment.count()).toBeGreaterThanOrEqual(1);
    for (const task of tasks) {
      expect(await prisma.activity.count({ where: { taskId: task.id } })).toBeGreaterThanOrEqual(1);
    }

    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'alice@demo.example', password });
    expect(login.status).toBe(200);
    expect(typeof (login.body as { accessToken: string }).accessToken).toBe('string');
  });

  it('Second run changes nothing', async () => {
    await seedDemoData(prisma, { SEED_DEMO_PASSWORD: password });
    const first = await counts();
    expect(first.users).toBeGreaterThanOrEqual(2);
    expect(first.tasks).toBeGreaterThanOrEqual(4);

    await seedDemoData(prisma, { SEED_DEMO_PASSWORD: password });
    expect(await counts()).toEqual(first);
  });

  it('Missing password is rejected', async () => {
    await expect(seedDemoData(prisma, {})).rejects.toThrow(/SEED_DEMO_PASSWORD/);
    await expect(seedDemoData(prisma, { SEED_DEMO_PASSWORD: '' })).rejects.toThrow(
      /SEED_DEMO_PASSWORD/,
    );
    expect(await counts()).toEqual(zeroCounts);
  });

  it('Production run is denied', async () => {
    await expect(
      seedDemoData(prisma, { NODE_ENV: 'production', SEED_DEMO_PASSWORD: password }),
    ).rejects.toThrow(Error);
    expect(await counts()).toEqual(zeroCounts);
  });

  it('Production run with SEED_DEMO_DATA=true is allowed', async () => {
    await seedDemoData(prisma, {
      NODE_ENV: 'production',
      SEED_DEMO_DATA: 'true',
      SEED_DEMO_PASSWORD: password,
    });
    expect((await counts()).users).toBeGreaterThanOrEqual(2);
  });
});
