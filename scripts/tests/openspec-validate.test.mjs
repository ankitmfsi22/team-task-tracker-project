// Spec: DEV-1001 task 6.3 - `openspec validate dev-1001-project-setup --strict` passes
// and the change folder is complete. Dependency-free: node:test + node:assert only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const change = 'dev-1001-project-setup';
const changeDir = resolve(repoRoot, 'openspec', 'changes', change);

test('openspec validate --strict passes for the change', { timeout: 60000 }, () => {
  const result = spawnSync(`pnpm exec openspec validate ${change} --strict`, {
    cwd: repoRoot,
    shell: true,
    encoding: 'utf8',
    timeout: 55000,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  assert.equal(result.status, 0, `exit code 0 expected, output:\n${output}`);
  assert.match(output, /valid/i, `output says the change is valid:\n${output}`);
  assert.doesNotMatch(output, /\binvalid\b/i, `output must not say invalid:\n${output}`);
});

test('change folder contains every required artifact', () => {
  assert.ok(existsSync(changeDir), `${changeDir} exists`);
  for (const file of ['proposal.md', 'design.md', 'tasks.md', 'approvals.md', 'review-log.md']) {
    assert.ok(existsSync(resolve(changeDir, file)), `${file} exists`);
  }
  const specsDir = resolve(changeDir, 'specs');
  assert.ok(existsSync(specsDir) && statSync(specsDir).isDirectory(), 'specs/ exists');
  const specs = readdirSync(specsDir).filter((d) => existsSync(resolve(specsDir, d, 'spec.md')));
  assert.ok(specs.length >= 1, 'specs/ contains at least one <capability>/spec.md');
});

test('approvals.md has a Gate 1 row with decision Approved', () => {
  const text = readFileSync(resolve(changeDir, 'approvals.md'), 'utf8').replace(/\r\n/g, '\n');
  const rows = text
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim()),
    );
  const gate1 = rows.find((cells) => cells[0] === 'Gate 1');
  assert.ok(gate1, 'a Gate 1 row exists');
  assert.equal(gate1[2], 'Approved', 'Gate 1 decision is Approved');
});
