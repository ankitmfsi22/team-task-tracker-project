// Spec: projects (DEV-1007 task 2.1) -- Create, List, View and Update project.
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
const missingId = '00000000-0000-4000-8000-000000000000';

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

const makeProject = (name: string, archived = false) =>
  prisma.project.create({ data: { name, archivedAt: archived ? new Date() : null } });

const join = (projectId: string, userId: string, role: 'OWNER' | 'MEMBER') =>
  prisma.projectMember.create({ data: { projectId, userId, role } });

async function ownedProject(owner: Actor, name = 'Alpha', archived = false) {
  const project = await makeProject(name, archived);
  await join(project.id, owner.id, 'OWNER');
  return project;
}

const code = (body: unknown) => (body as ErrorBody).error.code;

describe('Create project', () => {
  it('Creator becomes owner', async () => {
    const user = await makeUser('owner@example.com');

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', bearer(user))
      .send({ name: 'Alpha', description: 'First project' });

    expect(res.status).toBe(201);
    const project = ProjectResponseSchema.parse(res.body);
    expect(project.name).toBe('Alpha');
    expect(project.description).toBe('First project');
    expect(project.archivedAt).toBeNull();

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
    });
    expect(membership?.role).toBe('OWNER');
  });

  it('Invalid input is rejected: empty name', async () => {
    const user = await makeUser('owner@example.com');
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', bearer(user))
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
    expect(await prisma.project.count()).toBe(0);
  });

  it('Invalid input is rejected: name over 100 characters', async () => {
    const user = await makeUser('owner@example.com');
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', bearer(user))
      .send({ name: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
    expect(await prisma.project.count()).toBe(0);
  });

  it('Invalid input is rejected: no body', async () => {
    const user = await makeUser('owner@example.com');
    const res = await request(app).post('/api/v1/projects').set('Authorization', bearer(user));
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
    expect(await prisma.project.count()).toBe(0);
  });

  it('Unauthenticated request', async () => {
    const res = await request(app).post('/api/v1/projects').send({ name: 'Alpha' });
    expect(res.status).toBe(401);
    expect(await prisma.project.count()).toBe(0);
  });
});

describe('List projects', () => {
  it('Only own projects are listed', async () => {
    const alice = await makeUser('alice@example.com');
    const bob = await makeUser('bob@example.com');
    const mine = await ownedProject(alice, 'Mine');
    await ownedProject(bob, 'Theirs');

    const res = await request(app).get('/api/v1/projects').set('Authorization', bearer(alice));

    expect(res.status).toBe(200);
    const body = ProjectListResponseSchema.parse(res.body);
    expect(body.data.map((p) => p.id)).toEqual([mine.id]);
    expect(body.meta).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 });
  });

  it('Archived projects are hidden by default', async () => {
    const user = await makeUser('owner@example.com');
    const active = await ownedProject(user, 'Active');
    const archived = await ownedProject(user, 'Old', true);

    const hidden = await request(app).get('/api/v1/projects').set('Authorization', bearer(user));
    expect(hidden.status).toBe(200);
    expect(ProjectListResponseSchema.parse(hidden.body).data.map((p) => p.id)).toEqual([active.id]);

    const shown = await request(app)
      .get('/api/v1/projects?includeArchived=true')
      .set('Authorization', bearer(user));
    expect(shown.status).toBe(200);
    const ids = ProjectListResponseSchema.parse(shown.body).data.map((p) => p.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(active.id);
    expect(ids).toContain(archived.id);
  });

  it('Invalid pagination is rejected: pageSize=101', async () => {
    const user = await makeUser('owner@example.com');
    const res = await request(app)
      .get('/api/v1/projects?pageSize=101')
      .set('Authorization', bearer(user));
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
  });

  it('Invalid pagination is rejected: page=0', async () => {
    const user = await makeUser('owner@example.com');
    const res = await request(app)
      .get('/api/v1/projects?page=0')
      .set('Authorization', bearer(user));
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
  });
});

describe('View project', () => {
  it('Member views project: OWNER and MEMBER get the project and their role', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const asOwner = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(owner));
    expect(asOwner.status).toBe(200);
    const ownerView = ProjectDetailResponseSchema.parse(asOwner.body);
    expect(ownerView.id).toBe(project.id);
    expect(ownerView.role).toBe('OWNER');

    const asMember = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(member));
    expect(asMember.status).toBe(200);
    expect(ProjectDetailResponseSchema.parse(asMember.body).role).toBe('MEMBER');
  });

  it('Non-member gets 404 PROJECT_NOT_FOUND, identical to a nonexistent project', async () => {
    const owner = await makeUser('owner@example.com');
    const outsider = await makeUser('outsider@example.com');
    const project = await ownedProject(owner);

    const nonMember = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(outsider));
    const missing = await request(app)
      .get(`/api/v1/projects/${missingId}`)
      .set('Authorization', bearer(outsider));

    expect(nonMember.status).toBe(404);
    expect(code(nonMember.body)).toBe('PROJECT_NOT_FOUND');
    expect(nonMember.body).toEqual(missing.body);
  });

  it('Nonexistent id is 404', async () => {
    const user = await makeUser('user@example.com');
    const res = await request(app)
      .get(`/api/v1/projects/${missingId}`)
      .set('Authorization', bearer(user));
    expect(res.status).toBe(404);
    expect(code(res.body)).toBe('PROJECT_NOT_FOUND');
  });

  it('Malformed id is 400 VALIDATION_ERROR', async () => {
    const user = await makeUser('user@example.com');
    const res = await request(app)
      .get('/api/v1/projects/not-a-uuid')
      .set('Authorization', bearer(user));
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
  });
});

describe('Update project', () => {
  it('Owner updates name and description', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);

    const res = await request(app)
      .patch(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(owner))
      .send({ name: 'Renamed', description: 'New text' });

    expect(res.status).toBe(200);
    const updated = ProjectResponseSchema.parse(res.body);
    expect(updated.id).toBe(project.id);
    expect(updated.name).toBe('Renamed');
    expect(updated.description).toBe('New text');
  });

  it('Member is forbidden: 403 FORBIDDEN and the project is unchanged', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner, 'Alpha');
    await join(project.id, member.id, 'MEMBER');

    const res = await request(app)
      .patch(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(member))
      .send({ name: 'Hacked' });

    expect(res.status).toBe(403);
    expect(code(res.body)).toBe('FORBIDDEN');
    const stored = await prisma.project.findUnique({ where: { id: project.id } });
    expect(stored?.name).toBe('Alpha');
  });

  it('Invalid update is rejected: empty name', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);
    const res = await request(app)
      .patch(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(owner))
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
  });

  it('Invalid update is rejected: empty body', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);
    const res = await request(app)
      .patch(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(owner))
      .send({});
    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
  });
});
