// Stop: run `pnpm typecheck` and `pnpm test` if those scripts exist. Exit 2 on failure so Claude sees the errors.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  // no stdin: continue with defaults
}

// Already continuing because of this hook: do not loop forever.
if (input?.stop_hook_active) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const pkgPath = join(root, 'package.json');
if (!existsSync(pkgPath)) process.exit(0);

let scripts = {};
try {
  scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {};
} catch {
  process.exit(0);
}

const failures = [];
for (const name of ['typecheck', 'test']) {
  if (!scripts[name]) continue;
  const res = spawnSync('pnpm', [name], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: '1' },
  });
  if (res.status !== 0) {
    const out = `${res.stdout ?? ''}${res.stderr ?? ''}`.trim().slice(-4000);
    failures.push(`pnpm ${name} failed (exit ${res.status}):\n${out}`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`Quality gate failed. Fix before finishing.\n\n${failures.join('\n\n')}\n`);
  process.exit(2);
}
process.exit(0);
