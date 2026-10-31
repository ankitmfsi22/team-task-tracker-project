// Spec: projects (DEV-1007 task 2.3) -- Project membership and archived read-only members.
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  MemberListResponseSchema,
  MemberResponseSchema,
  ProjectDetailResponseSchema,
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

const base = (projectId: string) => `/api/v1/projects/${projectId}/members`;

const list = (projectId: string, actor: Actor) =>
  request(app).get(base(projectId)).set('Authorization', bearer(actor));

const add = (projectId: string, actor: Actor, body: object) =>
  request(app).post(base(projectId)).set('Authorization', bearer(actor)).send(body);

const remove = (projectId: string, actor: Actor, userId: string) =>
  request(app)
    .delete(`${base(projectId)}/${userId}`)
    .set('Authorization', bearer(actor));

const memberCount = (projectId: string) => prisma.projectMember.count({ where: { projectId } });

describe('Add member', () => {
  it('Owner adds by email: 201 with member, default MEMBER, and the user can view the project', async () => {
    const owner = await makeUser('owner@example.com');
    const invitee = await makeUser('invitee@example.com');
    const project = await ownedProject(owner);

    const res = await add(project.id, owner, { email: 'invitee@example.com' });

    expect(res.status).toBe(201);
    const body = MemberResponseSchema.parse(res.body);
    expect(body).toMatchObject({
      userId: invitee.id,
      email: 'invitee@example.com',
      name: 'Test User',
      role: 'MEMBER',
    });
    const get = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(invitee));
    expect(get.status).toBe(200);
    expect(ProjectDetailResponseSchema.parse(get.body).id).toBe(project.id);
  });

  it('Owner can add with role OWNER', async () => {
    const owner = await makeUser('owner@example.com');
    const invitee = await makeUser('invitee@example.com');
    const project = await ownedProject(owner);

    const res = await add(project.id, owner, { email: 'invitee@example.com', role: 'OWNER' });

    expect(res.status).toBe(201);
    expect(MemberResponseSchema.parse(res.body).role).toBe('OWNER');
    const stored = await prisma.projectMember.findFirst({
      where: { projectId: project.id, userId: invitee.id },
    });
    expect(stored?.role).toBe('OWNER');
  });

  it('Unknown email: 404 USER_NOT_FOUND', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);

    const res = await add(project.id, owner, { email: 'nobody@example.com' });

    expect(res.status).toBe(404);
    expect(code(res.body)).toBe('USER_NOT_FOUND');
  });

  it('Existing member: 409 ALREADY_MEMBER', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await add(project.id, owner, { email: 'member@example.com' });

    expect(res.status).toBe(409);
    expect(code(res.body)).toBe('ALREADY_MEMBER');
    expect(await memberCount(project.id)).toBe(2);
  });

  it('Invalid body: 400 VALIDATION_ERROR', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);

    const res = await add(project.id, owner, { email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
    expect(await memberCount(project.id)).toBe(1);
  });

  it('MEMBER is forbidden to add: 403 FORBIDDEN and membership unchanged', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    await makeUser('other@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await add(project.id, member, { email: 'other@example.com' });

    expect(res.status).toBe(403);
    expect(code(res.body)).toBe('FORBIDDEN');
    expect(await memberCount(project.id)).toBe(2);
  });

  it('Non-member add: 404 PROJECT_NOT_FOUND', async () => {
    const owner = await makeUser('owner@example.com');
    const outsider = await makeUser('outsider@example.com');
    const project = await ownedProject(owner);

    const res = await add(project.id, outsider, { email: 'outsider@example.com' });

    expect(res.status).toBe(404);
    expect(code(res.body)).toBe('PROJECT_NOT_FOUND');
    expect(await memberCount(project.id)).toBe(1);
  });
});

describe('List members', () => {
  it('Any member can list: 200 with all members', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await list(project.id, member);

    expect(res.status).toBe(200);
    const body = MemberListResponseSchema.parse(res.body);
    expect(body.data.map((m) => `${m.userId}:${m.role}`).sort()).toEqual(
      [`${owner.id}:OWNER`, `${member.id}:MEMBER`].sort(),
    );
  });

  it('Non-member list: 404 PROJECT_NOT_FOUND', async () => {
    const owner = await makeUser('owner@example.com');
    const outsider = await makeUser('outsider@example.com');
    const project = await ownedProject(owner);

    const res = await list(project.id, outsider);

    expect(res.status).toBe(404);
    expect(code(res.body)).toBe('PROJECT_NOT_FOUND');
  });
});

describe('Remove member', () => {
  it('Owner removes a member: 204 and the removed user gets 404 for the project', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await remove(project.id, owner, member.id);

    expect(res.status).toBe(204);
    expect(await memberCount(project.id)).toBe(1);
    const get = await request(app)
      .get(`/api/v1/projects/${project.id}`)
      .set('Authorization', bearer(member));
    expect(get.status).toBe(404);
  });

  it('MEMBER is forbidden to remove: 403 FORBIDDEN and membership unchanged', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await remove(project.id, member, owner.id);

    expect(res.status).toBe(403);
    expect(code(res.body)).toBe('FORBIDDEN');
    expect(await memberCount(project.id)).toBe(2);
  });

  it('Non-member remove: 404 PROJECT_NOT_FOUND', async () => {
    const owner = await makeUser('owner@example.com');
    const outsider = await makeUser('outsider@example.com');
    const project = await ownedProject(owner);

    const res = await remove(project.id, outsider, owner.id);

    expect(res.status).toBe(404);
    expect(code(res.body)).toBe('PROJECT_NOT_FOUND');
    expect(await memberCount(project.id)).toBe(1);
  });

  it('Last owner removing themselves: 409 LAST_OWNER and the membership remains', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    const project = await ownedProject(owner);
    await join(project.id, member.id, 'MEMBER');

    const res = await remove(project.id, owner, owner.id);

    expect(res.status).toBe(409);
    expect(code(res.body)).toBe('LAST_OWNER');
    expect(await memberCount(project.id)).toBe(2);
  });

  it('With two owners one can be removed: 204', async () => {
    const owner = await makeUser('owner@example.com');
    const second = await makeUser('second@example.com');
    const project = await ownedProject(owner);
    await join(project.id, second.id, 'OWNER');

    const res = await remove(project.id, owner, second.id);

    expect(res.status).toBe(204);
    expect(await memberCount(project.id)).toBe(1);
  });

  it('Malformed userId: 400 VALIDATION_ERROR', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await ownedProject(owner);

    const res = await remove(project.id, owner, 'not-a-uuid');

    expect(res.status).toBe(400);
    expect(code(res.body)).toBe('VALIDATION_ERROR');
  });
});

describe('Archived project members are read-only', () => {
  it('Add and remove are 409 PROJECT_ARCHIVED, listing members is still 200', async () => {
    const owner = await makeUser('owner@example.com');
    const member = await makeUser('member@example.com');
    await makeUser('other@example.com');
    const project = await ownedProject(owner, 'Alpha', true);
    await join(project.id, member.id, 'MEMBER');

    const addRes = await add(project.id, owner, { email: 'other@example.com' });
    expect(addRes.status).toBe(409);
    expect(code(addRes.body)).toBe('PROJECT_ARCHIVED');

    const removeRes = await remove(project.id, owner, member.id);
    expect(removeRes.status).toBe(409);
    expect(code(removeRes.body)).toBe('PROJECT_ARCHIVED');

    const listRes = await list(project.id, owner);
    expect(listRes.status).toBe(200);
    expect(MemberListResponseSchema.parse(listRes.body).data).toHaveLength(2);
    expect(await memberCount(project.id)).toBe(2);
  });
});
