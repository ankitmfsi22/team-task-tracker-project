// Spec: DEV-1001 task 6.4 - CI run on the pushed branch passed; link + result saved in docs/evidence/DEV-1001/ci-run.md.
// Dependency-free and offline: node:test + node:assert + node:child_process (local git only). No network / gh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const evidencePath = resolve(repoRoot, 'docs', 'evidence', 'DEV-1001', 'ci-run.md');

const read = () => readFileSync(evidencePath, 'utf8').replace(/\r\n/g, '\n');
const git = (...args) => spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
const header = (text, name) => {
  const m = text.match(new RegExp(`^${name}:[ \\t]*(.+?)[ \\t]*$`, 'm'));
  return m ? m[1] : null;
};

test('CI evidence file exists', () => {
  assert.ok(existsSync(evidencePath), 'docs/evidence/DEV-1001/ci-run.md must exist');
});

test('Run line is a GitHub Actions run URL for the project repo', () => {
  const run = header(read(), 'Run');
  assert.ok(run, 'missing "Run:" line');
  assert.match(
    run,
    /^https:\/\/github\.com\/ankitmfsi22\/team-task-tracker-project\/actions\/runs\/\d+$/,
  );
});

test('Commit is a 40-hex sha existing in this repo and an ancestor of HEAD', () => {
  const sha = header(read(), 'Commit');
  assert.ok(sha, 'missing "Commit:" line');
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.equal(git('cat-file', '-e', `${sha}^{commit}`).status, 0, 'commit not found in repo');
  assert.equal(
    git('merge-base', '--is-ancestor', sha, 'HEAD').status,
    0,
    'commit is not an ancestor of HEAD',
  );
});

test('Conclusion is success', () => {
  assert.equal(header(read(), 'Conclusion'), 'success');
});

test('Date header is YYYY-MM-DD', () => {
  assert.match(header(read(), 'Date') ?? '', /^\d{4}-\d{2}-\d{2}$/);
});

test('every CI step is listed and none is failure/cancelled/skipped', () => {
  const text = read();
  for (const step of [
    'frozen-lockfile',
    'format:check',
    'lint',
    'typecheck',
    'test',
    'build',
    'openspec validate',
    'audit',
  ]) {
    assert.ok(text.includes(step), `evidence must mention step "${step}"`);
  }
  const bad = text
    .split('\n')
    .filter((l) => /^\s*(?:[-*|]|\d+\.)/.test(l))
    .filter((l) => /\b(failure|failed|cancelled|canceled|skipped)\b/i.test(l));
  assert.deepEqual(bad, [], 'no step line may report failure/cancelled/skipped');
});
