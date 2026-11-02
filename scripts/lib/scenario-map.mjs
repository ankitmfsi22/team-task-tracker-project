// Scenario-to-test check (DEV-1016): every `#### Scenario:` of the given spec directories needs a row in
// the map file, and a row's test file must exist and contain the test name. `review: <what>` rows are
// accepted for scenarios that are checked by the reviewer instead of an automated test.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCENARIO = /^#### Scenario:\s*(.+?)\s*$/gm;

const keyOf = (capability, title) => `${capability}\u0000${title}`;

const readScenarios = (repoRoot, specDirs) => {
  const scenarios = [];
  for (const dir of specDirs) {
    const base = join(repoRoot, dir);
    if (!existsSync(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const spec = join(base, entry.name, 'spec.md');
      if (!entry.isDirectory() || !existsSync(spec)) continue;
      for (const match of readFileSync(spec, 'utf8').matchAll(SCENARIO)) {
        scenarios.push({ capability: entry.name, title: match[1] });
      }
    }
  }
  return scenarios;
};

const readRows = (repoRoot, mapPath) => {
  const rows = new Map();
  const file = join(repoRoot, mapPath);
  if (!existsSync(file)) return rows;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .slice(1, line.lastIndexOf('|'))
      .split(/(?<!\\)\|/)
      .map((c) => c.trim().replace(/\\\|/g, '|'));
    if (cells.length < 3 || /^-+$/.test(cells[0].replace(/[:\s]/g, ''))) continue;
    rows.set(keyOf(cells[0], cells[1]), { capability: cells[0], title: cells[1], test: cells[2] });
  }
  return rows;
};

export function checkScenarioMap({ repoRoot, specDirs, mapPath }) {
  const rows = readRows(repoRoot, mapPath);
  const problems = [];
  for (const { capability, title } of readScenarios(repoRoot, specDirs)) {
    const row = rows.get(keyOf(capability, title));
    if (!row) {
      problems.push(`no row for scenario "${title}" (capability ${capability})`);
      continue;
    }
    if (/^review:\s*\S/.test(row.test)) continue;
    const where = `row "${title}" (capability ${capability})`;
    // A multi-clause scenario may name one test per clause, separated by "; ".
    for (const part of row.test.split(/;\s+(?=\S+ : )/)) {
      const at = part.lastIndexOf(' : ');
      const testFile = at === -1 ? part.trim() : part.slice(0, at).trim();
      const testName = at === -1 ? '' : part.slice(at + 3).trim();
      if (!testFile || !testName) {
        problems.push(`${where}: test must be "<file> : <test name>" or "review: <what>"`);
      } else if (!existsSync(join(repoRoot, testFile))) {
        problems.push(`${where}: test file ${testFile} does not exist`);
      } else if (!readFileSync(join(repoRoot, testFile), 'utf8').includes(testName)) {
        problems.push(`${where}: test name "${testName}" not found in ${testFile}`);
      }
    }
  }
  return problems;
}
