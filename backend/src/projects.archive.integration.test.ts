// Spec: projects (DEV-1007 task 2.2) -- Archive project and read-only archived projects.
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ProjectDetailResponseSchema,
  ProjectListResponseSchema,
  ProjectResponseSchema,
} from '@team-task-tracker/shared';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const password = 'correct-horse-9';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
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
    'TRUNCATE TABLE "ProjectMember", "Project", "RefreshToken", "User" CASCADE',
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

const bearer = (a: Actor) => `Bearer ${a.token}`;

const join = (projectId: string, userId: string, role: 'OWNER' | 'MEMBER') =>
  prisma.projectMember.create({ data: { projectId, userId, role } });

async function ownedProject(owner: Actor, name = 'Alpha', archived = false) {
  const project = await prisma.project.create({
    data: { name, archivedAt: archived ? new Date() : null },
  });
  await join(project.id, owner.id, 'OWNER');
  return project;
}

const code = (body: unknown) => (body as ErrorBody).error.code;

const archive = (projectId: string, actor: Actor) =>
  request(app).post(`/api/v1/projects/${projectId}/archive`).set('Authorization', bearer(actor));

describe('Archive project', () => {
  it('Owner archives: 200 with archivedAt, hidden from default list, shown with includeArchived', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);

    const res = await archive(project.id, owner);

    expect(res.status).toBe(200);
    const body = ProjectResponseSchema.parse(res.body);
    expect(body.id).toBe(project.id);
    expect(body.archivedAt).not.toBeNull();
    const stored = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stored?.archivedAt).not.toBeNull();

    const hidden = await request(app).get('/api/v1/projects').set('Authorization', bearer(owner));
    expect(hidden.status).toBe(200);
    expect(ProjectListResponseSchema.parse(hidden.body).data).toHaveLength(0);

    const shown = await request(app)
      .get('/api/v1/projects?includeArchived=true')
      .set('Authorization', bearer(owner));
    expect(shown.status).toBe(200);
    expect(ProjectListResponseSchema.parse(shown.body).data.map((p) => p.id)).toEqual([project.id]);
  });

  it('Member is forbidden to archive: 403 FORBIDDEN and the project is not archived', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await archive(project.id, member);

    expect(res.status).toBe(403);
    expect(code(res.body)).toBe('FORBIDDEN');
    const stored = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stored?.archivedAt).toBeNull();
  });

  it('Non-member gets 404 PROJECT_NOT_FOUND and the project is not archived', async () => {
    const owner = await makeUser('owner@example.com');
    const outsider = await makeUser('outsider@example.com');
    const project = await ownedProject(owner);

    const res = await archive(project.id, outsider);

    expect(res.status).toBe(404);
    expect(code(res.body)).toBe('PROJECT_NOT_FOUND');
    const stored = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stored?.archivedAt).toBeNull();
  });

  it('Archived project is read-only: update and re-archive are 409 PROJECT_ARCHIVED, GET still 200', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner, 'Alpha', true);

    const update = await request(app)
      .patch(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Renamed' });
    expect(update.status).toBe(409);
    expect(code(update.body)).toBe('PROJECT_ARCHIVED');

    const again = await archive(project.id, owner);
    expect(again.status).toBe(409);
    expect(code(again.body)).toBe('PROJECT_ARCHIVED');

    const get = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(owner));
    expect(get.status).toBe(200);
    expect(ProjectDetailResponseSchema.parse(get.body).id).toBe(project.id);

    const stored = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stored?.name).toBe('Alpha');
  });
});
