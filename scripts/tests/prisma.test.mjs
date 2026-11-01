// Spec: local-dev-environment / "Prisma connects to PostgreSQL" (scenarios "Prisma validates",
// "Prisma reaches the database", "Missing DATABASE_URL") (DEV-1001 task 4.2).
// The connectivity test starts its own throwaway Compose project and always tears it down.
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
  assert.doesNotMatch(schema, /postgres(ql)?:\/\//);

  const config = read('prisma.config.ts');
  assert.match(config, /env\(\s*['"]DATABASE_URL['"]\s*\)/);
  assert.match(config, /from ['"]prisma\/config['"]/);
  assert.doesNotMatch(config, /postgres(ql)?:\/\//);
});

// Spec (DEV-1007, MODIFIED): "Client package is deferred" -- client and adapter are present
// at exact versions because models exist; the schema defines only User, RefreshToken, Project
// and ProjectMember (DEV-1008 adds Task, DEV-1010 adds Comment and Activity).
const modelBlock = (schema, name) =>
  schema.match(new RegExp(`^model\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm'))?.[1];

test('Client package is deferred: client and adapter pinned, schema has only User, RefreshToken, Project, ProjectMember, Task, Comment and Activity', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.dependencies?.['@prisma/client'], '7.10.1');
  assert.equal(pkg.dependencies?.['@prisma/adapter-pg'], '7.10.1');

  const schema = read('prisma/schema.prisma');
  const models = [...schema.matchAll(/^\s*model\s+(\w+)\s*\{/gm)].map((m) => m[1]).sort();
  assert.deepEqual(models, [
    'Activity',
    'Comment',
    'Project',
    'ProjectMember',
    'RefreshToken',
    'Task',
    'User',
  ]);
});

const enumValues = (schema, name) => {
  const body = schema.match(new RegExp(`^enum\\s+${name}\\s*\\{([\\s\\S]*?)^\\}`, 'm'))?.[1];
  assert.ok(body, `enum ${name} must exist`);
  return body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'));
};

test('Schema: TaskStatus and TaskPriority enums', () => {
  const schema = read('prisma/schema.prisma');
  assert.deepEqual(enumValues(schema, 'TaskStatus'), ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']);
  assert.deepEqual(enumValues(schema, 'TaskPriority'), ['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
});

test('Schema: Task model fields, relations, indexes and back-relations', () => {
  const schema = read('prisma/schema.prisma');
  const task = modelBlock(schema, 'Task');
  assert.ok(task, 'model Task must exist');
  assert.match(task, /^\s*id\s+String\s+@id\b.*@default\(uuid\(\)\).*@db\.Uuid/m);
  assert.match(task, /^\s*projectId\s+String\s+@db\.Uuid/m);
  assert.match(task, /^\s*title\s+String\b(?!\?)/m);
  assert.match(task, /^\s*description\s+String\?/m);
  assert.match(task, /^\s*status\s+TaskStatus\s+@default\(TODO\)/m);
  assert.match(task, /^\s*priority\s+TaskPriority\s+@default\(MEDIUM\)/m);
  assert.match(task, /^\s*dueDate\s+DateTime\?/m);
  assert.match(task, /^\s*assigneeId\s+String\?\s+@db\.Uuid/m);
  assert.match(task, /^\s*createdById\s+String\s+@db\.Uuid/m);
  assert.match(task, /^\s*archivedAt\s+DateTime\?/m);
  assert.match(task, /^\s*createdAt\s+DateTime\s+@default\(now\(\)\)/m);
  assert.match(task, /^\s*updatedAt\s+DateTime\s+@updatedAt/m);
  assert.match(task, /^\s*project\s+Project\s+@relation\(.*onDelete:\s*Cascade/m);
  assert.match(task, /^\s*assignee\s+User\?\s+@relation\(.*onDelete:\s*SetNull/m);
  assert.match(task, /^\s*createdBy\s+User\s+@relation\(.*onDelete:\s*Restrict/m);
  assert.match(task, /^\s*@@index\(\[projectId\]\)/m);
  assert.match(task, /^\s*@@index\(\[assigneeId\]\)/m);

  const project = modelBlock(schema, 'Project');
  assert.ok(project, 'model Project must exist');
  assert.match(project, /^\s*tasks\s+Task\[\]/m);
  const user = modelBlock(schema, 'User');
  assert.ok(user, 'model User must exist');
  assert.match(user, /^\s*assignedTasks\s+Task\[\]\s+@relation\(/m);
  assert.match(user, /^\s*createdTasks\s+Task\[\]\s+@relation\(/m);
});

test('Schema: ProjectRole enum has OWNER and MEMBER', () => {
  const body = read('prisma/schema.prisma').match(/^enum\s+ProjectRole\s*\{([\s\S]*?)^\}/m)?.[1];
  assert.ok(body, 'enum ProjectRole must exist');
  const values = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('//'));
  assert.deepEqual(values, ['OWNER', 'MEMBER']);
});

test('Schema: Project model fields', () => {
  const project = modelBlock(read('prisma/schema.prisma'), 'Project');
  assert.ok(project, 'model Project must exist');
  assert.match(project, /^\s*id\s+String\s+@id\b.*@default\(uuid\(\)\).*@db\.Uuid/m);
  assert.match(project, /^\s*name\s+String\b/m);
  assert.match(project, /^\s*description\s+String\?/m);
  assert.match(project, /^\s*archivedAt\s+DateTime\?/m);
  assert.match(project, /^\s*createdAt\s+DateTime\s+@default\(now\(\)\)/m);
  assert.match(project, /^\s*members\s+ProjectMember\[\]/m);
});

test('Schema: ProjectMember model fields, cascade relations, composite key and userId index', () => {
  const schema = read('prisma/schema.prisma');
  const pm = modelBlock(schema, 'ProjectMember');
  assert.ok(pm, 'model ProjectMember must exist');
  assert.match(pm, /^\s*projectId\s+String\s+@db\.Uuid/m);
  assert.match(pm, /^\s*userId\s+String\s+@db\.Uuid/m);
  assert.match(pm, /^\s*role\s+ProjectRole\b/m);
  assert.match(pm, /^\s*createdAt\s+DateTime\s+@default\(now\(\)\)/m);
  assert.match(pm, /^\s*project\s+Project\s+@relation\(.*onDelete:\s*Cascade/m);
  assert.match(pm, /^\s*user\s+User\s+@relation\(.*onDelete:\s*Cascade/m);
  assert.match(pm, /^\s*@@id\(\[projectId,\s*userId\]\)/m);
  assert.match(pm, /^\s*@@index\(\[userId\]\)/m);

  const user = modelBlock(schema, 'User');
  assert.ok(user, 'model User must exist');
  assert.match(user, /^\s*memberships\s+ProjectMember\[\]/m);
});

test('Schema: User model fields', () => {
  const user = modelBlock(read('prisma/schema.prisma'), 'User');
  assert.ok(user, 'model User must exist');
  assert.match(user, /^\s*id\s+String\s+@id\b.*@default\(uuid\(\)\)/m);
  assert.match(user, /^\s*email\s+String\s+@unique\b/m);
  assert.match(user, /^\s*name\s+String\b/m);
  assert.match(user, /^\s*passwordHash\s+String\b/m);
  assert.match(user, /^\s*createdAt\s+DateTime\b/m);
});

test('Schema: RefreshToken model fields, cascade relation and userId index', () => {
  const rt = modelBlock(read('prisma/schema.prisma'), 'RefreshToken');
  assert.ok(rt, 'model RefreshToken must exist');
  assert.match(rt, /^\s*id\s+String\s+@id\b.*@default\(uuid\(\)\)/m);
  assert.match(rt, /^\s*userId\s+String\b/m);
  assert.match(rt, /^\s*tokenHash\s+String\s+@unique\b/m);
  assert.match(rt, /^\s*expiresAt\s+DateTime\b/m);
  assert.match(rt, /^\s*revokedAt\s+DateTime\?/m);
  assert.match(rt, /^\s*createdAt\s+DateTime\b/m);
  assert.match(rt, /^\s*\w+\s+User\s+@relation\(.*onDelete:\s*Cascade/m);
  assert.match(rt, /^\s*@@index\(\[userId\]\)/m);
});

test('Migration directory creates User, RefreshToken, Project, ProjectMember and Task', () => {
  const dir = resolve(backend, 'prisma', 'migrations');
  assert.ok(existsSync(dir), 'backend/prisma/migrations must exist');
  const sqls = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => resolve(dir, d.name, 'migration.sql'))
    .filter((f) => existsSync(f))
    .map((f) => readFileSync(f, 'utf8'));
  assert.ok(sqls.length > 0, 'at least one migration.sql must exist');
  const all = sqls.join('\n');
  assert.match(all, /CREATE TABLE "User"/);
  assert.match(all, /CREATE TABLE "RefreshToken"/);
  assert.match(all, /CREATE TYPE "ProjectRole"/);
  assert.match(all, /CREATE TABLE "Project"/);
  assert.match(all, /CREATE TABLE "ProjectMember"/);
  assert.match(all, /CREATE TYPE "TaskStatus"/);
  assert.match(all, /CREATE TYPE "TaskPriority"/);
  assert.match(all, /CREATE TABLE "Task"/);
  assert.match(all, /PRIMARY KEY \("projectId",\s*"userId"\)/);
  assert.match(
    all,
    /ALTER TABLE "ProjectMember" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("projectId"\)[^;]*ON DELETE CASCADE/,
  );
  assert.match(
    all,
    /ALTER TABLE "ProjectMember" ADD CONSTRAINT "[^"]+" FOREIGN KEY \("userId"\)[^;]*ON DELETE CASCADE/,
  );
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
