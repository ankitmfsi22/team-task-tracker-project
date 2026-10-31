// Spec: dependency-pinning / "Dependencies use exact versions" (scenarios "Range is rejected",
// "Latest tag is rejected") and "Pinning check is part of the gates" (scenarios "Clean repository
// passes", "Violation fails the check") (DEV-1001 task 2.2).
// Every invalid input is generated in an OS temp dir at test time and removed afterwards.
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = resolve(repoRoot, 'scripts', 'check-pinning.mjs');

const COMPOSE_OK = (image) =>
  `services:\n  db:\n    image: ${image}\n    ports:\n      - "5432:5432"\n`;
const WORKFLOW = (uses) =>
  `name: CI\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-24.04\n    steps:\n      - uses: ${uses}\n`;

// Creates a temp dir, lets `setup` populate it, runs the check, always cleans up.
const withProject = (setup, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'pinning-'));
  try {
    setup(dir);
    const r = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
    return fn({ ...r, out: `${r.stdout ?? ''}${r.stderr ?? ''}`, dir });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const write = (dir, rel, content) => {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
};

const pkg = (fields) => JSON.stringify({ name: 'fixture', version: '1.0.0', ...fields }, null, 2);

const expectFail = (setup, mustContain) =>
  withProject(setup, (r) => {
    assert.notEqual(r.status, 0, `expected non-zero exit; output:\n${r.out}`);
    assert.equal(r.status === null, false, `script did not run to completion:\n${r.out}`);
    for (const s of mustContain) {
      assert.ok(r.out.includes(s), `output should name "${s}"; got:\n${r.out}`);
    }
  });

// (a) ranges
for (const [label, spec] of [
  ['caret', '^3.0.0'],
  ['tilde', '~3.0.0'],
  ['star', '*'],
  ['greater-than', '>3.0.0'],
  ['less-than', '<4.0.0'],
]) {
  test(`range (${label}) in package.json is rejected, naming package and file`, () => {
    expectFail(
      (d) => write(d, 'package.json', pkg({ dependencies: { zod: spec } })),
      ['zod', 'package.json'],
    );
  });
}

// (b) tags
for (const tag of ['latest', 'next']) {
  test(`tag "${tag}" in package.json is rejected`, () => {
    expectFail((d) => write(d, 'package.json', pkg({ dependencies: { zod: tag } })), ['zod']);
  });
}

// (f) every dependency section, nested package.json, node_modules ignored
for (const section of [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]) {
  test(`range in ${section} is rejected`, () => {
    expectFail(
      (d) => write(d, 'package.json', pkg({ [section]: { leftpad: '^1.0.0' } })),
      ['leftpad'],
    );
  });
}

test('range in a nested workspace package.json is rejected, naming that file', () => {
  expectFail(
    (d) => {
      write(d, 'package.json', pkg({ dependencies: { ok: '1.0.0' } }));
      write(d, 'packages/shared/package.json', pkg({ dependencies: { zod: '^3.0.0' } }));
    },
    ['zod', join('packages', 'shared', 'package.json')],
  );
});

test('package.json files under node_modules are ignored', () => {
  withProject(
    (d) => {
      write(d, 'package.json', pkg({ dependencies: { ok: '1.0.0' } }));
      write(d, 'node_modules/bad/package.json', pkg({ dependencies: { zod: '^3.0.0' } }));
    },
    (r) => assert.equal(r.status, 0, `node_modules must be ignored; output:\n${r.out}`),
  );
});

// (c) docker images
for (const image of ['postgres:latest', 'postgres', 'postgres:16', 'postgres:16-alpine']) {
  test(`floating docker image "${image}" is rejected, naming the image`, () => {
    expectFail((d) => write(d, 'docker-compose.yml', COMPOSE_OK(image)), [image]);
  });
}

// (d) workflow actions
for (const ref of ['main', 'latest', 'v4']) {
  test(`workflow action ref @${ref} is rejected, naming file and action`, () => {
    expectFail(
      (d) => write(d, '.github/workflows/ci.yml', WORKFLOW(`actions/checkout@${ref}`)),
      [join('.github', 'workflows', 'ci.yml'), 'actions/checkout'],
    );
  });
}

// (e) clean passes
test('exact workflow tag @v4.2.2 passes', () => {
  withProject(
    (d) => write(d, '.github/workflows/ci.yml', WORKFLOW('actions/checkout@v4.2.2')),
    (r) => assert.equal(r.status, 0, `output:\n${r.out}`),
  );
});

test('clean directory with exact package.json, compose image and workflow exits 0', () => {
  withProject(
    (d) => {
      write(
        d,
        'package.json',
        pkg({
          dependencies: { zod: '3.23.8' },
          devDependencies: { vitest: '2.1.4' },
          optionalDependencies: { fsevents: '2.3.3' },
          peerDependencies: { react: '19.0.0' },
        }),
      );
      write(d, 'docker-compose.yml', COMPOSE_OK('postgres:16.4-alpine'));
      write(d, '.github/workflows/ci.yml', WORKFLOW('actions/checkout@v4.2.2'));
    },
    (r) => assert.equal(r.status, 0, `output:\n${r.out}`),
  );
});

// (g) no committed fixtures
test('git ls-files contains no fixture files for the pinning tests', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const offenders = files.filter(
    (f) =>
      /(^|\/)(fixtures?|__fixtures__)\//i.test(f) ||
      /^scripts\/tests\/.*(fixture|invalid|bad)/i.test(f),
  );
  assert.deepEqual(offenders, [], `committed fixture files:\n${offenders.join('\n')}`);
});
