// Spec: workspace-quality-gates / "Pre-commit enforcement" (scenarios "Staged lint error blocks the
// commit", "Clean staged files commit", "Hook works on Windows") (DEV-1001 task 3.3).
// Static checks only: the commit-blocking behaviour is verified separately in a temporary git repo.
// This test never runs `git commit`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkgPath = join(repoRoot, 'package.json');
const hookPath = join(repoRoot, '.husky', 'pre-commit');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

// lint-staged config lives either in package.json or in lint-staged.config.js.
const loadLintStagedConfig = async () => {
  if (pkg['lint-staged']) return pkg['lint-staged'];
  const file = join(repoRoot, 'lint-staged.config.js');
  assert.ok(
    existsSync(file),
    'lint-staged config must exist (package.json "lint-staged" key or lint-staged.config.js)',
  );
  const mod = await import(pathToUrl(file));
  return mod.default;
};
const pathToUrl = (p) => new URL(`file:///${p.replace(/\\/g, '/')}`).href;

const commandsOf = (value) => {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
  };
  walk(value);
  return out;
};

test('husky and lint-staged are pinned exactly as root devDependencies', () => {
  assert.equal(pkg.devDependencies?.husky, '9.1.7');
  assert.equal(pkg.devDependencies?.['lint-staged'], '17.6.0');
});

test('root prepare script runs husky', () => {
  assert.match(pkg.scripts?.prepare ?? '', /^husky(\s|$)/, 'prepare must run husky');
});

test('.husky/pre-commit exists and invokes lint-staged', () => {
  assert.ok(existsSync(hookPath), '.husky/pre-commit must exist');
  const body = readFileSync(hookPath, 'utf8');
  assert.match(body, /(pnpm exec|npx)\s+lint-staged/, 'hook must run lint-staged');
});

test('.husky/pre-commit has LF line endings only (Hook works on Windows)', () => {
  assert.ok(existsSync(hookPath), '.husky/pre-commit must exist');
  const bytes = readFileSync(hookPath);
  assert.ok(bytes.length > 0, 'hook must not be empty');
  assert.equal(bytes.includes(0x0d), false, 'hook must contain no CR (\\r) bytes');
});

test('git attributes force eol=lf for .husky/pre-commit', () => {
  assert.match(git('check-attr', 'eol', '.husky/pre-commit'), /eol: lf$/);
});

test('lint-staged runs eslint and a prettier check on ts/js/mjs files', async () => {
  const config = await loadLintStagedConfig();
  assert.ok(config && typeof config === 'object', 'lint-staged config must be an object');
  const entries = Object.entries(config);
  assert.ok(entries.length > 0, 'lint-staged config must define at least one pattern');

  for (const ext of ['ts', 'js', 'mjs']) {
    const matching = entries.filter(([glob]) => glob.includes(ext));
    assert.ok(matching.length > 0, `a lint-staged pattern must cover .${ext} files`);
    const cmds = matching.flatMap(([, v]) => commandsOf(v));
    assert.ok(
      cmds.some((c) => /\beslint\b/.test(c)),
      `.${ext} must run eslint`,
    );
    assert.ok(
      cmds.some((c) => /\bprettier\b/.test(c)),
      `.${ext} must run prettier`,
    );
  }

  const all = entries.flatMap(([, v]) => commandsOf(v));
  const eslintCmd = all.find((c) => /\beslint\b/.test(c));
  assert.match(
    eslintCmd,
    /--max-warnings(=|\s+)0/,
    'eslint command must fail on warnings (--max-warnings 0)',
  );
  const prettierCmds = all.filter((c) => /\bprettier\b/.test(c));
  for (const c of prettierCmds) {
    assert.match(c, /--check/, `prettier command must be a check: ${c}`);
    assert.doesNotMatch(c, /--write/, `prettier command must not silently write: ${c}`);
  }
});

test('core.hooksPath is .husky/_ after install', () => {
  let value = '';
  try {
    value = git('config', '--get', 'core.hooksPath');
  } catch {
    value = '';
  }
  assert.equal(value, '.husky/_');
});
