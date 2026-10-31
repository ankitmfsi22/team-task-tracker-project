// Spec: DEV-1005 requirement "Archived changes are complete and approved".
// Dependency-free: node:test + node:assert only.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkChanges } from '../check-changes.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const realArchive = resolve(repoRoot, 'openspec', 'changes', 'archive');

const tempRoots = [];
after(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

function approvals({ gate1 = 'Approved', gate2 = 'Approved' } = {}) {
  return [
    '# Approvals: fixture (DEV-9999)',
    '',
    '| Gate   | Artifacts reviewed                       | Decision (Approved/Changes requested) | Approver | Date | Notes |',
    '| ------ | ---------------------------------------- | ------------------------------------- | -------- | ---- | ----- |',
    `| Gate 1 | proposal.md, design.md, tasks.md, specs/ | ${gate1} | human | 2026-10-31 |  |`,
    `| Gate 2 | PR, review-log.md                        | ${gate2} | human | 2026-10-31 |  |`,
    '',
  ].join('\n');
}

function reviewLog(status = 'Fixed') {
  return [
    '# Review log',
    '',
    '- Change: fixture (DEV-9999)',
    '',
    '| Severity | file:line | Issue | Fix | Status |',
    '| -------- | --------- | ----- | --- | ------ |',
    `| Minor | a.ts:1 | issue | fix | ${status} |`,
    '',
  ].join('\n');
}

// Builds <tmp>/<name>/ as a complete change and returns { archiveDir, changeDir, name }.
function makeFixture({
  name = '2026-10-31-dev-9999-fixture',
  omit,
  approvalsText,
  reviewLogText,
} = {}) {
  const archiveDir = mkdtempSync(join(tmpdir(), 'change-completeness-'));
  tempRoots.push(archiveDir);
  const changeDir = join(archiveDir, name);
  mkdirSync(join(changeDir, 'specs', 'cap'), { recursive: true });
  writeFileSync(join(changeDir, 'specs', 'cap', 'spec.md'), '## ADDED Requirements\n');
  const files = {
    'proposal.md': '# Proposal\n',
    'design.md': '# Design\n',
    'tasks.md': '- [x] 1.1 task\n',
    'approvals.md': approvalsText ?? approvals(),
    'review-log.md': reviewLogText ?? reviewLog(),
  };
  for (const [file, body] of Object.entries(files)) {
    if (file !== omit) writeFileSync(join(changeDir, file), body);
  }
  return { archiveDir, name };
}

test('complete archive passes: real archived changes report no problems', () => {
  assert.deepEqual(checkChanges(realArchive), []);
});

test('missing artifact is reported: change without design.md', () => {
  const { archiveDir, name } = makeFixture({ omit: 'design.md' });
  const problems = checkChanges(archiveDir);
  assert.ok(
    problems.some((p) => p.includes(name) && p.includes('design.md')),
    `expected a problem naming ${name} and design.md, got: ${JSON.stringify(problems)}`,
  );
});

test('unapproved gate is rejected: Gate 2 decision empty', () => {
  const { archiveDir, name } = makeFixture({ approvalsText: approvals({ gate2: '' }) });
  const problems = checkChanges(archiveDir);
  assert.ok(
    problems.some((p) => p.includes(name) && p.includes('approvals.md')),
    `expected a problem naming ${name} and approvals.md, got: ${JSON.stringify(problems)}`,
  );
});

test('unapproved gate is rejected: Gate 2 decision Changes requested', () => {
  const { archiveDir, name } = makeFixture({
    approvalsText: approvals({ gate2: 'Changes requested' }),
  });
  const problems = checkChanges(archiveDir);
  assert.ok(
    problems.some((p) => p.includes(name) && p.includes('approvals.md')),
    `expected a problem naming ${name} and approvals.md, got: ${JSON.stringify(problems)}`,
  );
});

test('open finding is rejected: review-log row with status Open', () => {
  const { archiveDir, name } = makeFixture({ reviewLogText: reviewLog('Open') });
  const problems = checkChanges(archiveDir);
  assert.ok(
    problems.some((p) => p.includes(name) && p.includes('review-log.md')),
    `expected a problem naming ${name} and review-log.md, got: ${JSON.stringify(problems)}`,
  );
});
