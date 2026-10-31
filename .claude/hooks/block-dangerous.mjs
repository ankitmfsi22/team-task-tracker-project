// PreToolUse (Bash): block dangerous commands. Exit 2 = block, reason goes to stderr.
import { readFileSync } from 'node:fs';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  process.exit(0);
}

const cmd = String(input?.tool_input?.command ?? '');

const envFileRead = () =>
  [...cmd.matchAll(/(?:^|[\s/\\'"=<>])(\.env[\w.-]*)/g)].some((m) => !m[1].endsWith('.example'));

const rules = [
  ['rm -rf is blocked', () => /\brm\s+(?:-[a-z]+\s+)*-[a-z]*(?:rf|fr)[a-z]*/i.test(cmd)],
  [
    'force push is blocked',
    () =>
      /\bgit\s+push\b[^\n;&|]*(?:\s--force\S*|\s-[a-zA-Z]*f[a-zA-Z]*(?=\s|$)|\s\+\S)/.test(cmd),
  ],
  [
    'pushing to main is blocked',
    () => /\bgit\s+push\b[^\n;&|]*(?:[\s:]|refs\/heads\/)(?:main|master)(?=\s|$)/.test(cmd),
  ],
  ['git reset --hard is blocked', () => /\bgit\s+reset\b[^\n;&|]*--hard/.test(cmd)],
  ['reading or printing .env files is blocked', envFileRead],
  ['curl/wget is blocked', () => /(?:^|[\s;&|(`])(?:curl|wget)(?=\s|$)/.test(cmd)],
  ['--dangerously-skip-permissions is blocked', () => /--dangerously-skip-permissions/.test(cmd)],
];

for (const [reason, test] of rules) {
  if (test()) {
    process.stderr.write(`Blocked by .claude/hooks/block-dangerous.mjs: ${reason}.\n`);
    process.exit(2);
  }
}
process.exit(0);
