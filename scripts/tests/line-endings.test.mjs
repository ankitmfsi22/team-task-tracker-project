// Spec: workspace-quality-gates / "Line-ending normalization" / "No CRLF in the index" (DEV-1001 task 1.1).
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

test('.gitattributes exists and enforces "* text=auto eol=lf"', () => {
  const path = resolve(repoRoot, '.gitattributes');
  assert.ok(existsSync(path), '.gitattributes is missing');
  const found = lines(readFileSync(path, 'utf8')).some((l) => l.trim() === '* text=auto eol=lf');
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
  const offenders = lines(git('ls-files', '--eol')).filter((l) => /^i\/crlf\b/.test(l.trim()));
  assert.deepEqual(offenders, [], `CRLF files in index:\n${offenders.join('\n')}`);
});

test('git add --renormalize . stages nothing further', () => {
  // Renormalizing re-hashes each tracked blob through the attribute rules. Doing that on the
  // indexed content itself (not the working tree) keeps the check independent of unstaged
  // edits and never touches the real index: every blob must already hash to itself.
  const entries = git('ls-files', '-s', '-z')
    .split('\0')
    .filter(Boolean)
    .map((e) => /^\d+ ([0-9a-f]+) \d\t(.+)$/s.exec(e))
    .filter((m) => m !== null);
  const changed = [];
  for (const [, sha, path] of entries) {
    const content = execFileSync('git', ['cat-file', 'blob', sha], { cwd: repoRoot });
    const normalized = execFileSync('git', ['hash-object', '--stdin', '--path', path], {
      cwd: repoRoot,
      input: content,
      encoding: 'utf8',
    }).trim();
    if (normalized !== sha) changed.push(path);
  }
  assert.deepEqual(changed, [], `renormalize would change:\n${changed.join('\n')}`);
});
