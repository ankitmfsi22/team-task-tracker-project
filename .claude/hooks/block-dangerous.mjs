// PreToolUse (Bash): block dangerous commands. Exit 2 = block, reason goes to stderr.
// Fails closed: input that cannot be parsed into a command string is blocked.
import { readFileSync } from 'node:fs';

const block = (reason) => {
  process.stderr.write(`Blocked by .claude/hooks/block-dangerous.mjs: ${reason}.\n`);
  process.exit(2);
};

let cmd;
try {
  cmd = JSON.parse(readFileSync(0, 'utf8'))?.tool_input?.command;
} catch {
  block('malformed hook input (not JSON)');
}
if (typeof cmd !== 'string') block('malformed hook input (no command string)');

const envFileRead = () =>
  [...cmd.matchAll(/(?:^|[\s/\\'"=<>])(\.env[\w.-]*)/g)].some((m) => !m[1].endsWith('.example'));

// Split into simple commands (quotes are dropped so `bash -c "..."` is still inspected).
const segments = cmd
  .split(/&&|\|\||[;&|\n()`]/)
  .map((s) => s.replace(/['"]/g, ' ').trim().split(/\s+/).filter(Boolean));

// git global options that consume the next token (`-C <path>`, `-c k=v`, ...).
const GIT_OPTS_WITH_VALUE = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace']);

// Returns { sub, args } for each `git [global options] <sub> ...` invocation.
const gitCalls = () =>
  segments.flatMap((tokens) => {
    const i = tokens.indexOf('git');
    if (i < 0) return [];
    let j = i + 1;
    while (j < tokens.length && tokens[j].startsWith('-')) j += GIT_OPTS_WITH_VALUE.has(tokens[j]) ? 2 : 1;
    return j < tokens.length ? [{ sub: tokens[j], args: tokens.slice(j + 1) }] : [];
  });

const pushes = () => gitCalls().filter((c) => c.sub === 'push');
const forceFlag = (a) => a.startsWith('--force') || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a);
const refspecs = (args) => args.filter((a) => !a.startsWith('-'));
const pushesToMain = (args) =>
  refspecs(args).some((r) => /^(?:refs\/heads\/)?(?:main|master)$/.test(r.replace(/^\+/, '').split(':').pop()));

const rmForcedRecursive = () =>
  segments.some((tokens) => {
    const i = tokens.indexOf('rm');
    if (i < 0) return false;
    const flags = tokens.slice(i + 1).filter((a) => a.startsWith('-'));
    const recursive = flags.some((a) => a === '--recursive' || /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(a));
    const force = flags.some((a) => a === '--force' || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(a));
    return recursive && force;
  });

const rules = [
  ['rm -rf (recursive forced delete) is blocked', rmForcedRecursive],
  [
    'force push is blocked',
    () => pushes().some((c) => c.args.some(forceFlag) || refspecs(c.args).some((r) => r.startsWith('+'))),
  ],
  ['pushing to main is blocked', () => pushes().some((c) => pushesToMain(c.args))],
  ['git reset --hard is blocked', () => gitCalls().some((c) => c.sub === 'reset' && c.args.includes('--hard'))],
  ['reading or printing .env files is blocked', envFileRead],
  ['curl/wget is blocked', () => /(?:^|[\s;&|(`])(?:curl|wget)(?=\s|$)/.test(cmd)],
  ['--dangerously-skip-permissions is blocked', () => /--dangerously-skip-permissions/.test(cmd)],
];

for (const [reason, test] of rules) {
  if (test()) block(reason);
}
process.exit(0);
