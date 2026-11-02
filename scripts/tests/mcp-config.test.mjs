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

// Spec: DEV-1015 codebase-graph - "MCP entry is project-scoped and safe".
const CRG_READ_ONLY_TOOLS = [
  'get_minimal_context_tool',
  'query_graph_tool',
  'get_impact_radius_tool',
  'get_review_context_tool',
  'detect_changes_tool',
];
const CRG_WRITE_PATTERN = /build|embed|register|apply|refactor|generate|postprocess/;

test('Entry is present and read-only', () => {
  const crg = servers['code-review-graph'];
  assert.ok(crg, 'mcpServers contains code-review-graph');
  assert.equal(crg.command, 'uvx', 'command is uvx');
  const args = crg.args ?? [];
  assert.ok(Array.isArray(args), 'args is an array');

  const fromIdx = args.indexOf('--from');
  assert.ok(fromIdx >= 0, 'args include --from');
  assert.equal(
    args[fromIdx + 1],
    'code-review-graph==2.3.9',
    '--from is followed by the pinned package',
  );
  assert.ok(args.includes('serve'), 'args include serve');

  const toolsIdx = args.indexOf('--tools');
  assert.ok(toolsIdx >= 0, 'args include --tools');
  const list = args[toolsIdx + 1];
  assert.equal(typeof list, 'string', '--tools is followed by a comma-separated list');
  const tools = list.split(',').map((t) => t.trim());
  assert.ok(tools.length > 0 && tools.every((t) => t.length > 0), 'tools list is non-empty');
  for (const tool of tools) {
    assert.ok(CRG_READ_ONLY_TOOLS.includes(tool), `${tool} is in the read-only set`);
    assert.ok(!CRG_WRITE_PATTERN.test(tool), `${tool} is not a build/embed/write tool`);
  }

  assert.ok(!('env' in crg) && !('headers' in crg), 'no env or headers keys');
});

test('Literal credential is rejected', () => {
  assert.deepEqual(
    findLiteralCredentials({
      'code-review-graph': { command: 'uvx', env: { API_KEY: 'literal-secret' } },
    }),
    ['code-review-graph.env.API_KEY'],
    'helper flags a literal env value on the code-review-graph server',
  );
  assert.ok(servers['code-review-graph'], 'code-review-graph is in the real servers map');
  const literals = findLiteralCredentials(servers);
  assert.deepEqual(literals, [], `literal credential(s) in .mcp.json: ${literals.join(', ')}`);
});
