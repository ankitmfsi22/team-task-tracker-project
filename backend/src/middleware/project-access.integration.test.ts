// Spec: projects (DEV-1007 task 1.3) -- "Project access rule".
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { PrismaPg } from '@prisma/adapter-pg';
import { ProjectIdParamsSchema } from '@team-task-tracker/shared';
import { createApp } from '../app.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { authenticate } from './authenticate.js';
import { validate } from './validate.js';
import { projectAccess } from './project-access.js';

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
  const secrets = { jwtAccessSecret: accessSecret, jwtRefreshSecret: refreshSecret };
  app = createApp(
    { databaseUrl, jwtAccessSecret: accessSecret, jwtRefreshSecret: refreshSecret },
    {
      prisma,
      extraRoutes: (router) => {
        router.patch(
          '/test-projects/:projectId/owner-write',
          authenticate(secrets),
          validate({ params: ProjectIdParamsSchema }),
          projectAccess(prisma, { roles: ['OWNER'], write: true }),
          (_req, res) => {
            res.json({ project: res.locals['project'], membership: res.locals['membership'] });
          },
        );
        router.patch(
          '/test-projects/:projectId/any-write',
          authenticate(secrets),
          validate({ params: ProjectIdParamsSchema }),
          projectAccess(prisma, { write: true }),
          (_req, res) => {
            res.json({ project: res.locals['project'], membership: res.locals['membership'] });
          },
        );
        router.get(
          '/test-projects/:projectId/read',
          authenticate(secrets),
          validate({ params: ProjectIdParamsSchema }),
          projectAccess(prisma),
          (_req, res) => {
            res.json({ project: res.locals['project'], membership: res.locals['membership'] });
          },
        );
      },
    },
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

const makeProject = (archived = false) =>
  prisma.project.create({ data: { name: 'P', archivedAt: archived ? new Date() : null } });

const join = (projectId: string, userId: string, role: 'OWNER' | 'MEMBER') =>
  prisma.projectMember.create({ data: { projectId, userId, role } });

const bearer = (a: Actor) => `Bearer ${a.token}`;
const ownerWrite = (id: string) => `/api/v1/test-projects/${id}/owner-write`;
const anyWrite = (id: string) => `/api/v1/test-projects/${id}/any-write`;
const read = (id: string) => `/api/v1/test-projects/${id}/read`;

describe('Project access rule', () => {
  it('Non-member and nonexistent project return the same 404 PROJECT_NOT_FOUND body', async () => {
    const outsider = await makeUser('outsider@example.com');
    const project = await makeProject();

    const nonMember = await request(app)
      .get(read(project.id))
      .set('Authorization', bearer(outsider));
    const missing = await request(app)
      .get(read('00000000-0000-4000-8000-000000000000'))
      .set('Authorization', bearer(outsider));

    expect(nonMember.status).toBe(404);
    expect(missing.status).toBe(404);
    expect((nonMember.body as ErrorBody).error.code).toBe('PROJECT_NOT_FOUND');
    expect(nonMember.body).toEqual(missing.body);
  });

  it('MEMBER on an OWNER-only route is 403 FORBIDDEN', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject();
    await join(project.id, member.id, 'MEMBER');

    const res = await request(app)
      .patch(ownerWrite(project.id))
      .set('Authorization', bearer(member));
    expect(res.status).toBe(403);
    expect((res.body as ErrorBody).error.code).toBe('FORBIDDEN');
  });

  it('Write on an archived project is 409 PROJECT_ARCHIVED while the read still succeeds', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject(true);
    await join(project.id, member.id, 'MEMBER');

    const write = await request(app)
      .patch(anyWrite(project.id))
      .set('Authorization', bearer(member));
    expect(write.status).toBe(409);
    expect((write.body as ErrorBody).error.code).toBe('PROJECT_ARCHIVED');

    const get = await request(app).get(read(project.id)).set('Authorization', bearer(member));
    expect(get.status).toBe(200);
  });

  it('MEMBER on an OWNER-only write route of an archived project is 403 (role before archived)', async () => {
    const member = await makeUser('member@example.com');
    const project = await makeProject(true);
    await join(project.id, member.id, 'MEMBER');

    const res = await request(app)
      .patch(ownerWrite(project.id))
      .set('Authorization', bearer(member));
    expect(res.status).toBe(403);
    expect((res.body as ErrorBody).error.code).toBe('FORBIDDEN');
  });

  it('Access granted exposes the project and the caller membership to the handler', async () => {
    const owner = await makeUser('owner@example.com');
    const project = await makeProject();
    await join(project.id, owner.id, 'OWNER');

    const res = await request(app)
      .patch(ownerWrite(project.id))
      .set('Authorization', bearer(owner));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      project: { id: project.id, archivedAt: null },
      membership: { role: 'OWNER' },
    });
  });

  it('Unauthenticated request is 401 UNAUTHENTICATED', async () => {
    const project = await makeProject();
    const res = await request(app).get(read(project.id));
    expect(res.status).toBe(401);
    expect((res.body as ErrorBody).error.code).toBe('UNAUTHENTICATED');
  });

  it('Malformed project id is 400 VALIDATION_ERROR', async () => {
    const user = await makeUser('user@example.com');
    const res = await request(app).get(read('not-a-uuid')).set('Authorization', bearer(user));
    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });
});
