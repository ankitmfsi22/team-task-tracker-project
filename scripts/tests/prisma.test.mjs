// Spec: local-dev-environment / "Prisma connects to PostgreSQL" (scenarios "Prisma validates",
// "Prisma reaches the database", "Missing DATABASE_URL") (DEV-1001 task 4.2).
// The connectivity test starts its own throwaway Compose project and always tears it down.
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const backend = resolve(repoRoot, 'backend');
const read = (p) => readFileSync(resolve(backend, p), 'utf8');

const runScript = (name, extraEnv, { unsetDatabaseUrl = false } = {}) => {
  const env = { ...process.env, ...extraEnv };
  if (unsetDatabaseUrl) delete env.DATABASE_URL;
  const r = spawnSync(`pnpm --filter @team-task-tracker/backend run ${name}`, {
    cwd: repoRoot,
    env,
    shell: true,
    encoding: 'utf8',
    timeout: 120000,
  });
  return { status: r.status, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};

test('Prisma files and configuration exist with no literal connection string', () => {
  for (const f of ['prisma.config.ts', 'prisma/schema.prisma', 'prisma/check.sql']) {
    assert.ok(existsSync(resolve(backend, f)), `backend/${f} must exist`);
  }
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.devDependencies?.prisma, '7.10.1');
  assert.equal(pkg.scripts?.['prisma:validate'], 'prisma validate');
  assert.equal(pkg.scripts?.['db:check'], 'prisma db execute --file prisma/check.sql');

  const schema = read('prisma/schema.prisma');
  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.doesNotMatch(schema, /^\s*model\s/m);
  assert.doesNotMatch(schema, /postgres(ql)?:\/\//);

  const config = read('prisma.config.ts');
  assert.match(config, /env\(\s*['"]DATABASE_URL['"]\s*\)/);
  assert.match(config, /from ['"]prisma\/config['"]/);
  assert.doesNotMatch(config, /postgres(ql)?:\/\//);
});

test('Prisma validates with DATABASE_URL set', () => {
  const r = runScript('prisma:validate', {
    DATABASE_URL: 'postgresql://user:pw@localhost:5432/db',
  });
  assert.equal(r.status, 0, r.out);
});

test('Missing DATABASE_URL: prisma:validate fails naming DATABASE_URL', () => {
  const r = runScript('prisma:validate', {}, { unsetDatabaseUrl: true });
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /DATABASE_URL/);
});

test('Missing DATABASE_URL: db:check fails naming DATABASE_URL', () => {
  const r = runScript('db:check', {}, { unsetDatabaseUrl: true });
  assert.notEqual(r.status, 0, r.out);
  assert.match(r.out, /DATABASE_URL/);
});

// Ask the OS for a free port so a busy fixed port (CI runners use 32768-60999 for ephemeral
// ports) cannot make the test flaky.
const freePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });

test('Prisma reaches the database (throwaway Compose project)', { timeout: 180000 }, async () => {
  // Unique per run: concurrent test runs (CI, hooks, reviewers) must not share, and so
  // tear down, each other's containers.
  const project = `ttt-prisma-${process.pid}-${Date.now().toString(36)}`;
  const port = await freePort();
  const composeEnv = {
    ...process.env,
    POSTGRES_PASSWORD: 'test-only-pw',
    POSTGRES_PORT: String(port),
    POSTGRES_USER: 'tasktracker',
    POSTGRES_DB: 'tasktracker',
  };
  const compose = (args) =>
    spawnSync(`docker compose -p ${project} ${args}`, {
      cwd: repoRoot,
      env: composeEnv,
      shell: true,
      encoding: 'utf8',
      timeout: 150000,
    });
  let down;
  try {
    const up = compose('up -d --wait');
    if (up.status !== 0) {
      const logs = compose('logs --no-color --tail 40');
      assert.fail(
        `compose up failed:\n${up.stdout}${up.stderr}\n--- container logs ---\n${logs.stdout}`,
      );
    }
    const r = runScript('db:check', {
      DATABASE_URL: `postgresql://tasktracker:test-only-pw@localhost:${port}/tasktracker`,
    });
    assert.equal(r.status, 0, r.out);
  } finally {
    down = compose('down -v');
  }
  assert.equal(down.status, 0, `compose down failed:\n${down.stdout}${down.stderr}`);
});
