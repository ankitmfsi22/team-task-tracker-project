// Spec: user-auth (DEV-1006 task 4.1) -- "User registration", "Passwords are stored hashed only",
// "Login issues tokens", "Protected endpoints require a valid access token".
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest';
import request from 'supertest';
import { SignJWT, jwtVerify } from 'jose';
import { PrismaPg } from '@prisma/adapter-pg';
import { createApp } from './app.js';
import { PrismaClient } from './generated/prisma/client.js';

const accessSecret = 'a'.repeat(32);
const refreshSecret = 'b'.repeat(32);
const enc = (s: string) => new TextEncoder().encode(s);
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

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

const register = (body: object = valid) => request(app).post('/api/v1/auth/register').send(body);
const login = (body: object) => request(app).post('/api/v1/auth/login').send(body);

const cookieList = (setCookie: string[] | string | undefined): string[] =>
  Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];

const refreshCookieValue = (setCookie: string[] | string | undefined): string => {
  const line = cookieList(setCookie).find((c) => c.startsWith('refresh_token='));
  expect(line, 'Set-Cookie must carry refresh_token').toBeDefined();
  return (line ?? '').split(';')[0]?.slice('refresh_token='.length) ?? '';
};

describe('User registration', () => {
  it('Successful registration: 201 with id, email, name and no password or hash field', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), email: valid.email, name: valid.name });
    expect(JSON.stringify(res.body)).not.toMatch(/password|hash/i);
  });

  it.each([
    ['invalid email', { ...valid, email: 'not-an-email' }],
    ['7-character password', { ...valid, password: '1234567' }],
    ['missing name', { email: valid.email, password: valid.password }],
  ])('Invalid input is rejected: %s -> 400 VALIDATION_ERROR and no user', async (_label, body) => {
    const res = await register(body);
    expect(res.status).toBe(400);
    const { error } = res.body as ErrorBody;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toEqual(expect.any(String));
    expect(error.details).toBeDefined();
    expect(await prisma.user.count()).toBe(0);
  });

  it('Duplicate email is rejected in any letter case and the existing user is unchanged', async () => {
    expect((await register()).status).toBe(201);
    const before = await prisma.user.findMany();
    expect(before).toHaveLength(1);

    for (const email of [valid.email, valid.email.toUpperCase()]) {
      const res = await register({ ...valid, email, name: 'Someone Else' });
      expect(res.status).toBe(409);
      expect((res.body as ErrorBody).error.code).toBe('CONFLICT');
    }
    const after = await prisma.user.findMany();
    expect(after).toEqual(before);
  });
});

describe('Passwords are stored hashed only', () => {
  it('Stored value is an argon2id hash that does not contain the password', async () => {
    expect((await register()).status).toBe(201);
    const row = await prisma.user.findFirstOrThrow();
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true);
    expect(row.passwordHash).not.toContain(valid.password);
  });

  it('Secrets never appear in responses or log output', async () => {
    const chunks: string[] = [];
    const capture = (...args: unknown[]): void => {
      chunks.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    };
    const spies = [
      vi.spyOn(console, 'log').mockImplementation(capture),
      vi.spyOn(console, 'info').mockImplementation(capture),
      vi.spyOn(console, 'warn').mockImplementation(capture),
      vi.spyOn(console, 'error').mockImplementation(capture),
      vi.spyOn(process.stdout, 'write').mockImplementation((c: unknown) => {
        chunks.push(String(c));
        return true;
      }),
      vi.spyOn(process.stderr, 'write').mockImplementation((c: unknown) => {
        chunks.push(String(c));
        return true;
      }),
    ];
    let responses: string[] = [];
    let refreshToken = '';
    let hash = '';
    let statuses: number[] = [];
    try {
      const reg = await register();
      const ok = await login({ email: valid.email, password: valid.password });
      const failed = await login({ email: valid.email, password: 'wrong-password-1' });
      statuses = [reg.status, ok.status, failed.status];
      refreshToken = refreshCookieValue(ok.headers['set-cookie']);
      hash = (await prisma.user.findFirstOrThrow()).passwordHash;
      responses = [JSON.stringify(reg.body), JSON.stringify(ok.body), JSON.stringify(failed.body)];
    } finally {
      spies.forEach((s) => s.mockRestore());
    }
    expect(statuses).toEqual([201, 200, 401]);
    for (const text of [...responses, ...chunks]) {
      expect(text).not.toContain(valid.password);
      expect(text).not.toContain('wrong-password-1');
      expect(text).not.toContain(hash);
      expect(text).not.toContain(refreshToken);
    }
  });
});

describe('Login issues tokens', () => {
  it('Successful login: access token, hardened refresh cookie, stored hash only', async () => {
    const reg = await register();
    const userId = (reg.body as { id: string }).id;
    const res = await login({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);

    const body = res.body as { accessToken: string };
    expect(body.accessToken).toEqual(expect.any(String));
    const { payload } = await jwtVerify(body.accessToken, enc(accessSecret), {
      algorithms: ['HS256'],
    });
    expect(payload.sub).toBe(userId);
    expect(payload['typ']).toBe('access');
    expect((payload.exp ?? 0) - (payload.iat ?? 0)).toBe(900);

    const setCookie = cookieList(res.headers['set-cookie']);
    const line = setCookie.find((c) => c.startsWith('refresh_token='));
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
    const refresh = refreshCookieValue(setCookie);
    expect(JSON.stringify(res.body)).not.toContain(refresh);

    const rows = await prisma.refreshToken.findMany();
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row?.userId).toBe(userId);
    expect(row?.tokenHash).toBe(sha256(refresh));
    expect(row?.tokenHash).not.toBe(refresh);
    expect(row?.revokedAt).toBeNull();
    const week = 7 * 24 * 3600 * 1000;
    const delta = (row?.expiresAt.getTime() ?? 0) - Date.now();
    expect(Math.abs(delta - week)).toBeLessThan(60_000);
  });

  it('Wrong credentials give one generic 401 for unknown email and wrong password', async () => {
    await register();
    const unknown = await login({ email: 'nobody@example.com', password: valid.password });
    const wrong = await login({ email: valid.email, password: 'wrong-password-1' });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    const a = (unknown.body as ErrorBody).error;
    const b = (wrong.body as ErrorBody).error;
    expect(a.code).toBe('INVALID_CREDENTIALS');
    expect(b).toEqual(a);
  });

  it.each([
    ['missing password', { email: valid.email }],
    ['malformed email', { email: 'nope', password: valid.password }],
  ])('Invalid login input: %s -> 400 VALIDATION_ERROR', async (_label, body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
    expect((res.body as ErrorBody).error.code).toBe('VALIDATION_ERROR');
  });
});

describe('Protected endpoints require a valid access token', () => {
  const me = (token?: string) => {
    const r = request(app).get('/api/v1/auth/me');
    return token === undefined ? r : r.set('Authorization', `Bearer ${token}`);
  };
  const signed = (secret: string, claims: Record<string, unknown>, exp: number | string) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(enc(secret));

  it('Valid access token: 200 with the caller id, email and name', async () => {
    const reg = await register();
    const loginRes = await login({ email: valid.email, password: valid.password });
    const { accessToken } = loginRes.body as { accessToken: string };
    const res = await me(accessToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(reg.body);
  });

  it('Missing, malformed, wrongly signed or expired token: 401 with error shape', async () => {
    const reg = await register();
    const claims = { sub: (reg.body as { id: string }).id, typ: 'access' };
    const attempts: Array<string | undefined> = [
      undefined,
      'not.a.jwt',
      await signed('c'.repeat(32), claims, '15m'),
      await signed(accessSecret, claims, Math.floor(Date.now() / 1000) - 60),
    ];
    for (const token of attempts) {
      const res = await me(token);
      expect(res.status).toBe(401);
      const { error } = res.body as ErrorBody;
      expect(error.code).toBe('UNAUTHENTICATED');
      expect(error.message).toEqual(expect.any(String));
    }
  });

  it('Refresh token is not an access token: 401', async () => {
    await register();
    const res = await login({ email: valid.email, password: valid.password });
    const refresh = refreshCookieValue(res.headers['set-cookie']);
    expect((await me(refresh)).status).toBe(401);
  });
});
