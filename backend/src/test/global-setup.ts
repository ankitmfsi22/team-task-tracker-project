// Starts a throwaway Compose PostgreSQL once per run (or uses TEST_DATABASE_URL), applies
// migrations and provides the URL to tests. Never touches a developer database.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    testDatabaseUrl: string;
  }
}

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const repoRoot = resolve(backendDir, '..');

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Could not determine a free port'));
        return;
      }
      server.close(() => resolvePort(address.port));
    });
  });
}

function migrate(databaseUrl: string): void {
  const r = spawnSync('pnpm exec prisma migrate deploy', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    shell: true,
    encoding: 'utf8',
    timeout: 120000,
  });
  if (r.status !== 0) {
    throw new Error(`prisma migrate deploy failed:\n${r.stdout}${r.stderr}`);
  }
}

export default async function setup(project: TestProject): Promise<() => void> {
  const external = process.env.TEST_DATABASE_URL;
  if (external !== undefined && external !== '') {
    migrate(external);
    project.provide('testDatabaseUrl', external);
    return () => undefined;
  }

  const name = `ttt-backend-${process.pid}-${Date.now().toString(36)}`;
  const port = await freePort();
  const composeEnv = {
    ...process.env,
    POSTGRES_PASSWORD: 'test-only-pw',
    POSTGRES_PORT: String(port),
    POSTGRES_USER: 'tasktracker',
    POSTGRES_DB: 'tasktracker',
  };
  const compose = (args: string) =>
    spawnSync(`docker compose -p ${name} ${args}`, {
      cwd: repoRoot,
      env: composeEnv,
      shell: true,
      encoding: 'utf8',
      timeout: 150000,
    });
  const teardown = (): void => {
    compose('down -v');
  };

  try {
    const up = compose('up -d --wait');
    if (up.status !== 0) {
      throw new Error(`compose up failed:\n${up.stdout}${up.stderr}`);
    }
    const url = `postgresql://tasktracker:test-only-pw@127.0.0.1:${port}/tasktracker`;
    migrate(url);
    project.provide('testDatabaseUrl', url);
  } catch (error) {
    teardown();
    throw error;
  }
  return teardown;
}
