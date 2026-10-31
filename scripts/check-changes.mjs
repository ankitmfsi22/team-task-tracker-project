// Checks that every archived OpenSpec change is complete and approved (DEV-1005).
// Usage: node scripts/check-changes.mjs [archiveDir]
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultArchive = join(repoRoot, 'openspec', 'changes', 'archive');
const requiredFiles = ['proposal.md', 'design.md', 'tasks.md', 'approvals.md', 'review-log.md'];

function tableRows(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\||\|$/g, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
}

function isSeparator(cells) {
  return cells.every((cell) => /^:?-+:?$/.test(cell));
}

function checkApprovals(text) {
  const problems = [];
  const rows = tableRows(text).filter((cells) => !isSeparator(cells));
  for (const gate of ['Gate 1', 'Gate 2']) {
    const approved = rows.some(
      (cells) => cells[0]?.startsWith(gate) && /^approved$/i.test(cells[2] ?? ''),
    );
    if (!approved) problems.push(`${gate} is not Approved`);
  }
  return problems;
}

function checkReviewLog(text) {
  const problems = [];
  let statusColumn = -1;
  for (const cells of tableRows(text)) {
    if (isSeparator(cells)) continue;
    const header = cells.findIndex((cell) => /^status$/i.test(cell));
    if (header !== -1) {
      statusColumn = header;
      continue;
    }
    if (statusColumn === -1 || cells.length <= statusColumn) continue;
    if (/^open\b/i.test(cells[statusColumn])) {
      problems.push(`finding "${cells.slice(0, 3).join(' | ')}" has status Open`);
    }
  }
  return problems;
}

export function checkChanges(archiveDir = defaultArchive) {
  const problems = [];
  const changes = readdirSync(archiveDir).filter((name) =>
    statSync(join(archiveDir, name)).isDirectory(),
  );
  for (const change of changes) {
    const dir = join(archiveDir, change);
    for (const file of requiredFiles) {
      if (!existsSync(join(dir, file))) problems.push(`${change}: ${file}: missing`);
    }
    const specs = join(dir, 'specs');
    if (!existsSync(specs) || !statSync(specs).isDirectory()) {
      problems.push(`${change}: specs/: missing`);
    }
    const approvalsPath = join(dir, 'approvals.md');
    if (existsSync(approvalsPath)) {
      for (const reason of checkApprovals(readFileSync(approvalsPath, 'utf8'))) {
        problems.push(`${change}: approvals.md: ${reason}`);
      }
    }
    const logPath = join(dir, 'review-log.md');
    if (existsSync(logPath)) {
      for (const reason of checkReviewLog(readFileSync(logPath, 'utf8'))) {
        problems.push(`${change}: review-log.md: ${reason}`);
      }
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkChanges(process.argv[2] ? resolve(process.argv[2]) : defaultArchive);
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exit(1);
  }
  console.log('All archived changes are complete and approved.');
}
