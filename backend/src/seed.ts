import { hash } from '@node-rs/argon2';
import type { PrismaClient } from './db.js';
import type { ActivityAction } from './generated/prisma/enums.js';

type Env = Record<string, string | undefined>;

const DAY_MS = 24 * 60 * 60 * 1000;

// Fixed ids make every upsert target the same row, so re-running the seed creates nothing new.
const id = (n: number): string => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const ALICE = { id: id(1), email: 'alice@demo.example', name: 'Alice Demo' };
const BOB = { id: id(2), email: 'bob@demo.example', name: 'Bob Demo' };
const PROJECT_ID = id(10);

const TASKS = [
  {
    n: 20,
    title: 'Draft the project brief',
    status: 'TODO',
    priority: 'LOW',
    owner: BOB,
    days: 14,
  },
  {
    n: 21,
    title: 'Build the login page',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    owner: BOB,
    days: 7,
  },
  {
    n: 22,
    title: 'Review the API contract',
    status: 'IN_REVIEW',
    priority: 'HIGH',
    owner: ALICE,
    days: 3,
  },
  {
    n: 23,
    title: 'Fix the deployment script',
    status: 'DONE',
    priority: 'URGENT',
    owner: ALICE,
    days: -1,
  },
] as const;

const COMMENTS = [
  { n: 30, taskN: 21, author: ALICE, body: 'Please follow the design in the SDS.' },
  { n: 31, taskN: 21, author: BOB, body: 'On it, the form validation is next.' },
] as const;

export function assertSeedAllowed(env: Env): string {
  const password = env['SEED_DEMO_PASSWORD'];
  if (password === undefined || password === '') {
    throw new Error('Missing required environment variable SEED_DEMO_PASSWORD');
  }
  if (env['NODE_ENV'] === 'production' && env['SEED_DEMO_DATA'] !== 'true') {
    throw new Error('Refusing to seed demo data in production unless SEED_DEMO_DATA=true');
  }
  return password;
}

export async function seedDemoData(prisma: PrismaClient, env: Env): Promise<void> {
  const password = assertSeedAllowed(env);
  const passwordHash = await hash(password);
  const now = Date.now();

  for (const user of [ALICE, BOB]) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: { ...user, passwordHash },
      update: { name: user.name, passwordHash },
    });
  }

  await prisma.project.upsert({
    where: { id: PROJECT_ID },
    create: {
      id: PROJECT_ID,
      name: 'Demo Project',
      description: 'Sample project created by the demo seed.',
    },
    update: {},
  });

  for (const [user, role] of [
    [ALICE, 'OWNER'],
    [BOB, 'MEMBER'],
  ] as const) {
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: PROJECT_ID, userId: user.id } },
      create: { projectId: PROJECT_ID, userId: user.id, role },
      update: { role },
    });
  }

  for (const task of TASKS) {
    await prisma.task.upsert({
      where: { id: id(task.n) },
      create: {
        id: id(task.n),
        projectId: PROJECT_ID,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: new Date(now + task.days * DAY_MS),
        assigneeId: task.owner.id,
        createdById: ALICE.id,
      },
      update: {},
    });
    const events: { action: ActivityAction; metadata: Record<string, string | null> }[] = [
      {
        action: 'TASK_CREATED',
        metadata: { title: task.title, priority: task.priority, assigneeId: task.owner.id },
      },
      { action: 'TASK_ASSIGNED', metadata: { from: null, to: task.owner.id } },
    ];
    if (task.status !== 'TODO') {
      events.push({ action: 'TASK_STATUS_CHANGED', metadata: { from: 'TODO', to: task.status } });
    }
    for (const [index, event] of events.entries()) {
      const activityId = id(task.n * 10 + index);
      await prisma.activity.upsert({
        where: { id: activityId },
        create: {
          id: activityId,
          taskId: id(task.n),
          actorId: ALICE.id,
          action: event.action,
          metadata: event.metadata,
        },
        update: {},
      });
    }
  }

  for (const comment of COMMENTS) {
    await prisma.comment.upsert({
      where: { id: id(comment.n) },
      create: {
        id: id(comment.n),
        taskId: id(comment.taskN),
        authorId: comment.author.id,
        body: comment.body,
      },
      update: {},
    });
  }
}
