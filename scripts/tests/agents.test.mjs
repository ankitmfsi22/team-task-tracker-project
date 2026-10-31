// Spec: DEV-1003 agent-roles.
// Dependency-free: node:test + node:assert only. Never reads secret files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const agentsDir = resolve(repoRoot, '.claude', 'agents');
const docsPath = resolve(repoRoot, 'docs', 'agents.md');
const roles = ['implementer', 'test-writer', 'reviewer', 'coordinator'];
const headings = ['Scope', 'Permitted actions', 'Expected output', 'Restrictions'];

const roleFile = (role) => `.claude/agents/${role}.md`;

const loadRole = (role) => {
  const rel = roleFile(role);
  assert.ok(existsSync(resolve(repoRoot, rel)), `${rel} is missing`);
  const lines = readFileSync(resolve(repoRoot, rel), 'utf8').replace(/\r\n/g, '\n').split('\n');
  assert.equal(lines[0].trim(), '---', `${rel} must start with a --- frontmatter fence`);
  const end = lines.indexOf('---', 1);
  assert.ok(end > 0, `${rel} frontmatter has no closing --- fence`);
  const fm = {};
  for (const line of lines.slice(1, end)) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) fm[m[1]] = m[2].trim();
  }
  const body = lines.slice(end + 1).join('\n');
  const tools = (fm.tools ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return { rel, fm, body, tools };
};

const section = (role, heading) => {
  const { rel, body } = loadRole(role);
  const parts = body.split(/^## /m).slice(1);
  const found = parts.find((p) => p.split('\n')[0].trim() === heading);
  assert.ok(found, `${rel} is missing heading "## ${heading}"`);
  return found;
};

test('Role agents exist with all sections', () => {
  for (const role of roles) {
    const { rel, fm, body } = loadRole(role);
    for (const key of ['name', 'description', 'tools']) {
      assert.ok(fm[key], `${rel} is missing frontmatter "${key}"`);
    }
    for (const h of headings) {
      assert.match(body, new RegExp(`^## ${h}\\s*$`, 'm'), `${rel} is missing heading "## ${h}"`);
    }
  }
});

test('Missing role is detected', () => {
  for (const role of roles) {
    const rel = roleFile(role);
    assert.ok(existsSync(resolve(repoRoot, rel)), `${rel} is missing`);
    const { body } = loadRole(role);
    const missing = headings.filter((h) => !new RegExp(`^## ${h}\\s*$`, 'm').test(body));
    assert.deepEqual(missing, [], `${rel} is missing headings: ${missing.join(', ')}`);
  }
});

test('Reviewer has no write tools', () => {
  const { rel, tools } = loadRole('reviewer');
  for (const banned of ['Write', 'Edit', 'NotebookEdit', 'Bash']) {
    assert.ok(!tools.includes(banned), `${rel} tools must not include "${banned}"`);
  }
});

test('Reviewer requires spec and test evidence', () => {
  const { rel, body } = loadRole('reviewer');
  assert.match(body, /approved spec/i, `${rel} must mention the approved spec`);
  assert.match(body, /test output/i, `${rel} must mention the test output`);
  assert.match(
    body,
    /(do not|don't|never) trust the implementer'?s summary/i,
    `${rel} must say not to trust the implementer's summary`,
  );
});

test('Coordinator has no write tools', () => {
  const { rel, tools } = loadRole('coordinator');
  for (const banned of ['Write', 'Edit', 'Bash']) {
    assert.ok(!tools.includes(banned), `${rel} tools must not include "${banned}"`);
  }
});

test('Coordinator forbids self-approval', () => {
  const text = section('coordinator', 'Restrictions');
  assert.match(
    text,
    /never approves?/i,
    '.claude/agents/coordinator.md Restrictions: "never approve"',
  );
  assert.match(text, /own work/i, '.claude/agents/coordinator.md Restrictions: missing "own work"');
  assert.match(text, /Gate 1/, '.claude/agents/coordinator.md Restrictions: missing "Gate 1"');
  assert.match(text, /Gate 2/, '.claude/agents/coordinator.md Restrictions: missing "Gate 2"');
});

test('Implementer cannot edit tests', () => {
  const text = section('implementer', 'Restrictions');
  const rel = roleFile('implementer');
  assert.ok(text.includes('*.test.*'), `${rel} Restrictions must forbid editing *.test.*`);
  assert.ok(text.includes('*.spec.*'), `${rel} Restrictions must forbid editing *.spec.*`);
  assert.ok(text.includes('e2e/'), `${rel} Restrictions must forbid editing e2e/`);
  assert.match(text, /failing tests?/i, `${rel} Restrictions must require failing tests first`);
});

test('Docs list all agents', () => {
  assert.ok(existsSync(docsPath), 'docs/agents.md is missing');
  const docs = readFileSync(docsPath, 'utf8');
  const names = readdirSync(agentsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.slice(0, -3));
  assert.ok(names.length > 0, '.claude/agents has no agents');
  for (const name of names) {
    assert.ok(docs.includes(name), `docs/agents.md does not mention agent "${name}"`);
  }
});
