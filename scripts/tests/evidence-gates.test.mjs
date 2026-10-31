// Spec: DEV-1001 task 6.1 - fresh-install gate evidence is saved in docs/evidence/DEV-1001/.
// Dependency-free: node:test + node:assert + node:child_process only.
// The gate commands are intentionally NOT spawned here (would recurse); only the evidence file is checked.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const evidencePath = resolve(repoRoot, 'docs', 'evidence', 'DEV-1001', 'gates-fresh-install.md');

const commands = [
  'pnpm install --frozen-lockfile',
  'pnpm build',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm format:check',
];

const read = () => readFileSync(evidencePath, 'utf8').replace(/\r\n/g, '\n');

// Returns the text of the "## <command>" block (up to the next "## " heading or EOF), or null.
const block = (text, command) => {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.trimEnd() === `## ${command}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

const git = (...args) => spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

test('evidence file docs/evidence/DEV-1001/gates-fresh-install.md exists', () => {
  assert.ok(existsSync(evidencePath), `missing ${evidencePath}`);
});

test('evidence file has a "## <command>" block for every gate step', () => {
  assert.ok(existsSync(evidencePath), 'evidence file missing');
  const text = read();
  for (const command of commands) {
    assert.notEqual(block(text, command), null, `missing block "## ${command}"`);
  }
});

test('first block is "## pnpm install --frozen-lockfile"', () => {
  assert.ok(existsSync(evidencePath), 'evidence file missing');
  const first = read()
    .split('\n')
    .find((l) => l.startsWith('## '));
  assert.equal(first?.trimEnd(), '## pnpm install --frozen-lockfile');
});

test('each block ends with exactly "exit=0"', () => {
  assert.ok(existsSync(evidencePath), 'evidence file missing');
  const text = read();
  for (const command of commands) {
    const body = block(text, command);
    assert.notEqual(body, null, `missing block "## ${command}"`);
    const exits = body.split('\n').filter((l) => l.trim().startsWith('exit='));
    assert.ok(exits.length > 0, `"${command}" block has no exit= line`);
    assert.equal(exits[exits.length - 1].trim(), 'exit=0', `"${command}" last exit line`);
  }
});

test('header has "Commit: <40-hex sha>" that exists in history and is an ancestor of HEAD', () => {
  assert.ok(existsSync(evidencePath), 'evidence file missing');
  const text = read();
  const m = text.match(/^Commit: ([0-9a-f]{40})\s*$/m);
  assert.ok(m, 'header must contain a line "Commit: <40-hex sha>"');
  const sha = m[1];
  const exists = git('cat-file', '-e', `${sha}^{commit}`);
  assert.equal(exists.status, 0, `commit ${sha} not found in repo history`);
  const ancestor = git('merge-base', '--is-ancestor', sha, 'HEAD');
  assert.equal(ancestor.status, 0, `commit ${sha} is not an ancestor of HEAD`);
});
