// Spec: DEV-1016 workspace-quality-gates - failure reporting and coverage threshold scenarios.
// Dependency-free: node:test + node:assert + spawnSync. Fixtures live in throwaway dirs inside the repo.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(resolve(repoRoot, rel), 'utf8').replace(/\r\n/g, '\n');
const suffix = `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const e2eFixture = resolve(repoRoot, 'e2e', `.fixture-${suffix}`);
const covFixture = resolve(repoRoot, 'packages', 'shared', `.fixture-${suffix}`);

after(() => {
  rmSync(e2eFixture, { recursive: true, force: true });
  rmSync(covFixture, { recursive: true, force: true });
});

test('Failure is reported: a failing journey step exits non-zero and writes the HTML report', () => {
  mkdirSync(e2eFixture, { recursive: true });
  writeFileSync(
    join(e2eFixture, 'playwright.config.ts'),
    `import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '.',
  retries: 0,
  reporter: [['html', { outputFolder: './report', open: 'never' }]],
  outputDir: './results',
});
`,
  );
  writeFileSync(
    join(e2eFixture, 'fail.spec.ts'),
    `import { test, expect } from '@playwright/test';
test('deliberate failure', () => {
  expect(1).toBe(2);
});
`,
  );
  const result = spawnSync(
    'pnpm',
    ['exec', 'playwright', 'test', '--config', join(e2eFixture, 'playwright.config.ts')],
    { cwd: repoRoot, encoding: 'utf8', env: { ...process.env, CI: '1' } },
  );
  assert.notEqual(result.status, 0, `expected non-zero exit\n${result.stdout}\n${result.stderr}`);
  assert.ok(existsSync(join(e2eFixture, 'report', 'index.html')), 'HTML report index.html exists');
});

test('Failure is reported: runner propagates the Playwright exit status', () => {
  const runner = read('scripts/e2e.mjs');
  assert.match(runner, /status =\s*run\(`pnpm exec playwright test[\s\S]*?\.status \?\? 1;/);
  assert.match(runner, /process\.exit\(status\);\s*$/);
  assert.match(runner, /let status = 1;/);
  const config = read('e2e/playwright.config.ts');
  assert.match(config, /\['html',\s*\{[^}]*outputFolder:\s*'\.\.\/playwright-report'/);
});

test('Coverage passes: every package configures an 80% line threshold on src only', () => {
  const configs = [
    ['backend/vitest.config.ts', ['src/generated/**']],
    ['frontend/vite.config.ts', []],
    ['packages/shared/vitest.config.ts', []],
  ];
  for (const [file, extra] of configs) {
    const text = read(file);
    assert.match(text, /provider:\s*'v8'/, `${file} provider`);
    assert.match(text, /thresholds:\s*\{\s*lines:\s*80\s*\}/, `${file} thresholds`);
    assert.match(text, /include:\s*\['src\/\*\*'\]/, `${file} include`);
    const exclude = text.match(/exclude:\s*\[([^\]]*)\]/);
    assert.ok(exclude, `${file} exclude`);
    const entries = [...exclude[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assert.deepEqual(
      entries,
      ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**', ...extra],
      `${file} exclude list`,
    );
  }
  for (const pkg of ['backend', 'frontend', 'packages/shared']) {
    const json = JSON.parse(read(`${pkg}/package.json`));
    assert.equal(typeof json.scripts?.coverage, 'string', `${pkg} coverage script`);
  }
  assert.equal(JSON.parse(read('package.json')).scripts.coverage, 'pnpm -r run coverage');
});

test('Coverage below the threshold fails', () => {
  mkdirSync(join(covFixture, 'src'), { recursive: true });
  writeFileSync(
    join(covFixture, 'src', 'a.ts'),
    `export function a(x: number): number {
  if (x > 0) {
    return 1;
  }
  const b = 2;
  const c = 3;
  const d = 4;
  const e = 5;
  return b + c + d + e;
}
`,
  );
  writeFileSync(
    join(covFixture, 'src', 'a.test.ts'),
    `import { expect, test } from 'vitest';
import { a } from './a';
test('a', () => {
  expect(a(1)).toBe(1);
});
`,
  );
  writeFileSync(
    join(covFixture, 'vitest.config.ts'),
    `import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**'],
      reporter: ['text-summary'],
      reportsDirectory: './coverage',
      thresholds: { lines: 80 },
    },
  },
});
`,
  );
  const result = spawnSync(
    'pnpm',
    [
      '--filter',
      '@team-task-tracker/shared',
      'exec',
      'vitest',
      'run',
      '--root',
      covFixture,
      '--coverage',
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0, `expected non-zero exit\n${result.stdout}\n${result.stderr}`);
  assert.match(`${result.stdout}\n${result.stderr}`, /does not meet global threshold/);
});
