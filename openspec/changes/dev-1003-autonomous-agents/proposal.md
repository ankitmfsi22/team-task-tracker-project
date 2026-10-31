## Why

Ticket DEV-1003 (Linear DEV-7, AS §7 Rules 6, 7, 23, 24) requires agents for implementation, test writing, review and coordination, each with scope, permitted actions, expected outputs and restrictions. Fetched from Linear via MCP (real ticket, not the fixture). Existing: `reviewer`, `test-writer`, `db-change-checker`, `security-auditor`. Gaps: no implementation agent, no coordination agent, no agent documentation, the reviewer does not explicitly compare against test evidence, and there is no recorded run of test-writer producing failing tests before implementation.

## What Changes

- Add `.claude/agents/implementer.md` (implements one task against already-failing tests; cannot edit tests).
- Add `.claude/agents/coordinator.md` (read-only; splits a change's task groups, produces a delegation plan, never approves its own work).
- Tighten `.claude/agents/reviewer.md`: compare the diff to the approved spec and the `pnpm test` output, not the implementer's summary.
- Add `docs/agents.md`: one table for all six agents (scope, permitted actions, outputs, restrictions).
- Add a `node:test` test that checks agent definitions, written first by test-writer.
- Record evidence in `docs/evidence/DEV-1003/`: failing tests before implementation, then passing, plus a coordinated run.
- Out of scope: production deployment automation, MCP (DEV-1004), workflow traceability (DEV-1005).

## Capabilities

### New Capabilities
- `agent-roles`: defined agents for implementation, testing, review and coordination with explicit boundaries and read-only review.

### Modified Capabilities
None.

## Impact

`.claude/agents/`, `docs/`, `scripts/tests/`. No production code, no packages, no API or schema change. Ticket: DEV-1003 (Linear DEV-7), blocked by DEV-1002 (done).

## Rollback

Revert the branch commits; only agent definitions, docs, a test and evidence change.
