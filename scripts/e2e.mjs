// E2E gate (DEV-1016): starts a throwaway Compose PostgreSQL, migrates it, builds the workspace and
// runs the Playwright journey against the built backend and `vite preview`. Needs Docker; local only.
// Usage: pnpm test:e2e   (extra arguments are passed to `playwright test`)
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(repoRoot, 'backend');

const freePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });

const run = (command, options = {}) =>
  spawnSync(command, { cwd: repoRoot, shell: true, stdio: 'inherit', ...options });

const name = `ttt-e2e-${process.pid}-${Date.now().toString(36)}`;
const dbPort = await freePort();
const composeEnv = {
  ...process.env,
  POSTGRES_PASSWORD: 'e2e-only-pw',
  POSTGRES_PORT: String(dbPort),
  POSTGRES_USER: 'tasktracker',
  POSTGRES_DB: 'tasktracker',
  // Compose interpolates the whole file; only the postgres service is started.
  JWT_ACCESS_SECRET: 'e2e-only-access',
  JWT_REFRESH_SECRET: 'e2e-only-refresh',
  SEED_DEMO_PASSWORD: 'e2e-only-demo',
};
const databaseUrl = `postgresql://tasktracker:e2e-only-pw@127.0.0.1:${dbPort}/tasktracker`;

let status = 1;
try {
  if (run(`docker compose -p ${name} up -d --wait postgres`, { env: composeEnv }).status !== 0) {
    throw new Error('docker compose up failed (is Docker running?)');
  }
  if (
    run('pnpm exec prisma migrate deploy', {
      cwd: backendDir,
      env: { ...process.env, DATABASE_URL: databaseUrl },
    }).status !== 0
  ) {
    throw new Error('prisma migrate deploy failed');
  }
  if (run('pnpm build').status !== 0) throw new Error('pnpm build failed');
  // Extra arguments go to Playwright as an argument list; a shell is only needed on Windows (pnpm.cmd).
  status =
    spawnSync(
      'pnpm',
      [
        'exec',
        'playwright',
        'test',
        '--config',
        'e2e/playwright.config.ts',
        ...process.argv.slice(2),
      ],
      {
        cwd: repoRoot,
        shell: process.platform === 'win32',
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          JWT_ACCESS_SECRET: 'e2e-access-secret-not-for-production',
          JWT_REFRESH_SECRET: 'e2e-refresh-secret-not-for-production',
        },
      },
    ).status ?? 1;
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
} finally {
  run(`docker compose -p ${name} down -v`, { env: composeEnv, stdio: 'ignore' });
}
process.exit(status);
