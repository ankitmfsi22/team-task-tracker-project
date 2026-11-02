// Spec: workspace-quality-gates / "Lighthouse placeholder" (DEV-1001 task 3.4) and
// "End-to-end suite" / "Placeholder is gone" (DEV-1016 task 3.1).
// Static checks on the root package.json scripts; test:e2e is NOT run here (it needs
// Docker, a browser and a build).
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const rootScripts = () =>
  JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).scripts ?? {};

test('root package.json defines test:e2e and lighthouse scripts', () => {
  const scripts = rootScripts();
  assert.equal(typeof scripts['test:e2e'], 'string', 'missing script test:e2e');
  assert.equal(typeof scripts['lighthouse'], 'string', 'missing script lighthouse');
});

test('E2E placeholder is gone: test:e2e script runs Playwright, not the not-implemented placeholder', () => {
  const script = rootScripts()['test:e2e'];
  assert.equal(typeof script, 'string', 'missing script test:e2e');
  assert.ok(!script.includes('not-implemented'), 'test:e2e must not reference not-implemented');
  assert.ok(
    !script.includes('scripts/not-implemented.mjs'),
    'test:e2e must not name scripts/not-implemented.mjs',
  );
  const runner = script.match(/node\s+(\S+\.mjs)/)?.[1];
  assert.ok(runner, `test:e2e must run a node script, got: ${script}`);
  assert.ok(
    readFileSync(resolve(repoRoot, runner), 'utf8').includes('playwright test'),
    `${runner} must run playwright test`,
  );
});

test('Lighthouse is a real gate: root lighthouse script runs scripts/lighthouse.mjs, not the placeholder', () => {
  const script = rootScripts()['lighthouse'];
  assert.equal(script, 'node scripts/lighthouse.mjs');
  assert.ok(!script.includes('not-implemented'), 'lighthouse must not reference not-implemented');
});
