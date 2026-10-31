import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { z } from 'zod';
import { RegisterRequestSchema, buildOpenApiDocument } from '@team-task-tracker/shared';
import { createApp } from './app.js';
import { AppError } from './errors.js';
import { validate } from './middleware/validate.js';

const config = {
  databaseUrl: 'postgresql://x',
  jwtAccessSecret: 'a'.repeat(32),
  jwtRefreshSecret: 'b'.repeat(32),
};

const ItemParams = z.object({ id: z.uuid() });
const ListQuery = z.object({ page: z.coerce.number().int().min(1) });

const app = createApp(config, {
  extraRoutes: (router) => {
    router.post('/test/register', validate({ body: RegisterRequestSchema }), (req, res) => {
      res.status(200).json({ seen: req.body });
    });
    router.get('/test/items/:id', validate({ params: ItemParams }), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    router.get('/test/list', validate({ query: ListQuery }), (_req, res) => {
      res.status(200).json({ ok: true });
    });
    router.get('/test/throw', () => {
      throw new Error('secret internal detail');
    });
    router.get('/test/reject', async () => {
      await Promise.resolve();
      throw new Error('secret internal detail');
    });
    router.get('/test/conflict', () => {
      throw new AppError(409, 'CONFLICT', 'dup');
    });
    router.get('/test/cookie', (req, res) => {
      const cookies = req.cookies as Record<string, string | undefined>;
      res.status(200).json({ token: cookies['refresh_token'] });
    });
  },
});

const validRegister = { email: '  User@Example.COM ', name: '  Ada  ', password: 'password1' };

describe('not found handler', () => {
  it('returns 404 NOT_FOUND for an unknown /api/v1 path', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });

  it('returns 404 NOT_FOUND in the same shape outside /api/v1', async () => {
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });
});

describe('validate middleware', () => {
  it('rejects an invalid body with 400 VALIDATION_ERROR and details', async () => {
    const res = await request(app)
      .post('/api/v1/test/register')
      .send({ email: 'not-an-email', name: '', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toEqual(expect.any(String));
    expect(res.body.error.details).toBeDefined();
  });

  it('passes a valid body to the handler as the parsed value', async () => {
    const res = await request(app).post('/api/v1/test/register').send(validRegister);
    expect(res.status).toBe(200);
    expect(res.body.seen).toEqual({
      email: 'user@example.com',
      name: 'Ada',
      password: 'password1',
    });
  });

  it('rejects invalid params with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/test/items/not-a-uuid');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an invalid query with 400 VALIDATION_ERROR', async () => {
    const res = await request(app).get('/api/v1/test/list?page=0');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('error handler', () => {
  for (const [label, path] of [
    ['a synchronous throw', '/api/v1/test/throw'],
    ['an async rejection', '/api/v1/test/reject'],
  ] as const) {
    it(`maps ${label} to a generic 500 INTERNAL_ERROR without leaking details`, async () => {
      const res = await request(app).get(path);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: expect.any(String) } });
      expect(res.text).not.toContain('secret internal detail');
      expect(res.text).not.toContain('at ');
    });
  }

  it('maps an AppError to its status, code and message', async () => {
    const res = await request(app).get('/api/v1/test/conflict');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: { code: 'CONFLICT', message: 'dup' } });
  });

  it('maps malformed JSON to 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/test/register')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toEqual(expect.any(String));
  });
});

describe('openapi document', () => {
  it('serves the shared OpenAPI document at /api/v1/openapi.json', async () => {
    const res = await request(app).get('/api/v1/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(JSON.parse(JSON.stringify(buildOpenApiDocument())));
  });
});

describe('cookie parsing', () => {
  it('populates req.cookies from the Cookie header', async () => {
    const res = await request(app).get('/api/v1/test/cookie').set('Cookie', 'refresh_token=abc123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ token: 'abc123' });
  });
});
