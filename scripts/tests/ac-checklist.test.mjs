// Spec: DEV-1001 task 6.2 - every DEV-5 acceptance criterion (1-6) maps to evidence.
// Dependency-free: node:test + node:assert only. Never reads secret files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPinning } from '../check-pinning.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const checklistPath = resolve(repoRoot, 'docs', 'evidence', 'DEV-1001', 'ac-checklist.md');

const COMMAND = /^(pnpm|docker|git|openspec|node)(\s|$)/;
const GLOB = /[*?<>{}[\]$|]/;

const read = () => {
  assert.ok(existsSync(checklistPath), 'docs/evidence/DEV-1001/ac-checklist.md exists');
  return readFileSync(checklistPath, 'utf8').replace(/\r\n/g, '\n');
};
const backticks = (text) => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim());
const rows = () =>
  read()
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .map((l) =>
      l
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((c) => c.trim()),
    );
const rowFor = (n) => rows().find((cells) => new RegExp(`^${n}(\\D|$)`).test(cells[0] ?? ''));

test('ac-checklist.md exists', () => {
  assert.ok(existsSync(checklistPath), 'docs/evidence/DEV-1001/ac-checklist.md exists');
});

for (const n of [1, 2, 3, 4, 5, 6]) {
  test(`criterion ${n} has a Pass row with backticked evidence`, () => {
    const row = rowFor(n);
    assert.ok(row, `table row starting with ${n}`);
    assert.ok(row.length >= 3, `row ${n} has criterion, status and evidence cells`);
    assert.match(row[1], /^Pass\b/, `row ${n} status is Pass`);
    const refs = backticks(row.slice(2).join('|'));
    assert.ok(
      refs.some((r) => COMMAND.test(r) || r.includes('/') || /\.\w+$/.test(r)),
      `row ${n} has a backticked command or path`,
    );
  });
}

test('every backticked repo path in the checklist exists on disk', () => {
  const text = read();
  const paths = backticks(text).filter(
    (t) =>
      !COMMAND.test(t) && !/\s/.test(t) && !GLOB.test(t) && (t.includes('/') || /\.\w+$/.test(t)),
  );
  assert.ok(paths.length > 0, 'checklist references at least one repo path');
  for (const p of paths) {
    assert.ok(existsSync(resolve(repoRoot, p.replace(/\/$/, ''))), `path exists: ${p}`);
  }
});

test('pinning check reports no violations (AC 2: no latest / ranges)', () => {
  assert.deepEqual(checkPinning(repoRoot), []);
});
