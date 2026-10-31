// Spec: DEV-1001 policy alignment scenarios (healthcheck, install scripts, release-age exclusions,
// governance files, deferred client package). Dependency-free: node:test + node:assert only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(resolve(repoRoot, p), 'utf8').replace(/\r\n/g, '\n');
const unquote = (s) => s.trim().replace(/^(['"])(.*)\1$/, '$2');

// Returns the indented lines belonging to a top-level YAML key.
const section = (text, key) => {
  const lines = text.split('\n');
  const i = lines.findIndex((l) => l.startsWith(`${key}:`));
  assert.notEqual(i, -1, `${key} section exists`);
  const out = [];
  for (const l of lines.slice(i + 1)) {
    if (l.trim() === '' || l.trim().startsWith('#')) continue;
    if (!/^\s/.test(l)) break;
    out.push(l.trim());
  }
  return out;
};

test('Healthy means accepting TCP connections', () => {
  const line = read('docker-compose.yml')
    .split('\n')
    .find((l) => l.trim().startsWith('test:') && l.includes('pg_isready'));
  assert.ok(line, 'healthcheck test line exists');
  assert.ok(line.includes('pg_isready -h 127.0.0.1'), line);
});

test('Install scripts are decided, not ignored', () => {
  const entries = Object.fromEntries(
    section(read('pnpm-workspace.yaml'), 'allowBuilds').map((l) => {
      const [k, v] = l.split(/:\s*/);
      return [unquote(k), v.trim()];
    }),
  );
  assert.equal(entries.prisma, 'false');
  assert.equal(entries['@prisma/engines'], 'false');
});

test('Release-age exclusions are documented', () => {
  const entries = section(read('pnpm-workspace.yaml'), 'minimumReleaseAgeExclude')
    .filter((l) => l.startsWith('-'))
    .map((l) => unquote(l.slice(1)));
  assert.ok(entries.length > 0, 'at least one exclusion');
  const doc = read('docs/VERSIONS.md');
  for (const e of entries) {
    assert.match(e, /^@?[^@\s]+@\d+\.\d+\.\d+$/, `${e} is an exact name@version`);
    assert.ok(doc.includes(e), `${e} is documented in docs/VERSIONS.md`);
  }
});

test('Governance and source-of-truth files are not reflowed', () => {
  const files = [
    'CLAUDE.md',
    'AGENTS.md',
    '.mcp.json',
    'docs/FRS.md',
    'docs/SDS.md',
    'docs/reference/ASSIGNMENT.md',
  ];
  for (const f of files) {
    const r = spawnSync(`pnpm exec prettier --file-info ${f}`, {
      cwd: repoRoot,
      shell: true,
      encoding: 'utf8',
    });
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
    assert.equal(JSON.parse(r.stdout).ignored, true, `${f} is prettier-ignored`);
  }
  assert.ok(!/fixture/i.test(read('.prettierignore')), '.prettierignore has no fixture entries');
});

test('Client package is deferred', () => {
  const pkgs = [
    'package.json',
    'backend/package.json',
    'frontend/package.json',
    'packages/shared/package.json',
  ];
  const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
  for (const p of pkgs) {
    const json = JSON.parse(read(p));
    for (const s of sections) {
      assert.ok(
        !(json[s] && '@prisma/client' in json[s]),
        `${p} ${s} must not list @prisma/client`,
      );
    }
  }
  const backend = JSON.parse(read('backend/package.json'));
  const prisma = { ...backend.dependencies, ...backend.devDependencies }.prisma;
  assert.equal(prisma, '7.10.1');
});
