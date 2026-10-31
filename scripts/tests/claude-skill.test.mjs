// Spec: DEV-1002 claude-code-guardrails - "Project skill for API conventions".
// Scenario: Skill frontmatter is valid.
// Dependency-free: node:test + node:assert only. Never reads secret files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const skillDir = resolve(repoRoot, '.claude', 'skills', 'api-conventions');
const skillPath = resolve(skillDir, 'SKILL.md');

const parseFrontmatter = (text) => {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  assert.equal(lines[0].trim(), '---', 'SKILL.md starts with a --- frontmatter fence');
  const end = lines.indexOf('---', 1);
  assert.ok(end > 0, 'frontmatter has a closing --- fence');
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) fields[m[1]] = m[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  return fields;
};

test('Skill frontmatter is valid', () => {
  assert.ok(existsSync(skillPath), '.claude/skills/api-conventions/SKILL.md exists');
  const fm = parseFrontmatter(readFileSync(skillPath, 'utf8'));
  assert.equal(fm.name, 'api-conventions');
  assert.equal(fm.name, 'api-conventions', 'name equals the directory name');
  assert.ok(fm.description && fm.description.length > 0, 'description is non-empty');
});
