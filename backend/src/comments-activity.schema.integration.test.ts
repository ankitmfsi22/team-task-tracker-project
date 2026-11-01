// Spec: comments-activity (DEV-1010 task 1.2) -- Comment and Activity persistence model.
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

let prisma: PrismaClient;

beforeAll(() => {
  prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: inject('testDatabaseUrl') }),
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Task", "ProjectMember", "Project", "RefreshToken", "User" CASCADE',
  );
});

async function seed() {
  const user = await prisma.user.create({
    data: { email: 'author@example.com', name: 'Author', passwordHash: 'x' },
  });
  const project = await prisma.project.create({ data: { name: 'P' } });
  const task = await prisma.task.create({
    data: { projectId: project.id, title: 'T', createdById: user.id },
  });
  const comment = await prisma.comment.create({
    data: { taskId: task.id, authorId: user.id, body: 'hello' },
  });
  const activity = await prisma.activity.create({
    data: {
      taskId: task.id,
      actorId: user.id,
      action: 'TASK_STATUS_CHANGED',
      metadata: { from: 'TODO', to: 'IN_PROGRESS' },
    },
  });
  return { user, project, task, comment, activity };
}

describe('Comment and Activity models', () => {
  it('stores a comment and an activity and round-trips metadata JSON', async () => {
    const { task, user, comment, activity } = await seed();
    const c = await prisma.comment.findUniqueOrThrow({ where: { id: comment.id } });
    expect(c).toMatchObject({ taskId: task.id, authorId: user.id, body: 'hello' });
    expect(c.createdAt).toBeInstanceOf(Date);
    const a = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(a).toMatchObject({
      taskId: task.id,
      actorId: user.id,
      action: 'TASK_STATUS_CHANGED',
      metadata: { from: 'TODO', to: 'IN_PROGRESS' },
    });
  });

  it('cascades deletion of the task (via its project) to comments and activity', async () => {
    const { project, task } = await seed();
    await prisma.project.delete({ where: { id: project.id } });
    expect(await prisma.comment.count({ where: { taskId: task.id } })).toBe(0);
    expect(await prisma.activity.count({ where: { taskId: task.id } })).toBe(0);
  });

  it('rejects deleting a user who authored a comment or acted in an activity', async () => {
    const { user } = await seed();
    await expect(prisma.user.delete({ where: { id: user.id } })).rejects.toThrow();
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });

  it('updates comment updatedAt on update', async () => {
    const { comment } = await seed();
    await new Promise((r) => setTimeout(r, 20));
    const updated = await prisma.comment.update({
      where: { id: comment.id },
      data: { body: 'edited' },
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(comment.updatedAt.getTime());
  });
});
