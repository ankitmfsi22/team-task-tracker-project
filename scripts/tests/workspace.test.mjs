// Spec: workspace-quality-gates / "Workspace layout" (scenarios "Packages are discovered",
// "Install from clean checkout") and "Root quality gate scripts" (DEV-1001 task 2.3).
// Dependency-free: node:test + node:assert + node:child_process only.
// Never runs `pnpm build|typecheck|test` here (would recurse into this test).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PACKAGES = ['backend', 'frontend', 'packages/shared'];

const abs = (...p) => resolve(repoRoot, ...p);
const readJson = (...p) => JSON.parse(readFileSync(abs(...p), 'utf8'));
// shell:true so `pnpm` (pnpm.cmd) resolves on Windows.
const pnpm = (args) =>
  spawnSync(`pnpm ${args}`, { cwd: repoRoot, encoding: 'utf8', shell: true });
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

test('tsconfig.base.json exists with compilerOptions.strict === true', () => {
  assert.ok(existsSync(abs('tsconfig.base.json')), 'tsconfig.base.json is missing');
  const cfg = readJson('tsconfig.base.json');
  assert.equal(cfg.compilerOptions?.strict, true);
});

for (const dir of PACKAGES) {
  test(`${dir}: package.json has build, typecheck and test scripts`, () => {
    assert.ok(existsSync(abs(dir, 'package.json')), `${dir}/package.json is missing`);
    const { scripts = {} } = readJson(dir, 'package.json');
    for (const s of ['build', 'typecheck', 'test']) {
      assert.equal(typeof scripts[s], 'string', `${dir} must define script "${s}"`);
      assert.ok(scripts[s].trim().length > 0, `${dir} script "${s}" is empty`);
    }
  });

  test(`${dir}: tsconfig.json extends the root tsconfig.base.json`, () => {
    assert.ok(existsSync(abs(dir, 'tsconfig.json')), `${dir}/tsconfig.json is missing`);
    const { extends: ext } = readJson(dir, 'tsconfig.json');
    assert.equal(typeof ext, 'string', `${dir}/tsconfig.json needs "extends"`);
    assert.equal(resolve(abs(dir), ext), abs('tsconfig.base.json'));
  });

  test(`${dir}: src/ has a .ts file and a placeholder test (src/*.test.ts)`, () => {
    const src = abs(dir, 'src');
    assert.ok(existsSync(src), `${dir}/src is missing`);
    const files = readdirSync(src);
    assert.ok(
      files.some((f) => f.endsWith('.ts') && !f.endsWith('.test.ts')),
      `${dir}/src needs at least one non-test .ts file`,
    );
    const tests = files.filter((f) => f.endsWith('.test.ts'));
    assert.ok(tests.length > 0, `${dir}/src needs a *.test.ts placeholder test`);
    assert.ok(
      tests.some((f) => /placeholder/i.test(f) || /placeholder/i.test(readFileSync(join(src, f), 'utf8'))),
      `${dir} test file name or description must say "placeholder"`,
    );
  });

  test(`${dir}: devDependencies pin typescript 6.0.3, vitest 5.0.5, @types/node 22.x.y`, () => {
    const { devDependencies = {} } = readJson(dir, 'package.json');
    assert.equal(devDependencies.typescript, '6.0.3');
    assert.equal(devDependencies.vitest, '5.0.5');
    assert.match(devDependencies['@types/node'] ?? '', /^22\.\d+\.\d+$/);
  });
}

test('root package.json build, typecheck and test delegate across packages', () => {
  const { scripts = {} } = readJson('package.json');
  for (const s of ['build', 'typecheck', 'test']) {
    assert.equal(typeof scripts[s], 'string', `root must define script "${s}"`);
    assert.match(scripts[s], /pnpm\s+(-r|--recursive)\b/, `root "${s}" must delegate via pnpm -r`);
  }
});

// Scenario "Packages are discovered"
test('pnpm -r list --depth -1 lists backend, frontend and packages/shared', () => {
  const r = pnpm('-r list --depth -1');
  assert.equal(r.status, 0, `pnpm exited ${r.status}: ${r.stderr}`);
  const out = `${r.stdout}`.replace(/[\\]/g, '/');
  for (const dir of PACKAGES) {
    assert.ok(existsSync(abs(dir, 'package.json')), `${dir}/package.json is missing`);
    const { name } = readJson(dir, 'package.json');
    assert.ok(out.includes(name), `output must mention package name "${name}"`);
    assert.ok(out.includes(dir), `output must mention path "${dir}"`);
  }
});

// Scenario "Install from clean checkout"
test('pnpm-lock.yaml has importers for all three packages', () => {
  const lock = readFileSync(abs('pnpm-lock.yaml'), 'utf8');
  for (const dir of PACKAGES) {
    assert.match(lock, new RegExp(`^  ${dir}:\s*$`, 'm'), `lockfile lacks importer "${dir}"`);
  }
});

test('pnpm install --frozen-lockfile succeeds without modifying pnpm-lock.yaml', () => {
  const before = sha(abs('pnpm-lock.yaml'));
  // No --offline: the scenario is a fresh clone, so the store may be cold and packages are fetched.
  const r = pnpm('install --frozen-lockfile --ignore-scripts');
  assert.equal(r.status, 0, `frozen install failed:\n${r.stdout}${r.stderr}`);
  assert.equal(sha(abs('pnpm-lock.yaml')), before, 'lockfile was modified');
});
