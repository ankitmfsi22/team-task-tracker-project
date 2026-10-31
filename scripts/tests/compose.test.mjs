// Spec: local-dev-environment / "Compose runs pinned PostgreSQL 16", "Compose scope",
// "Environment files hold no secrets" (DEV-1001 task 4.1).
// Dependency-free: node:test + the real `docker compose` and `git` CLIs. No containers are started.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, connect } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPinning } from '../check-pinning.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const composePath = resolve(repoRoot, 'docker-compose.yml');
const envExamplePath = resolve(repoRoot, '.env.example');

const readCompose = () => {
  assert.ok(existsSync(composePath), 'docker-compose.yml is missing');
  return readFileSync(composePath, 'utf8');
};

// Runs `docker compose` with a controlled environment and an empty env file so no .env is read.
const compose = (args, extraEnv) => {
  const dir = mkdtempSync(join(tmpdir(), 'compose-env-'));
  try {
    const emptyEnv = join(dir, 'empty.env');
    writeFileSync(emptyEnv, '');
    const env = { ...process.env };
    delete env.POSTGRES_PASSWORD;
    Object.assign(env, extraEnv);
    const r = spawnSync('docker', ['compose', '--env-file', emptyEnv, '-f', composePath, ...args], {
      encoding: 'utf8',
      env,
      cwd: repoRoot,
    });
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const git = (args) => spawnSync('git', args, { encoding: 'utf8', cwd: repoRoot });

test('compose: image is an exact postgres:16.<minor>-alpine tag and passes the pinning check', () => {
  const text = readCompose();
  assert.match(text, /postgres:16\.\d+-alpine/);
  const violations = checkPinning(repoRoot).filter((v) => /compose/i.test(v));
  assert.deepEqual(violations, []);
});

test('compose: only the postgres service exists', () => {
  readCompose();
  const r = compose(['config', '--services'], { POSTGRES_PASSWORD: 'test-only-value' });
  assert.equal(r.error, undefined, String(r.error));
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'postgres');
});

test('compose: defines a named volume and a healthcheck', () => {
  readCompose();
  const r = compose(['config'], { POSTGRES_PASSWORD: 'test-only-value' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^volumes:\s*\n\s+\S+:/m, 'no top-level named volume');
  assert.match(r.stdout, /healthcheck:/, 'no healthcheck');
});

test('compose: missing POSTGRES_PASSWORD fails and names the variable', () => {
  readCompose();
  const r = compose(['config'], {});
  assert.notEqual(r.status, 0, 'expected non-zero exit without POSTGRES_PASSWORD');
  assert.match(r.stderr, /POSTGRES_PASSWORD/);
});

test('.env.example: exists with placeholder-only secrets and required names', () => {
  assert.ok(existsSync(envExamplePath), '.env.example is missing');
  const lines = readFileSync(envExamplePath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
  const keys = lines.map((l) => l.split('=')[0].trim());
  assert.ok(keys.includes('DATABASE_URL'), 'DATABASE_URL missing');
  assert.ok(keys.includes('POSTGRES_PASSWORD'), 'POSTGRES_PASSWORD missing');
  const placeholder = /change-me|placeholder|<[^>]+>/i;
  for (const line of lines.filter((l) => /PASSWORD|SECRET/i.test(l.split('=')[0]))) {
    assert.match(line, placeholder, `not an obvious placeholder: ${line.split('=')[0]}`);
  }
});

test('git: .env is ignored and .env.example is not ignored', () => {
  assert.equal(git(['check-ignore', '-q', '.env']).status, 0, '.env should be ignored');
  assert.equal(
    git(['check-ignore', '-q', '.env.example']).status,
    1,
    '.env.example must not be ignored',
  );
});

// Spec: local-dev-environment / "Postgres is published on loopback only" (DEV-1006 task 2.2).
test('compose: Port binding is loopback', () => {
  readCompose();
  const r = compose(['config', '--format', 'json'], {
    POSTGRES_PASSWORD: 'test-only-value',
    POSTGRES_PORT: '54329',
  });
  assert.equal(r.error, undefined, String(r.error));
  assert.equal(r.status, 0, r.stderr);
  const config = JSON.parse(r.stdout);
  const ports = config.services?.postgres?.ports ?? [];
  const entry = ports.find((p) => Number(p.target) === 5432);
  assert.ok(entry, 'postgres has no published port entry for 5432');
  assert.equal(String(entry.published), '54329');
  assert.equal(entry.host_ip, '127.0.0.1', 'postgres port must be bound to 127.0.0.1 only');
});

const freePort = () =>
  new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });

const tcpConnect = (port) =>
  new Promise((resolveConn, reject) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(5000, () => socket.destroy(new Error('connect timeout')));
    socket.once('connect', () => {
      socket.end();
      resolveConn();
    });
    socket.once('error', reject);
  });

test(
  'compose: Local clients still connect (throwaway Compose project)',
  { timeout: 180000 },
  async () => {
    const project = `ttt-loopback-${process.pid}-${Date.now().toString(36)}`;
    const port = await freePort();
    const composeEnv = {
      ...process.env,
      POSTGRES_PASSWORD: 'test-only-pw',
      POSTGRES_PORT: String(port),
      POSTGRES_USER: 'tasktracker',
      POSTGRES_DB: 'tasktracker',
    };
    const dc = (args) =>
      spawnSync(`docker compose -p ${project} ${args}`, {
        cwd: repoRoot,
        env: composeEnv,
        shell: true,
        encoding: 'utf8',
        timeout: 150000,
      });
    let down;
    try {
      const up = dc('up -d --wait');
      if (up.status !== 0) {
        assert.fail(`compose up failed:
${up.stdout}${up.stderr}`);
      }
      await tcpConnect(port);
      const bound = dc('port postgres 5432');
      assert.equal(bound.status, 0, bound.stderr);
      assert.match(
        bound.stdout.trim(),
        new RegExp(`^127\.0\.0\.1:${port}$`),
        'postgres must not be published on all interfaces',
      );
    } finally {
      down = dc('down -v');
    }
    assert.equal(
      down.status,
      0,
      `compose down failed:
${down.stdout}${down.stderr}`,
    );
  },
);
