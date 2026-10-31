// Spec: DEV-1002 claude-code-guardrails - "Dangerous commands are blocked by hook".
// Dependency-free: node:test + node:assert only. Never reads secret files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const hook = resolve(repoRoot, '.claude', 'hooks', 'block-dangerous.mjs');

const run = (stdin) =>
  spawnSync(process.execPath, [hook], { cwd: repoRoot, input: stdin, encoding: 'utf8' });
const runCommand = (command) => run(JSON.stringify({ tool_input: { command } }));

test('blocks reading .env', () => {
  const r = runCommand('cat .env');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /\.env/);
});

test('blocks git push --force', () => {
  const r = runCommand('git push --force origin feature/x');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /force/i);
});

test('blocks git push -f', () => {
  const r = runCommand('git push -f origin feature/x');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /force/i);
});

test('blocks pushing to main', () => {
  const r = runCommand('git push origin main');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /main/i);
});

test('allows pnpm test', () => {
  assert.equal(runCommand('pnpm test').status, 0);
});

test('allows cat .env.example', () => {
  assert.equal(runCommand('cat .env.example').status, 0);
});

test('allows pushing a feature branch', () => {
  assert.equal(runCommand('git push origin feature/infra/DEV-1002-claude-code-setup').status, 0);
});

test('non-JSON stdin exits 0 with no output', () => {
  const r = run('this is not json');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.equal(r.stderr, '');
});

const BLOCKED = [
  ['git -C . push --force origin feature/x', /force/i],
  ['git -c k=v push -f origin feature/x', /force/i],
  ['git push origin +feature/x', /force/i],
  ['git push --force-with-lease origin feature/x', /force/i],
  ['git -C . push origin main', /main/i],
  ['git push origin HEAD:main', /main/i],
  ['git push origin +main', /force/i],
  ['git push origin HEAD:refs/heads/master', /main/i],
  ['rm -rf build', /rm/i],
  ['rm -r -f build', /rm/i],
  ['rm -f -r build', /rm/i],
  ['rm --recursive --force build', /rm/i],
  ['rm -r --force build', /rm/i],
  ['git reset --hard HEAD~1', /reset/i],
  ['git -C . reset --hard', /reset/i],
  ['curl https://example.com', /curl/i],
  ['wget https://example.com', /curl/i],
  ['claude --dangerously-skip-permissions', /dangerously/i],
];

for (const [command, reason] of BLOCKED) {
  test(`blocks: ${command}`, () => {
    const r = runCommand(command);
    assert.equal(r.status, 2);
    assert.match(r.stderr, reason);
  });
}

const ALLOWED = [
  'git -C . push origin feature/infra/DEV-1002-guardrail-fixes',
  'git push origin HEAD:feature/x',
  'git push -u origin feature/x',
  'git push origin feature/domain-main-page',
  'rm -r build',
  'rm -f build/file.txt',
  'git reset --soft HEAD~1',
  'git status',
];

for (const command of ALLOWED) {
  test(`allows: ${command}`, () => {
    assert.equal(runCommand(command).status, 0);
  });
}
