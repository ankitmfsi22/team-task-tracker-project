// Spec: DEV-1004 mcp-integration - config scenarios only.
// Dependency-free: node:test + node:assert only. Never reads secret files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const mcp = JSON.parse(readFileSync(resolve(repoRoot, '.mcp.json'), 'utf8'));
const { permissions } = JSON.parse(
  readFileSync(resolve(repoRoot, '.claude', 'settings.json'), 'utf8'),
);
const servers = mcp.mcpServers ?? {};
const allow = permissions.allow ?? [];
const ask = permissions.ask ?? [];

const ENV_REF = /^(Bearer )?\$\{[A-Z0-9_]+\}$/;

// Pure helper: returns "server.section.key" for every literal (non-${ENV}) header/env value.
export function findLiteralCredentials(serverMap) {
  const found = [];
  for (const [name, server] of Object.entries(serverMap ?? {})) {
    for (const section of ['headers', 'env']) {
      for (const [key, value] of Object.entries(server?.[section] ?? {})) {
        if (typeof value !== 'string' || !ENV_REF.test(value)) {
          found.push(`${name}.${section}.${key}`);
        }
      }
    }
  }
  return found;
}

const LINEAR_WRITE = [
  'create_attachment',
  'create_attachment_from_upload',
  'create_issue_label',
  'delete_attachment',
  'delete_comment',
  'delete_diff_comment',
  'delete_status_update',
  'mark_notification',
  'merge_diff',
  'prepare_attachment_upload',
  'prepare_file_upload',
  'resolve_diff_thread',
  'restore_issue_label',
  'restore_project_label',
  'retire_issue_label',
  'retire_project_label',
  'save_comment',
  'save_diff_comment',
  'save_document',
  'save_issue',
  'save_issue_label',
  'save_milestone',
  'save_project',
  'save_project_label',
  'save_release',
  'save_release_note',
  'save_status_update',
  'share_issue',
  'submit_diff_review',
  'unshare_issue',
  'update_diff',
].map((t) => `mcp__linear__${t}`);

test('Both servers are configured', () => {
  for (const name of ['linear', 'context7']) {
    assert.ok(servers[name], `mcpServers contains ${name}`);
    assert.ok(
      typeof servers[name].url === 'string' && servers[name].url.startsWith('https://'),
      `${name} url starts with https://`,
    );
  }
});

test('Literal credentials are rejected', () => {
  assert.deepEqual(
    findLiteralCredentials({
      s: { headers: { A: 'abc123', B: 'Bearer ${TOKEN_1}', C: '${X}' }, env: { D: 'Bearer abc' } },
    }),
    ['s.headers.A', 's.env.D'],
    'helper flags literals and accepts ${NAME} / Bearer ${NAME}',
  );
  const literals = findLiteralCredentials(servers);
  assert.deepEqual(literals, [], `literal credential(s) in .mcp.json: ${literals.join(', ')}`);
});

test('Read tools are allowed', () => {
  for (const rule of [
    'mcp__context7',
    'mcp__linear__get_issue',
    'mcp__linear__list_issues',
    'mcp__linear__list_comments',
  ]) {
    assert.ok(allow.includes(rule), `allow contains ${rule}`);
  }
});

test('Linear is not allowed wholesale', () => {
  assert.ok(!allow.includes('mcp__linear'), 'allow has no mcp__linear');
  assert.ok(!allow.some((r) => /^mcp__linear__\*$/.test(r)), 'allow has no mcp__linear__*');
});

test('Write tools ask for approval', () => {
  for (const rule of LINEAR_WRITE) {
    assert.ok(ask.includes(rule), `ask contains ${rule}`);
    assert.ok(!allow.includes(rule), `allow does not contain ${rule}`);
  }
});
