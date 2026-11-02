// Spec: DEV-1016 task 4.1 - every spec scenario maps to a test (design decision 6).
// Dependency-free: node:test + node:assert only. Fixtures live under os.tmpdir().
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { checkScenarioMap } from '../lib/scenario-map.mjs';

const realRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const roots = [];

const HEADER = '| Capability | Scenario | Test |\n| --- | --- | --- |\n';

const fixture = ({ specs, files = {}, rows }) => {
  const root = mkdtempSync(join(tmpdir(), 'scenario-map-'));
  roots.push(root);
  for (const [cap, titles] of Object.entries(specs)) {
    mkdirSync(join(root, 'specs', cap), { recursive: true });
    const body = titles.map((t) => `#### Scenario: ${t}\n- **WHEN** x\n- **THEN** y\n`).join('\n');
    writeFileSync(join(root, 'specs', cap, 'spec.md'), `## Requirements\n\n${body}`);
  }
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(
    join(root, 'docs', 'map.md'),
    HEADER + rows.map(([c, s, t]) => `| ${c} | ${s} | ${t} |`).join('\n') + '\n',
  );
  return { repoRoot: root, specDirs: ['specs'], mapPath: 'docs/map.md' };
};

after(() => {
  for (const r of roots) rmSync(r, { recursive: true, force: true });
});

test('all scenarios mapped to existing tests yields no problems', () => {
  const opts = fixture({
    specs: { alpha: ['One', 'Two'] },
    files: { 'tests/a.test.ts': "it('does one'); it('does two');" },
    rows: [
      ['alpha', 'One', 'tests/a.test.ts : does one'],
      ['alpha', 'Two', 'tests/a.test.ts : does two'],
    ],
  });
  assert.deepEqual(checkScenarioMap(opts), []);
});

test('Unmapped scenario fails the check', () => {
  const opts = fixture({
    specs: { alpha: ['One', 'Orphan scenario'] },
    files: { 'tests/a.test.ts': "it('does one');" },
    rows: [['alpha', 'One', 'tests/a.test.ts : does one']],
  });
  const problems = checkScenarioMap(opts);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /alpha/);
  assert.match(problems[0], /Orphan scenario/);
});

test('Row pointing to a missing test fails the check (file missing)', () => {
  const opts = fixture({
    specs: { alpha: ['One'] },
    rows: [['alpha', 'One', 'tests/gone.test.ts : does one']],
  });
  const problems = checkScenarioMap(opts);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /One/);
  assert.match(problems[0], /gone\.test\.ts/);
});

test('Row pointing to a missing test fails the check (name not in file)', () => {
  const opts = fixture({
    specs: { alpha: ['One'] },
    files: { 'tests/a.test.ts': "it('something else');" },
    rows: [['alpha', 'One', 'tests/a.test.ts : does one']],
  });
  const problems = checkScenarioMap(opts);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /One/);
  assert.match(problems[0], /does one/);
});

test('review: rows are accepted without a test file', () => {
  const opts = fixture({
    specs: { alpha: ['One'] },
    rows: [['alpha', 'One', 'review: checked by the reviewer sub-agent']],
  });
  assert.deepEqual(checkScenarioMap(opts), []);
});

test('duplicate scenario titles in two capabilities are matched per capability', () => {
  const opts = fixture({
    specs: { alpha: ['Same title'], beta: ['Same title'] },
    files: { 'tests/a.test.ts': "it('alpha test');" },
    rows: [['alpha', 'Same title', 'tests/a.test.ts : alpha test']],
  });
  const problems = checkScenarioMap(opts);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /beta/);
  assert.match(problems[0], /Same title/);
});

test('real repo: every scenario is mapped to an existing test', () => {
  const specDirs = ['openspec/specs', 'openspec/changes/dev-1016-testing/specs'].filter((d) =>
    existsSync(resolve(realRoot, d)),
  );
  assert.deepEqual(
    checkScenarioMap({
      repoRoot: realRoot,
      specDirs,
      mapPath: 'docs/testing/scenario-test-map.md',
    }),
    [],
  );
});
