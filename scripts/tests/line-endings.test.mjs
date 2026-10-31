// Spec: workspace-quality-gates / "Line-ending normalization" / "No CRLF in the index" (DEV-1001 task 1.1).
// Dependency-free: node:test + node:assert + node:child_process only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const git = (...args) =>
  execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

const lines = (text) => text.split(/\r?\n/);

test('.gitattributes exists and enforces "* text=auto eol=lf"', () => {
  const path = resolve(repoRoot, '.gitattributes');
  assert.ok(existsSync(path), '.gitattributes is missing');
  const found = lines(readFileSync(path, 'utf8')).some(
    (l) => l.trim() === '* text=auto eol=lf',
  );
  assert.ok(found, '.gitattributes must contain the line "* text=auto eol=lf"');
});

test('.editorconfig exists and sets end_of_line = lf', () => {
  const path = resolve(repoRoot, '.editorconfig');
  assert.ok(existsSync(path), '.editorconfig is missing');
  const found = lines(readFileSync(path, 'utf8')).some((l) =>
    /^end_of_line\s*=\s*lf\s*$/.test(l.trim()),
  );
  assert.ok(found, '.editorconfig must contain "end_of_line = lf"');
});

test('git ls-files --eol shows no i/crlf text files', () => {
  const offenders = lines(git('ls-files', '--eol')).filter((l) =>
    /^i\/crlf\b/.test(l.trim()),
  );
  assert.deepEqual(offenders, [], `CRLF files in index:\n${offenders.join('\n')}`);
});

test('git add --renormalize . stages nothing further', () => {
  // Run on a throwaway copy of the index so the real index is never touched.
  const dir = mkdtempSync(join(tmpdir(), 'renorm-'));
  try {
    const indexCopy = join(dir, 'index');
    copyFileSync(resolve(repoRoot, git('rev-parse', '--git-path', 'index').trim()), indexCopy);
    const env = { ...process.env, GIT_INDEX_FILE: indexCopy };
    const staged = () =>
      execFileSync('git', ['ls-files', '-s'], { cwd: repoRoot, encoding: 'utf8', env });
    const before = staged();
    execFileSync('git', ['add', '--renormalize', '.'], { cwd: repoRoot, env });
    assert.equal(staged(), before, 'renormalize changed staged entries');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
