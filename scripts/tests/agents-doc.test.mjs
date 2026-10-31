// Spec: DEV-1001 task 5.2 - AGENTS.md describes the real repo structure and key commands.
// Dependency-free: node:test + node:assert + node:child_process only.
// build/lint/typecheck/test are intentionally NOT spawned here (would recurse).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const agents = readFileSync(resolve(repoRoot, 'AGENTS.md'), 'utf8').replace(/\r\n/g, '\n');
const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));

// Returns the body of the "## <heading prefix>..." section (up to the next "## ").
const section = (headingPrefix) => {
  const lines = agents.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${headingPrefix}`));
  assert.ok(start >= 0, `AGENTS.md has a "## ${headingPrefix}" section`);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

const backticks = (text) => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

test('AGENTS.md no longer contains stale "planned" / "created in" phrases', () => {
  assert.ok(!agents.includes('planned, not yet created'), 'stale phrase: planned, not yet created');
  assert.ok(!agents.includes('created in DEV-1001'), 'stale phrase: created in DEV-1001');
});

test('repo-structure section lists paths that exist on disk', () => {
  const body = section('Repo structure');
  const paths = backticks(body).filter((p) => /\/$/.test(p) || p === 'docker-compose.yml');
  for (const required of [
    'backend/',
    'frontend/',
    'packages/shared/',
    'scripts/',
    'docs/',
    'openspec/',
    '.claude/',
    '.github/workflows/',
    '.husky/',
    'docker-compose.yml',
  ]) {
    assert.ok(paths.includes(required), `repo-structure section mentions \`${required}\``);
  }
  for (const p of paths) {
    assert.ok(existsSync(resolve(repoRoot, p)), `${p} exists on disk`);
  }
});

test('every pnpm command in Key commands is a root package.json script', () => {
  const body = section('Key commands');
  const scripts = backticks(body)
    .filter((c) => c.startsWith('pnpm '))
    .map((c) => c.split(/\s+/)[1]);
  for (const name of [
    'build',
    'lint',
    'typecheck',
    'test',
    'test:e2e',
    'format',
    'format:check',
    'lighthouse',
  ]) {
    assert.ok(scripts.includes(name), `Key commands lists \`pnpm ${name}\``);
  }
  for (const name of scripts) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(pkg.scripts, name),
      `package.json has script "${name}"`,
    );
  }
});

test('Key commands still mention openspec validate and the integration gate rule', () => {
  const body = section('Key commands');
  assert.ok(body.includes('openspec validate --strict'));
  assert.ok(body.includes('Build, lint, typecheck and test MUST all pass'));
});

for (const name of ['format:check', 'test:e2e', 'lighthouse']) {
  test(`pnpm ${name} runs and exits 0`, () => {
    const r = spawnSync(`pnpm ${name}`, { cwd: repoRoot, shell: true, encoding: 'utf8' });
    assert.equal(r.status, 0, `pnpm ${name} exit ${r.status}\n${r.stdout}\n${r.stderr}`);
  });
}
