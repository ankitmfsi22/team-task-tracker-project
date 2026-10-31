// PostToolUse (Edit|Write): run prettier --write on the changed file.
// Exits 0 silently if prettier is not installed yet or formatting fails.
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const file = input?.tool_input?.file_path;
if (!file) process.exit(0);

const target = resolve(root, file);
if (!existsSync(target) || target.includes('node_modules')) process.exit(0);

let prettierBin;
try {
  const require = createRequire(join(root, 'package.json'));
  const pkgPath = require.resolve('prettier/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.prettier;
  prettierBin = join(dirname(pkgPath), bin);
} catch {
  process.exit(0);
}

spawnSync(process.execPath, [prettierBin, '--write', '--log-level=silent', target], {
  cwd: root,
  stdio: 'ignore',
});
process.exit(0);
