// Spec: workspace-quality-gates / "Placeholder scripts" (scenarios "E2E placeholder",
// "Lighthouse placeholder") (DEV-1001 task 3.4).
// Observable behaviour only: runs `pnpm test:e2e` / `pnpm lighthouse` from the repo root.
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const runPnpm = (script) => {
  const r = spawnSync(`pnpm ${script}`, {
    shell: true,
    cwd: repoRoot,
    encoding: 'buffer',
  });
  const out = `${r.stdout?.toString('utf8') ?? ''}${r.stderr?.toString('utf8') ?? ''}`;
  return { status: r.status, out };
};

const rootScripts = () =>
  JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')).scripts ?? {};

test('root package.json defines test:e2e and lighthouse scripts', () => {
  const scripts = rootScripts();
  assert.equal(typeof scripts['test:e2e'], 'string', 'missing script test:e2e');
  assert.equal(typeof scripts['lighthouse'], 'string', 'missing script lighthouse');
});

test('E2E placeholder: pnpm test:e2e prints "not implemented — DEV-1016" and exits 0', () => {
  const { status, out } = runPnpm('test:e2e');
  assert.equal(status, 0, `expected exit 0, got ${status}\n${out}`);
  assert.ok(out.includes('not implemented — DEV-1016'), `unexpected output:\n${out}`);
});

test('Lighthouse placeholder: pnpm lighthouse prints "not implemented — DEV-1011" and exits 0', () => {
  const { status, out } = runPnpm('lighthouse');
  assert.equal(status, 0, `expected exit 0, got ${status}\n${out}`);
  assert.ok(out.includes('not implemented — DEV-1011'), `unexpected output:\n${out}`);
});
