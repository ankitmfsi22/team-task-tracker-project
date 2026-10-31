// Spec: dependency-pinning / "Versions are documented" and "Lint toolchain versions are mutually
// supported" (DEV-1001 task 5.1). Verifies docs/VERSIONS.md against the real pinned versions.
// Dependency-free: node:test + node:assert only; a minimal semver `satisfies` is inlined.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const p = (...parts) => resolve(repoRoot, ...parts);
const docRel = 'docs/VERSIONS.md';

const readText = (rel) => readFileSync(p(rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));

const readDoc = () => {
  assert.ok(existsSync(p(docRel)), `${docRel} is missing`);
  return readText(docRel);
};

const stripTicks = (s) => s.replaceAll('`', '').trim();
const stripV = (s) => s.replace(/^v/i, '');

// Parses `| Component | Version | Where pinned |` rows into Map(component -> version).
const docVersions = () => {
  const map = new Map();
  for (const line of readDoc().split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(stripTicks);
    if (cells.length < 2) continue;
    if (/^-+:?$|^:-+:?$/.test(cells[0]) || cells[0].toLowerCase() === 'component') continue;
    map.set(cells[0], cells[1]);
  }
  return map;
};

const COMPONENTS = [
  'Node.js',
  'pnpm',
  'TypeScript',
  'ESLint',
  'typescript-eslint',
  'Prettier',
  'Husky',
  'lint-staged',
  'Vitest',
  'Prisma',
  '@types/node',
  'OpenSpec CLI',
  'PostgreSQL image',
  'actions/checkout',
  'actions/setup-node',
  'pnpm/action-setup',
  'GitHub runner',
];

const manifests = () =>
  ['package.json', 'backend/package.json', 'frontend/package.json', 'packages/shared/package.json']
    .filter((rel) => existsSync(p(rel)))
    .map(readJson);

// Exact version of a devDependency/dependency found in any workspace manifest.
const pinnedDep = (name) => {
  for (const m of manifests()) {
    for (const field of ['devDependencies', 'dependencies']) {
      if (m[field]?.[name] !== undefined) return m[field][name];
    }
  }
  return undefined;
};

const ciUsesTag = (action) => {
  const m = readText('.github/workflows/ci.yml').match(
    new RegExp(`uses:\\s*${action.replace('/', '\\/')}@(\\S+)`),
  );
  return m?.[1];
};

// ---- minimal semver ----
const parseV = (v) => {
  const m = String(v)
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)/);
  assert.ok(m, `cannot parse version "${v}"`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
};
const cmp = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
};
const comparatorOk = (version, token) => {
  const m = token.match(/^(>=|<=|>|<|=|\^)?(\d+(?:\.\d+){0,2})$/);
  assert.ok(m, `unsupported comparator "${token}"`);
  const [, op = '=', raw] = m;
  const parts = raw.split('.').map(Number);
  const target = [parts[0], parts[1] ?? 0, parts[2] ?? 0];
  const c = cmp(version, target);
  switch (op) {
    case '>=':
      return c >= 0;
    case '<=':
      return c <= 0;
    case '>':
      return c > 0;
    case '<':
      return c < 0;
    case '=':
      return c === 0;
    case '^': {
      const upper =
        target[0] > 0
          ? [target[0] + 1, 0, 0]
          : target[1] > 0
            ? [0, target[1] + 1, 0]
            : [0, 0, target[2] + 1];
      return c >= 0 && cmp(version, upper) < 0;
    }
    default:
      return false;
  }
};
const satisfies = (versionText, range) => {
  const version = parseV(versionText);
  return range.split('||').some((alt) =>
    alt
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .every((tok) => comparatorOk(version, tok)),
  );
};

test('satisfies helper handles the range forms used by typescript-eslint', () => {
  assert.ok(satisfies('6.0.3', '>=4.8.4 <6.1.0'));
  assert.ok(!satisfies('7.0.2', '>=4.8.4 <6.1.0'));
  assert.ok(satisfies('10.14.0', '^8.57.0 || ^9.0.0 || ^10.0.0'));
  assert.ok(!satisfies('11.0.0', '^8.57.0 || ^9.0.0 || ^10.0.0'));
});

test('docs/VERSIONS.md exists', () => {
  assert.ok(existsSync(p(docRel)), `${docRel} is missing`);
});

test('docs/VERSIONS.md has a row for every pinned component', () => {
  const rows = docVersions();
  const missing = COMPONENTS.filter((c) => !rows.has(c) || rows.get(c) === '');
  assert.deepEqual(missing, [], `rows missing or empty: ${missing.join(', ')}`);
});

const expectDoc = (component, expected) => {
  const rows = docVersions();
  assert.ok(rows.has(component), `no row for ${component}`);
  assert.ok(expected !== undefined, `no real pinned version found for ${component}`);
  assert.equal(stripV(rows.get(component)), stripV(expected), `${component} version mismatch`);
};

test('Node.js matches .nvmrc', () => {
  expectDoc('Node.js', readText('.nvmrc').trim());
});

test('pnpm matches packageManager', () => {
  const pm = readJson('package.json').packageManager;
  const m = pm.match(/^pnpm@(.+)$/);
  assert.ok(m, `packageManager is not pnpm@X: ${pm}`);
  expectDoc('pnpm', m[1]);
});

for (const [component, dep] of [
  ['TypeScript', 'typescript'],
  ['ESLint', 'eslint'],
  ['typescript-eslint', 'typescript-eslint'],
  ['Prettier', 'prettier'],
  ['Husky', 'husky'],
  ['lint-staged', 'lint-staged'],
  ['Vitest', 'vitest'],
  ['Prisma', 'prisma'],
  ['@types/node', '@types/node'],
  ['OpenSpec CLI', '@fission-ai/openspec'],
]) {
  test(`${component} matches the pinned ${dep} in package.json`, () => {
    expectDoc(component, pinnedDep(dep));
  });
}

test('PostgreSQL image matches docker-compose.yml', () => {
  const m = readText('docker-compose.yml').match(/^\s*image:\s*(\S+)/m);
  assert.ok(m, 'no image in docker-compose.yml');
  expectDoc('PostgreSQL image', m[1]);
});

for (const action of ['actions/checkout', 'actions/setup-node', 'pnpm/action-setup']) {
  test(`${action} matches the tag in ci.yml`, () => {
    expectDoc(action, ciUsesTag(action));
  });
}

test('GitHub runner matches runs-on in ci.yml', () => {
  const m = readText('.github/workflows/ci.yml').match(/runs-on:\s*(\S+)/);
  assert.ok(m, 'no runs-on in ci.yml');
  expectDoc('GitHub runner', m[1]);
});

test('doc records the Prisma rationale (stable chosen over rc)', () => {
  const doc = readDoc();
  assert.match(doc, /Prisma/);
  assert.match(doc, /\brc\b/i);
  assert.match(doc, /stable/i);
});

test('doc records the npm registry check date as an ISO date', () => {
  assert.match(readDoc(), /\b\d{4}-\d{2}-\d{2}\b/);
});

const installedPeers = () => {
  const pkgPath = p('node_modules', 'typescript-eslint', 'package.json');
  assert.ok(existsSync(pkgPath), 'typescript-eslint is not installed');
  const peers = JSON.parse(readFileSync(pkgPath, 'utf8')).peerDependencies;
  assert.ok(peers?.typescript && peers?.eslint, 'typescript-eslint peer ranges not found');
  return peers;
};

test('pinned TypeScript and ESLint satisfy the typescript-eslint peer ranges', () => {
  const peers = installedPeers();
  const ts = pinnedDep('typescript');
  const eslint = pinnedDep('eslint');
  assert.ok(satisfies(ts, peers.typescript), `TypeScript ${ts} outside ${peers.typescript}`);
  assert.ok(satisfies(eslint, peers.eslint), `ESLint ${eslint} outside ${peers.eslint}`);
});

test('doc states the installed typescript-eslint peer ranges', () => {
  const peers = installedPeers();
  const doc = readDoc();
  assert.ok(doc.includes(peers.typescript), `doc lacks TypeScript range "${peers.typescript}"`);
  assert.ok(doc.includes(peers.eslint), `doc lacks ESLint range "${peers.eslint}"`);
});
