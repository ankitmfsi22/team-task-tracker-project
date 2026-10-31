// Spec: DEV-1002 claude-code-guardrails - "Permissions deny secrets, force-push and push to main".
// Dependency-free: node:test + node:assert only. Never reads secret files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const settingsPath = resolve(repoRoot, '.claude', 'settings.json');
const { permissions } = JSON.parse(readFileSync(settingsPath, 'utf8'));

const DENY = [
  'Read(./.env*)',
  'Read(./secrets/**)',
  'Bash(git push --force:*)',
  'Bash(git push -f:*)',
  'Bash(git push origin main:*)',
];
const SENSITIVE = ['Bash(git push:*)', 'Bash(pnpm install:*)', 'Bash(docker compose:*)'];

test('Deny list covers secrets and risky pushes', () => {
  for (const rule of DENY) {
    assert.ok(permissions.deny.includes(rule), `deny contains ${rule}`);
  }
});

test('Sensitive actions require approval', () => {
  for (const rule of SENSITIVE) {
    assert.ok(permissions.ask.includes(rule), `ask contains ${rule}`);
    assert.ok(!permissions.allow.includes(rule), `allow does not contain ${rule}`);
  }
});
