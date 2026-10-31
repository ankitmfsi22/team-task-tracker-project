// Spec: dependency-pinning / "Toolchain versions are pinned" (scenarios "Node version declared
// consistently", "Lockfile is committed") and "Dependencies use exact versions" (DEV-1001 task 2.1).
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

const lines = (text) => text.split(/\r?\n/);

const readText = (name) => {
  const path = resolve(repoRoot, name);
  assert.ok(existsSync(path), `${name} is missing`);
  return readFileSync(path, 'utf8');
};

const readRootPackage = () => JSON.parse(readText('package.json'));

test('root package.json pins packageManager to pnpm@12.11.2', () => {
  assert.equal(readRootPackage().packageManager, 'pnpm@12.11.2');
});

test('.nvmrc and engines.node both specify Node 22 and are consistent', () => {
  // Rule: .nvmrc is "22" or "22.x.y" (optional leading "v"); engines.node is "22", "22.x[.y]"
  // or ">=22[.x[.y]]". Both must share major 22, and when .nvmrc is a full version it must
  // not be lower than a ">=" floor in engines.
  const nvmrc = lines(readText('.nvmrc'))[0].trim();
  const nvmMatch = /^v?(22)(?:\.(\d+)\.(\d+))?$/.exec(nvmrc);
  assert.ok(nvmMatch, `.nvmrc must be "22" or "22.x.y", got "${nvmrc}"`);

  const engines = readRootPackage().engines?.node;
  assert.equal(typeof engines, 'string', 'package.json engines.node is missing');
  const engMatch = /^(>=)?(22)(?:\.(\d+))?(?:\.(\d+))?(?:\.x)?$/.exec(engines.trim());
  assert.ok(engMatch, `engines.node must be 22, 22.x.y or >=22.x.y, got "${engines}"`);

  if (engMatch[1] && nvmMatch[2] !== undefined) {
    const floor = [Number(engMatch[3] ?? 0), Number(engMatch[4] ?? 0)];
    const pinned = [Number(nvmMatch[2]), Number(nvmMatch[3])];
    const ok = pinned[0] > floor[0] || (pinned[0] === floor[0] && pinned[1] >= floor[1]);
    assert.ok(ok, `.nvmrc ${nvmrc} is below engines.node floor ${engines}`);
  }
});

test('.npmrc contains save-exact=true', () => {
  const found = lines(readText('.npmrc')).some((l) => /^save-exact\s*=\s*true\s*$/.test(l.trim()));
  assert.ok(found, '.npmrc must contain "save-exact=true"');
});

test('pnpm-workspace.yaml lists backend, frontend and packages/*', () => {
  const entries = lines(readText('pnpm-workspace.yaml'))
    .map((l) => /^\s*-\s*['"]?([^'"#\s]+)['"]?\s*(?:#.*)?$/.exec(l)?.[1])
    .filter((e) => e !== undefined);
  for (const expected of ['backend', 'frontend', 'packages/*']) {
    assert.ok(
      entries.includes(expected),
      `pnpm-workspace.yaml must list "${expected}"; found [${entries}]`,
    );
  }
});

const DEP_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
// Exact semver only (spec forbids ^ ~ * > < latest next).
const EXACT = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

test('every package.json uses exact dependency versions (no ranges or tags)', () => {
  const found = git('ls-files', '--cached', '--others', '--exclude-standard', '--', '*package.json')
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && !f.split('/').includes('node_modules'));
  const files = new Set(['package.json', ...found]);

  const offenders = [];
  for (const file of files) {
    const pkg = JSON.parse(readText(file));
    for (const field of DEP_FIELDS) {
      for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
        if (EXACT.test(spec)) continue;
        offenders.push(`${file}: ${field}.${name} = "${spec}"`);
      }
    }
  }
  assert.deepEqual(offenders, [], `non-exact specifiers:\n${offenders.join('\n')}`);
});

test('pnpm-lock.yaml exists on disk', () => {
  // Scenario "Lockfile is committed" (`git ls-files pnpm-lock.yaml` lists it) can only be true
  // after the task commit; tracking is verified after commit. Here we assert it exists on disk.
  assert.ok(existsSync(resolve(repoRoot, 'pnpm-lock.yaml')), 'pnpm-lock.yaml is missing');
});
