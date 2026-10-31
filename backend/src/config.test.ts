import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const env = {
  DATABASE_URL: 'postgresql://x',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('loadConfig', () => {
  it('returns the configuration from the environment variables', () => {
    expect(loadConfig(env)).toEqual({
      databaseUrl: env.DATABASE_URL,
      jwtAccessSecret: env.JWT_ACCESS_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
    });
  });

  // Spec: "Missing secret"
  for (const name of ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    it(`throws naming ${name} when it is missing`, () => {
      const partial: Record<string, string | undefined> = { ...env };
      delete partial[name];
      expect(() => loadConfig(partial)).toThrowError(new RegExp(name));
    });

    it(`throws naming ${name} when it is empty`, () => {
      expect(() => loadConfig({ ...env, [name]: '' })).toThrowError(new RegExp(name));
    });
  }
});
