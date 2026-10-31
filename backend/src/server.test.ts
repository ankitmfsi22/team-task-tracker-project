import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { describe, expect, it } from 'vitest';
import { startServer } from './server.js';

const env = {
  DATABASE_URL: 'postgresql://x',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('startServer', () => {
  // Spec: "Missing secret"
  for (const name of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'] as const) {
    it(`fails at startup naming ${name} when it is missing`, async () => {
      const partial: Record<string, string | undefined> = { ...env };
      delete partial[name];
      await expect(Promise.resolve().then(() => startServer(partial, 0))).rejects.toThrowError(
        new RegExp(name),
      );
    });
  }

  it('listens with a complete environment and serves the API', async () => {
    const server: Server = await startServer(env, 0);
    try {
      expect(server.listening).toBe(true);
      const address = server.address() as AddressInfo;
      expect(typeof address.port).toBe('number');
      const base = `http://127.0.0.1:${address.port}/api/v1`;

      const spec = await fetch(`${base}/openapi.json`);
      expect(spec.status).toBe(200);

      const me = await fetch(`${base}/auth/me`);
      expect(me.status).toBe(401);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
