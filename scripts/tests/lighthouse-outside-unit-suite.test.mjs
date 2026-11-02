// Spec: workspace-quality-gates / "Lighthouse runs outside the unit suite" (DEV-1016 task 1.1).
// Scenarios: "Unit suite has no browser audit" and "Gate still enforces 95".
// Static scan only; no browser is launched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateScores } from '../lib/lighthouse-gate.mjs';

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testsDir, '..', '..');
const SELF = 'lighthouse-outside-unit-suite.test.mjs';

const scores = (performance) => ({
  performance,
  accessibility: 1,
  'best-practices': 1,
  seo: 1,
});

test('Unit suite has no browser audit: no node:test file runs pnpm lighthouse', () => {
  const files = readdirSync(testsDir).filter((f) => f.endsWith('.test.mjs') && f !== SELF);
  const offenders = [];
  for (const file of files) {
    const src = readFileSync(join(testsDir, file), 'utf8');
    // Only a command passed to a spawn/exec call counts; mentions in comments or assertions do not.
    const directRun =
      /(spawnSync|execSync|execFileSync|spawn|exec)\s*\(\s*[^)]*(pnpm\s+lighthouse\b|scripts[\\/]lighthouse\.mjs)/.test(
        src,
      );
    // A loop such as `for (const name of ['format:check', 'lighthouse']) { spawnSync(`pnpm ${name}`) }`
    const loopRun =
      /for\s*\(\s*const\s+\w+\s+of\s*\[[^\]]*['"`]lighthouse['"`][^\]]*\]\s*\)\s*\{\s*test\(\s*`pnpm\s+\$\{\w+\}[^`]*`[\s\S]{0,200}?(spawnSync|execSync|execFileSync|spawn|exec)\s*\(/.test(
        src,
      );
    if (directRun || loopRun) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `unit suite must not run Lighthouse: ${offenders.join(', ')}`);
  for (const logic of ['lighthouse-gate.test.mjs', 'lighthouse-pages.test.mjs']) {
    assert.ok(existsSync(join(testsDir, logic)), `${logic} still exists`);
  }
});

test('Gate still enforces 95: lighthouse script unchanged and threshold is 95', () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.lighthouse, 'node scripts/lighthouse.mjs');
  // Scores are rounded to whole percent: 0.94 -> 94 fails, 0.95 -> 95 passes.
  assert.equal(evaluateScores([{ page: '/login', scores: scores(0.94) }]).ok, false);
  assert.equal(evaluateScores([{ page: '/login', scores: scores(0.95) }]).ok, true);
});
