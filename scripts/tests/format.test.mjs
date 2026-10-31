// Spec: workspace-quality-gates / "Format scripts" (scenario "Format check detects drift"),
// "Line-ending normalization" (scenario "CRLF file fails format check") and
// "Negative fixtures are generated, never committed" (DEV-1001 task 3.1).
// Invalid input is generated in an OS temp dir at test time and removed afterwards.
// Prettier is loaded dynamically so a missing install fails as a clear assertion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const configPath = join(repoRoot, '.prettierrc');
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

const loadPrettier = async () => {
  try {
    return await import('prettier');
  } catch (error) {
    assert.fail(`prettier must be installed as a root devDependency: ${error.message}`);
  }
};

const loadConfig = async (prettier) => {
  assert.ok(existsSync(configPath), '.prettierrc must exist at the repository root');
  const config = await prettier.resolveConfig(configPath, { config: configPath });
  assert.ok(config, '.prettierrc must resolve to a configuration');
  return config;
};

// Writes `content` to a temp .ts file, runs `fn`, always cleans up.
const withTempFile = async (content, fn) => {
  const dir = mkdtempSync(join(tmpdir(), 'format-'));
  try {
    const file = join(dir, 'sample.ts');
    writeFileSync(file, content);
    return await fn(file, content);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const WELL_FORMATTED =
  'export const answer = 42;\n\nexport function add(a: number, b: number): number {\n  return a + b;\n}\n';
const MISFORMATTED =
  'export const answer   =  42\nexport function add(a:number,b:number){return a+b}\n';

test('.prettierrc exists and sets endOfLine to lf', () => {
  assert.ok(existsSync(configPath), '.prettierrc must exist at the repository root');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  assert.equal(config.endOfLine, 'lf');
});

test('root package.json has format and format:check scripts invoking prettier', () => {
  const scripts = pkg.scripts ?? {};
  assert.match(scripts.format ?? '', /prettier\b.*--write\b/, 'format must run prettier --write');
  assert.match(
    scripts['format:check'] ?? '',
    /prettier\b.*--check\b/,
    'format:check must run prettier --check',
  );
});

test('root devDependency prettier is exactly 3.9.10', () => {
  assert.equal(pkg.devDependencies?.prettier, '3.9.10');
});

test('format check detects a misformatted file and format changes it', async () => {
  const prettier = await loadPrettier();
  const config = await loadConfig(prettier);
  await withTempFile(MISFORMATTED, async (file, content) => {
    const options = { ...config, filepath: file };
    assert.equal(await prettier.check(content, options), false);
    const formatted = await prettier.format(content, options);
    assert.notEqual(formatted, content);
    assert.equal(await prettier.check(formatted, options), true);
  });
});

test('format check fails a file with CRLF line endings', async () => {
  const prettier = await loadPrettier();
  const config = await loadConfig(prettier);
  await withTempFile(WELL_FORMATTED.replace(/\n/g, '\r\n'), async (file, content) => {
    assert.ok(content.includes('\r\n'));
    assert.equal(await prettier.check(content, { ...config, filepath: file }), false);
  });
});

test('format check passes a well-formatted LF file', async () => {
  const prettier = await loadPrettier();
  const config = await loadConfig(prettier);
  await withTempFile(WELL_FORMATTED, async (file, content) => {
    assert.equal(await prettier.check(content, { ...config, filepath: file }), true);
  });
});
