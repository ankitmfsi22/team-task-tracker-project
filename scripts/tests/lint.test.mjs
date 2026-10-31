// Spec: workspace-quality-gates / "Strict TypeScript and lint rules" (scenarios for explicit any,
// ts-ignore comments, eslint-disable without ticket ID, clean file) and "Negative fixtures are generated,
// never committed"; dependency-pinning / "Pinning check is part of the gates" (DEV-1001 task 3.2).
// Invalid input is generated in an OS temp dir at test time and removed afterwards.
// ESLint is loaded dynamically so a missing install fails as a clear assertion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const configPath = join(repoRoot, 'eslint.config.js');
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

const loadEslint = async () => {
  try {
    return await import('eslint');
  } catch {
    assert.fail('eslint is not installed: add eslint 10.14.0 as a root devDependency');
  }
};

// Writes `content` to a temp .ts file, lints it with the repo config, always cleans up.
const lintFixture = async (content) => {
  const { ESLint } = await loadEslint();
  assert.ok(existsSync(configPath), 'eslint.config.js must exist');
  const dir = mkdtempSync(join(tmpdir(), 'lint-'));
  try {
    const file = join(dir, 'fixture.ts');
    writeFileSync(file, content);
    const eslint = new ESLint({ cwd: dir, overrideConfigFile: configPath });
    const [result] = await eslint.lintFiles([file]);
    return result.messages;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const errors = (messages) => messages.filter((m) => m.severity === 2);

test('eslint.config.js exists and root package.json pins lint tooling and runs both checks', () => {
  assert.ok(existsSync(configPath), 'eslint.config.js must exist at the repo root');
  const dev = pkg.devDependencies ?? {};
  assert.equal(dev.eslint, '10.14.0');
  assert.equal(dev['typescript-eslint'], '8.72.1');
  const lint = pkg.scripts?.lint ?? '';
  assert.match(lint, /eslint/);
  assert.match(lint, /scripts\/check-pinning\.mjs/);
});

test('explicit any is an error (no-explicit-any)', async () => {
  const msgs = errors(await lintFixture('export const x: any = 1;\n'));
  assert.ok(
    msgs.some((m) => /no-explicit-any/.test(m.ruleId ?? '')),
    `expected no-explicit-any error, got: ${JSON.stringify(msgs)}`,
  );
});

test('@ts-ignore is an error (ban-ts-comment)', async () => {
  const msgs = errors(await lintFixture('// @ts-ignore\nexport const x: number = "a";\n'));
  assert.ok(
    msgs.some((m) => /ban-ts-comment/.test(m.ruleId ?? '')),
    `expected ban-ts-comment error, got: ${JSON.stringify(msgs)}`,
  );
});

test('eslint-disable without a ticket ID is an error from the local rule', async () => {
  const msgs = errors(await lintFixture('/* eslint-disable no-console */\nexport const x = 1;\n'));
  assert.ok(
    msgs.some((m) => /ticket|DEV/i.test(`${m.ruleId ?? ''} ${m.message}`)),
    `expected ticket-ID rule error, got: ${JSON.stringify(msgs)}`,
  );
});

test('eslint-disable with a ticket ID raises no ticket-rule error', async () => {
  const msgs = await lintFixture(
    '// eslint-disable-next-line no-console -- DEV-1001 reason\nconsole.log("x");\nexport const x = 1;\n',
  );
  assert.ok(
    !msgs.some((m) => /ticket|DEV-/i.test(`${m.ruleId ?? ''} ${m.message}`)),
    `unexpected ticket-rule message: ${JSON.stringify(msgs)}`,
  );
});

test('clean typed file produces zero errors', async () => {
  const msgs = errors(
    await lintFixture('export const add = (a: number, b: number): number => a + b;\n'),
  );
  assert.deepEqual(msgs, []);
});
