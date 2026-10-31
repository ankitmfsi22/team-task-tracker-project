// Spec: user-auth (DEV-1006 task 4.2) -- "Refresh rotates the token", "Refresh tokens are stored hashed"
// (rotation side) and "Logout revokes the refresh token".
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const enc = (s: string) => new TextEncoder().encode(s);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const nowSec = () => Math.floor(Date.now() / 1000);

const valid = { email: 'ada@example.com', name: 'Ada Lovelace', password: 'correct-horse-9' };

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
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "RefreshToken", "User" CASCADE');
});

const cookieList = (setCookie: string[] | string | undefined): string[] =>
  Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];

const refreshLine = (setCookie: string[] | string | undefined): string | undefined =>
  cookieList(setCookie).find((c) => c.startsWith('refresh_token='));

const refreshCookieValue = (setCookie: string[] | string | undefined): string => {
  const line = refreshLine(setCookie);
  expect(line, 'Set-Cookie must carry refresh_token').toBeDefined();
  return (line ?? '').split(';')[0]?.slice('refresh_token='.length) ?? '';
};

const registerUser = async (): Promise<string> => {
  const res = await request(app).post('/api/v1/auth/register').send(valid);
  return (res.body as { id: string }).id;
};

// Registers (once per test) and logs in; returns the refresh cookie value.
const loginForRefresh = async (): Promise<string> => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: valid.email, password: valid.password });
  return refreshCookieValue(res.headers['set-cookie']);
};

const doRefresh = (token?: string) => {
  const r = request(app).post('/api/v1/auth/refresh');
  return token === undefined ? r : r.set('Cookie', `refresh_token=${token}`);
};
const doLogout = (token?: string) => {
  const r = request(app).post('/api/v1/auth/logout');
  return token === undefined ? r : r.set('Cookie', `refresh_token=${token}`);
};

const signRefresh = (
  secret: string,
  claims: Record<string, unknown>,
  sub: string,
  exp: number | string,
) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt(nowSec() - 3600)
    .setExpirationTime(exp)
    .sign(enc(secret));

const expectUnauthenticated = (res: request.Response): void => {
  expect(res.status).toBe(401);
  const { error } = res.body as ErrorBody;
  expect(error.code).toBe('UNAUTHENTICATED');
  expect(error.message).toEqual(expect.any(String));
};

describe('Refresh rotates the token', () => {
  it('Successful rotation: new access token, new cookie, old row revoked, new hashed row', async () => {
    const userId = await registerUser();
    const oldToken = await loginForRefresh();

    const res = await doRefresh(oldToken);
    expect(res.status).toBe(200);

    const body = res.body as { accessToken: string };
    expect(Object.keys(body)).toEqual(['accessToken']);
    const { payload } = await jwtVerify(body.accessToken, enc(accessSecret), {
      algorithms: ['HS256'],
    });
    expect(payload.sub).toBe(userId);
    expect(payload['typ']).toBe('access');

    const line = refreshLine(res.headers['set-cookie']);
    expect(line).toBeDefined();
    for (const flag of [
      'Path=/api/v1/auth',
      'Max-Age=604800',
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
    ]) {
      expect(line).toContain(flag);
    }
    const newToken = refreshCookieValue(res.headers['set-cookie']);
    expect(newToken).not.toBe('');
    expect(newToken).not.toBe(oldToken);
    expect(JSON.stringify(res.body)).not.toContain(newToken);

    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(2);
    const oldRow = rows.find((r) => r.tokenHash === sha256(oldToken));
    const newRow = rows.find((r) => r.tokenHash === sha256(newToken));
    expect(oldRow?.revokedAt).not.toBeNull();
    expect(oldRow).toBeDefined();
    expect(newRow).toBeDefined();
    expect(newRow?.userId).toBe(userId);
    expect(newRow?.revokedAt).toBeNull();
    expect(newRow?.tokenHash).not.toBe(newToken);
    const delta = (newRow?.expiresAt.getTime() ?? 0) - Date.now();
    expect(Math.abs(delta - 7 * 24 * 3600 * 1000)).toBeLessThan(60_000);
  });

  it('The new access token is accepted by GET /api/v1/auth/me', async () => {
    await registerUser();
    const res = await doRefresh(await loginForRefresh());
    expect(res.status).toBe(200);
    const { accessToken } = res.body as { accessToken: string };
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect((me.body as { email: string }).email).toBe(valid.email);
  });

  it('Reused rotated token is rejected: 401 and no new token or row', async () => {
    await registerUser();
    const oldToken = await loginForRefresh();
    expect((await doRefresh(oldToken)).status).toBe(200);
    const rowsBefore = await prisma.refreshToken.count();

    const res = await doRefresh(oldToken);
    expectUnauthenticated(res);
    expect(refreshLine(res.headers['set-cookie'])?.startsWith('refresh_token=;') ?? true).toBe(
      true,
    );
    expect(JSON.stringify(res.body)).not.toContain('accessToken');
    expect(await prisma.refreshToken.count()).toBe(rowsBefore);
  });

  it('Token revoked by logout then refresh: 401', async () => {
    await registerUser();
    const token = await loginForRefresh();
    expect((await doLogout(token)).status).toBe(204);
    const rowsBefore = await prisma.refreshToken.count();
    expectUnauthenticated(await doRefresh(token));
    expect(await prisma.refreshToken.count()).toBe(rowsBefore);
  });

  it('No cookie: 401', async () => {
    await registerUser();
    expectUnauthenticated(await doRefresh());
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it('Malformed token: 401', async () => {
    await registerUser();
    expectUnauthenticated(await doRefresh('not.a.jwt'));
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it('Token signed with the wrong (access) secret: 401 even when its hash is stored', async () => {
    const userId = await registerUser();
    const token = await signRefresh(accessSecret, { typ: 'refresh' }, userId, '7d');
    await prisma.refreshToken.create({
      data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86_400_000) },
    });
    expectUnauthenticated(await doRefresh(token));
    expect(await prisma.refreshToken.count()).toBe(1);
  });

  it('Expired but correctly signed token with a stored hash: 401', async () => {
    const userId = await registerUser();
    const token = await signRefresh(refreshSecret, { typ: 'refresh' }, userId, nowSec() - 60);
    await prisma.refreshToken.create({
      data: { userId, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 86_400_000) },
    });
    expectUnauthenticated(await doRefresh(token));
    expect(await prisma.refreshToken.count()).toBe(1);
  });

  it('Validly signed token whose hash is not in the database: 401', async () => {
    const userId = await registerUser();
    const token = await signRefresh(refreshSecret, { typ: 'refresh' }, userId, '7d');
    expectUnauthenticated(await doRefresh(token));
    expect(await prisma.refreshToken.count()).toBe(0);
  });

  it('Access token placed in the refresh cookie: 401', async () => {
    await registerUser();
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: valid.email, password: valid.password });
    const { accessToken } = loginRes.body as { accessToken: string };
    const rowsBefore = await prisma.refreshToken.count();
    expectUnauthenticated(await doRefresh(accessToken));
    expect(await prisma.refreshToken.count()).toBe(rowsBefore);
  });

  it('Database row expired with a valid-signature token: 401', async () => {
    await registerUser();
    const token = await loginForRefresh();
    await prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token) },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const rowsBefore = await prisma.refreshToken.count();
    expectUnauthenticated(await doRefresh(token));
    expect(await prisma.refreshToken.count()).toBe(rowsBefore);
  });
});

describe('Logout revokes the refresh token', () => {
  it('Logout returns 204, clears the cookie, revokes the row and refresh then returns 401', async () => {
    await registerUser();
    const token = await loginForRefresh();

    const res = await doLogout(token);
    expect(res.status).toBe(204);
    const line = refreshLine(res.headers['set-cookie']);
    expect(line, 'logout must clear the refresh_token cookie').toBeDefined();
    expect(line?.startsWith('refresh_token=;')).toBe(true);
    expect(line).toContain('Path=/api/v1/auth');
    expect(line).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);

    const row = await prisma.refreshToken.findFirstOrThrow({ where: { tokenHash: sha256(token) } });
    expect(row.revokedAt).not.toBeNull();

    expectUnauthenticated(await doRefresh(token));
  });

  it('Logout without a cookie: 204 and no token is revoked', async () => {
    await registerUser();
    await loginForRefresh();
    const before = await prisma.refreshToken.findMany();

    const res = await doLogout();
    expect(res.status).toBe(204);
    expect(await prisma.refreshToken.findMany()).toEqual(before);
  });

  it('Logout with an invalid token: 204 and no token is revoked', async () => {
    await registerUser();
    await loginForRefresh();
    const before = await prisma.refreshToken.findMany();

    const res = await doLogout('garbage-token');
    expect(res.status).toBe(204);
    expect(await prisma.refreshToken.findMany()).toEqual(before);
  });

  it('Logout revokes only the presented session; another session of the same user still refreshes', async () => {
    await registerUser();
    const first = await loginForRefresh();
    const second = await loginForRefresh();
    expect(second).not.toBe(first);

    expect((await doLogout(first)).status).toBe(204);

    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.tokenHash === sha256(first))?.revokedAt).not.toBeNull();
    expect(rows.find((r) => r.tokenHash === sha256(second))?.revokedAt).toBeNull();

    expect((await doRefresh(second)).status).toBe(200);
  });
});
