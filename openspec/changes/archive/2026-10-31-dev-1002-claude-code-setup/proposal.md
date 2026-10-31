## Why

Ticket DEV-1002 (Linear DEV-6, AS §4 and §7 Rule 8) requires the Claude Code setup to be committed, documented and proven. Most of it exists from bootstrap (CLAUDE.md, 3 hooks, permissions, 12 opsx commands/skills). Gaps against the acceptance criteria: no project skill, no setup documentation, deny rules do not cover all force-push/push-to-main forms, and no recorded evidence that a denied action is blocked.

## What Changes

- Add project skill `.claude/skills/api-conventions/SKILL.md` (from AGENTS.md and SDS sections 4 and 6).
- Add `docs/claude-code-setup.md`: what each hook, permission group and skill does.
- Extend `permissions.deny` in `.claude/settings.json` with push-to-main and short-flag force-push forms (AC2).
- Add `node:test` tests for the `block-dangerous` hook and the settings deny list.
- Record evidence in `docs/evidence/DEV-1002/` of a live denied `.env` read and hook block/allow runs (AC3).
- Out of scope: agent definitions (DEV-1003), MCP setup (DEV-1004).

## Capabilities

### New Capabilities
- `claude-code-guardrails`: committed hooks, permissions and skill that block secret reads, force-push and push to main, and require approval for sensitive actions.

### Modified Capabilities
None.

## Impact

`.claude/settings.json`, `.claude/skills/`, `scripts/tests/`, `docs/`. No production code, no new packages, no API or schema change. Ticket: DEV-1002 (Linear DEV-6). Blocked by DEV-1001 (done).

## Rollback

Revert the branch commits; only config, a skill, docs and tests are touched. Existing hooks keep working.
