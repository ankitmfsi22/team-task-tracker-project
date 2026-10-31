// Spec: workspace-quality-gates / "Continuous integration runs the gates" (scenarios "Workflow
// triggers and steps", "Actions are pinned", "Versions come from the repository") and
// dependency-pinning (DEV-1001 task 3.5).
// Dependency-free: no YAML parser, so the workflow is inspected with line/regex logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPinning } from '../check-pinning.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const workflowRel = '.github/workflows/ci.yml';
const workflowPath = resolve(repoRoot, workflowRel);

const readWorkflow = () => {
  assert.ok(existsSync(workflowPath), `${workflowRel} is missing`);
  return readFileSync(workflowPath, 'utf8');
};
// Non-comment lines.
const codeLines = () =>
  readWorkflow()
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l));

test('ci.yml exists', () => {
  assert.ok(existsSync(workflowPath), `${workflowRel} is missing`);
});

test('triggers on pull_request and on push to main', () => {
  const lines = codeLines();
  const text = lines.join('\n');
  assert.match(text, /^\s*pull_request\s*:?/m, 'pull_request trigger missing');
  const pushIdx = lines.findIndex((l) => /^\s*push\s*:/.test(l));
  assert.notEqual(pushIdx, -1, 'push trigger missing');
  // branches list must appear right after push (before the next top-level/sibling trigger or jobs).
  const pushIndent = lines[pushIdx].match(/^\s*/)[0].length;
  const block = [];
  for (const l of lines.slice(pushIdx + 1)) {
    if (l.trim() === '') continue;
    if (l.match(/^\s*/)[0].length <= pushIndent) break;
    block.push(l);
  }
  const blockText = block.join('\n');
  assert.match(blockText, /branches\s*:/, 'push has no branches filter');
  assert.match(blockText, /(^|[\s\[,'"-])main($|[\s\],'"])/m, 'push branches do not contain main');
});

const GATES = [
  'pnpm install --frozen-lockfile',
  'pnpm format:check',
  'pnpm lint',
  'pnpm typecheck',
  'pnpm test',
  'pnpm build',
  'openspec validate --all --strict',
  'pnpm audit --audit-level=high',
];

test('gate commands appear as run steps in the required order', () => {
  const runs = codeLines()
    .map((l) => /^\s*(?:-\s*)?run:\s*(.+?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1].replace(/^['"]|['"]$/g, '').replace(/^pnpm exec /, ''));
  let from = 0;
  for (const gate of GATES) {
    const want = gate.replace(/^pnpm exec /, '');
    const idx = runs.findIndex((r, i) => i >= from && r === want);
    assert.notEqual(
      idx,
      -1,
      `run step "${gate}" missing or out of order; run steps: ${JSON.stringify(runs)}`,
    );
    from = idx + 1;
  }
});

test('Node comes from .nvmrc with no hard-coded node-version or pnpm version input', () => {
  const lines = codeLines();
  assert.ok(
    lines.some((l) => /^\s*node-version-file:\s*['"]?\.nvmrc['"]?\s*$/.test(l)),
    'node-version-file: .nvmrc missing',
  );
  assert.ok(!lines.some((l) => /^\s*node-version\s*:/.test(l)), 'hard-coded node-version found');
  assert.ok(!lines.some((l) => /^\s*version\s*:/.test(l)), 'a version: input (pnpm) is set');
});

test('every uses: ref is an exact version tag', () => {
  const refs = codeLines()
    .map((l) => /^\s*(?:-\s*)?uses:\s*(.+?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => m[1].replace(/^['"]|['"]$/g, ''));
  assert.ok(refs.length > 0, 'no uses: references found');
  for (const ref of refs) {
    const version = ref.split('@')[1] ?? '';
    assert.match(version, /^v?\d+\.\d+\.\d+$/, `action ref "${ref}" is not an exact version tag`);
  }
});

test('pinning check reports no violations for the workflow', () => {
  readWorkflow();
  const violations = checkPinning(repoRoot).filter((v) =>
    v.split(String.fromCharCode(92)).join('/').includes('.github/workflows/'),
  );
  assert.deepEqual(violations, []);
});

test('root devDependency @fission-ai/openspec is exactly 1.16.0', () => {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies?.['@fission-ai/openspec'], '1.16.0');
});
