## Why

Ticket DEV-1005 (Linear DEV-9, AS §7 Rules 1-4, 25, 26) requires each change to link ticket, branch and spec, to carry all six artifacts, to pass `openspec validate --strict`, to have a Gate 1 before code and a Gate 2 before archive. Fetched from Linear via MCP (real ticket; `get_issue DEV-1005` failed because Linear keys differ, DEV-9 was found via `list_issues`, mapping in `docs/tickets/README.md`). DEV-1001..1004 already follow the flow (approvals + review-log, archived). Gaps: no PR template (Rule 26), no single ticket-to-PR register, nothing checks that archived changes are complete, and the lifecycle exists only inside CLAUDE.md.

## What Changes

- Add `.github/pull_request_template.md` with traceability fields: Linear ticket, OpenSpec change, requirements (FRS IDs), scenario-to-test map, review findings, deviations, Gate 2.
- Add `docs/traceability.md`: one row per ticket (assignment ID, Linear key, change archive path, branch, PR, Gate 1 and Gate 2 commits) for DEV-1001..1004; later tickets append a row.
- Add `scripts/check-changes.mjs` plus `scripts/tests/change-completeness.test.mjs` (node:test): every archived change has the six artifacts, Gate 1 and Gate 2 both `Approved`, and no `Open` finding in `review-log.md`. Runs in `pnpm test` and so in CI.
- Add `docs/workflow.md` (short): lifecycle with the exact `/opsx:*` commands, gates, fast lane rule, and why sync/archive run on the feature branch.
- Add one pointer line to `CLAUDE.md`; append deviation D-033 to `docs/deviations.md`.
- Out of scope: application feature work, new packages, git-history enforcement of "no code before Gate 1" (see design), changes to `.claude/` hooks.

## Capabilities

### New Capabilities
- `openspec-workflow`: ticket-to-PR traceability, completeness of archived changes, and the documented gate lifecycle.

### Modified Capabilities
None.

## Impact

`.github/`, `docs/`, `scripts/`, `CLAUDE.md`. No production code, packages, API or schema change. Ticket: DEV-1005 (Linear DEV-9), blocked by DEV-1003 and DEV-1004 (done).

## Rollback

Revert the branch commits; only docs, a PR template, one script and its test change.
