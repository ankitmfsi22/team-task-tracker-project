// Spec: containerized-app and local-dev-environment (DEV-1018 task 2.1).
// Dependency-free: node:test, file inspection and `docker compose config`. No containers are started.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const composePath = resolve(repoRoot, 'docker-compose.yml');

const REQUIRED_VARS = {
  POSTGRES_PASSWORD: 'test-only-value',
  JWT_ACCESS_SECRET: 'test-only-access',
  JWT_REFRESH_SECRET: 'test-only-refresh',
  SEED_DEMO_PASSWORD: 'test-only-demo',
};

// Controlled environment and an empty env file so no real one is read; `omit` leaves variables unset.
const compose = (args, omit = []) => {
  const dir = mkdtempSync(join(tmpdir(), 'docker-test-'));
  try {
    const emptyFile = join(dir, 'empty.env');
    writeFileSync(emptyFile, '');
    const env = { ...process.env };
    for (const key of Object.keys(REQUIRED_VARS)) delete env[key];
    Object.assign(env, REQUIRED_VARS);
    for (const key of omit) delete env[key];
    const r = spawnSync(
      'docker',
      ['compose', '--env-file', emptyFile, '-f', composePath, ...args],
      {
        encoding: 'utf8',
        env,
        cwd: repoRoot,
      },
    );
    return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', error: r.error };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const composeJson = () => {
  const r = compose(['config', '--format', 'json']);
  assert.equal(r.error, undefined, String(r.error));
  assert.equal(r.status, 0, r.stderr);
  return JSON.parse(r.stdout);
};

const dockerfiles = ['backend/Dockerfile', 'frontend/Dockerfile'];

const readDockerfile = (rel) => {
  const p = resolve(repoRoot, rel);
  assert.ok(existsSync(p), `${rel} is missing`);
  // Join line continuations, drop comments.
  return readFileSync(p, 'utf8')
    .replace(/\\\r?\n/g, ' ')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
};

const parseStages = (rel) => {
  const stages = [];
  for (const line of readDockerfile(rel)) {
    const from = line.match(/^FROM\s+(?:--\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i);
    if (from) {
      stages.push({ image: from[1], name: from[2], lines: [] });
    } else if (stages.length > 0) {
      stages[stages.length - 1].lines.push(line);
    }
  }
  return stages;
};

// Spec: containerized-app / "Dockerfile properties hold".
for (const rel of dockerfiles) {
  test(`${rel}: every FROM has an exact tag, no latest, no major-only tag; multi-stage`, () => {
    const stages = parseStages(rel);
    assert.ok(stages.length > 1, 'expected a multi-stage build');
    const names = new Set();
    for (const stage of stages) {
      if (!names.has(stage.image)) {
        const tag = stage.image.split(':')[1];
        assert.ok(tag, `FROM ${stage.image} has no tag`);
        assert.notEqual(tag, 'latest', `FROM ${stage.image} uses latest`);
        assert.match(tag, /^\d+\.\d+\.\d+/, `FROM ${stage.image} is not an exact version tag`);
      }
      if (stage.name) names.add(stage.name);
    }
  });

  test(`${rel}: the final stage sets a non-root USER`, () => {
    const stages = parseStages(rel);
    assert.ok(stages.length > 0, 'no FROM found');
    const users = stages[stages.length - 1].lines
      .filter((l) => /^USER\s/i.test(l))
      .map((l) => l.split(/\s+/)[1]);
    assert.ok(users.length > 0, 'final stage has no USER');
    const last = users[users.length - 1];
    assert.ok(!/^(root|0)(:.*)?$/.test(last), `final USER is root: ${last}`);
  });

  // Spec: containerized-app / "Build context excludes secrets" (Dockerfile half).
  test(`${rel}: no ENV or ARG carries a secret`, () => {
    for (const line of readDockerfile(rel)) {
      const m = line.match(/^(ENV|ARG)\s+(.+)$/i);
      if (!m) continue;
      const names = [...m[2].matchAll(/(?:^|\s)([A-Za-z_][A-Za-z0-9_]*)(?:=|\s|$)/g)].map(
        (x) => x[1],
      );
      for (const name of names) {
        assert.doesNotMatch(
          name,
          /secret|password|token|key/i,
          `${m[1]} ${name} looks like a secret`,
        );
      }
    }
  });
}

// A stage may start FROM an earlier stage alias; resolve it to the registry image it derives from.
const rootImages = (rel) => {
  const byName = new Map();
  return parseStages(rel).map((s) => {
    const root = byName.get(s.image) ?? s.image;
    if (s.name) byName.set(s.name, root);
    return root;
  });
};

test('Dockerfiles use the designed base images', () => {
  const backend = rootImages('backend/Dockerfile');
  assert.ok(backend.length > 0 && backend.every((i) => i === 'node:22.23.3-slim'), String(backend));
  const frontend = rootImages('frontend/Dockerfile');
  assert.ok(
    frontend.includes('node:22.23.3-slim'),
    'frontend build stage must use node:22.23.3-slim',
  );
  assert.equal(frontend[frontend.length - 1], 'nginxinc/nginx-unprivileged:1.30.6-alpine');
});

// Spec: containerized-app / "Build context excludes secrets".
test('.dockerignore exists and excludes environment files', () => {
  const p = resolve(repoRoot, '.dockerignore');
  assert.ok(existsSync(p), '.dockerignore is missing');
  const entries = readFileSync(p, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));
  assert.ok(
    entries.some((e) => /^(\*\*\/)?\.env(\*|\.\*)?$/.test(e)),
    `no env-file exclusion in: ${entries.join(', ')}`,
  );
});

// Spec: containerized-app / "Healthchecks are defined".
test('compose: postgres, backend and frontend have healthchecks; dependencies wait correctly', () => {
  const { services } = composeJson();
  for (const name of ['postgres', 'backend', 'frontend']) {
    assert.ok(services?.[name]?.healthcheck, `${name} has no healthcheck`);
  }
  assert.equal(services.backend.depends_on?.migrate?.condition, 'service_completed_successfully');
  assert.equal(services.migrate.depends_on?.postgres?.condition, 'service_healthy');
});

// Spec: containerized-app / "Missing secret is rejected".
for (const name of ['JWT_ACCESS_SECRET', 'SEED_DEMO_PASSWORD']) {
  test(`compose: missing ${name} fails and names the variable`, () => {
    const r = compose(['config'], [name]);
    assert.notEqual(r.status, 0, `expected non-zero exit without ${name}`);
    assert.match(r.stderr, new RegExp(name));
  });
}

// Spec: containerized-app / "Published ports".
test('compose: only frontend (8080) and postgres publish ports, on 127.0.0.1', () => {
  const { services } = composeJson();
  const published = Object.entries(services).flatMap(([name, svc]) =>
    (svc.ports ?? []).map((p) => ({ name, ...p })),
  );
  assert.deepEqual([...new Set(published.map((p) => p.name))].sort(), ['frontend', 'postgres']);
  for (const p of published) {
    assert.equal(p.host_ip, '127.0.0.1', `${p.name} port is not bound to 127.0.0.1`);
  }
  const web = published.find((p) => p.name === 'frontend');
  assert.equal(String(web.published), '8080');
  assert.equal(services.backend?.ports ?? undefined, undefined, 'backend must not publish ports');
});

// Spec: local-dev-environment / "E2E gate starts only the database".
test('scripts/e2e.mjs starts only the postgres service', () => {
  const text = readFileSync(resolve(repoRoot, 'scripts', 'e2e.mjs'), 'utf8');
  assert.match(text, /docker compose[^\n`'"]*\bup -d --wait postgres\b/);
});

// Design decision 4: nginx serves the SPA and proxies /api/ to the backend (one origin).
test('frontend/nginx.conf proxies /api/ to the backend service', () => {
  const p = resolve(repoRoot, 'frontend', 'nginx.conf');
  assert.ok(existsSync(p), 'frontend/nginx.conf is missing');
  const text = readFileSync(p, 'utf8');
  assert.match(text, /location\s+\/api\/\s*\{[^}]*proxy_pass\s+http:\/\/backend:3000/);
});
