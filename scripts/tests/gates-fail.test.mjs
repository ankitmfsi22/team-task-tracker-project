// Spec: workspace-quality-gates - 'Type error fails the gate' and 'Failing test fails the gate'.
// Bad inputs are generated in an OS temp dir and removed afterwards. Dependency-free: node:test only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tsc = join(repoRoot, 'backend', 'node_modules', 'typescript', 'bin', 'tsc');
const vitest = join(repoRoot, 'backend', 'node_modules', 'vitest', 'vitest.mjs');

const withTempDir = async (fn) => {
  const dir = await mkdtemp(join(tmpdir(), 'gates-fail-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

const run = (args, cwd) =>
  spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120_000 });

const tsconfig = JSON.stringify({
  compilerOptions: {
    strict: true,
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    target: 'ES2022',
    noEmit: true,
  },
  include: ['*.ts'],
});

test('Type error fails the gate: tsc exits non-zero and names the file', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'tsconfig.json'), tsconfig);
    await writeFile(join(dir, 'bad.ts'), "export const n: number = 'x';\n");
    const r = run([tsc, '-p', join(dir, 'tsconfig.json'), '--noEmit'], dir);
    assert.notEqual(r.status, 0, 'tsc must fail on a type error');
    assert.match(`${r.stdout}${r.stderr}`, /bad\.ts/);
  });
});

test('Type error fails the gate: a valid file passes tsc', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'tsconfig.json'), tsconfig);
    await writeFile(join(dir, 'good.ts'), 'export const n: number = 1;\n');
    const r = run([tsc, '-p', join(dir, 'tsconfig.json'), '--noEmit'], dir);
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  });
});

// `--globals` avoids resolving the 'vitest' module from the temp dir.
const runVitest = (dir) => run([vitest, 'run', '--root', dir, '--globals'], dir);

test('Failing test fails the gate: vitest exits non-zero', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'fail.test.ts'), "it('x', () => { expect(1).toBe(2); });\n");
    const r = runVitest(dir);
    assert.notEqual(r.status, 0, `${r.stdout}${r.stderr}`);
  });
});

test('Failing test fails the gate: a passing test exits 0', async () => {
  await withTempDir(async (dir) => {
    await writeFile(join(dir, 'pass.test.ts'), "it('x', () => { expect(1).toBe(1); });\n");
    const r = runVitest(dir);
    assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  });
});
