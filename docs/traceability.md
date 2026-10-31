# Traceability register

One row per ticket: ticket to Linear key to change to branch to PR to gates. Every later ticket appends its row in the same PR (see `.github/pull_request_template.md`). AC3 ordering (no production code before Gate 1) is visible by comparing the Gate 1 and First implementation columns (all times 2026-10-31, local).

"First implementation commit" is the first commit on the branch after Gate 1 that is not a planning or approval document.

| Ticket   | Linear | Change (archive path)                                            | Branch                                     | PR  | Gate 1 commit   | First implementation commit | Gate 2 commit   |
| -------- | ------ | ---------------------------------------------------------------- | ------------------------------------------ | --- | --------------- | --------------------------- | --------------- |
| DEV-1001 | DEV-5  | `openspec/changes/archive/2026-10-31-dev-1001-project-setup`     | `feature/infra/DEV-1001-project-setup`     | #1  | `1aac462` 14:53 | `5838cfc` 14:59             | `c104c35` 18:43 |
| DEV-1002 | DEV-6  | `openspec/changes/archive/2026-10-31-dev-1002-claude-code-setup` | `feature/infra/DEV-1002-claude-code-setup` | #2  | `0b43a25` 18:57 | `9903815` 19:00             | `83fd4aa` 19:11 |
| DEV-1003 | DEV-7  | `openspec/changes/archive/2026-10-31-dev-1003-autonomous-agents` | `feature/infra/DEV-1003-autonomous-agents` | #3  | `553e39e` 19:34 | `69a0cc7` 19:35             | `692fd60` 19:54 |
| DEV-1004 | DEV-8  | `openspec/changes/archive/2026-10-31-dev-1004-mcp-integration`   | `feature/infra/DEV-1004-mcp-integration`   | #5  | `b58ced6` 20:38 | `47367e8` 20:40             | `dd9c1e9` 21:46 |

Notes:

- DEV-1001: the Gate 1 amendments (`dff7f86`, CI added; later alignment) came after implementation started; they are recorded in its `approvals.md`.
- DEV-1002: guardrail fixes after review went through PR #4 (`fix/infra/DEV-1002-guardrail-fixes`), see D-021.
- Gate 2 commits record the entry in `approvals.md`; the archive commit follows on the same branch.

## Append rule

Add the new ticket's row when the change is archived: assignment ID, Linear key (`docs/tickets/README.md`), archive path, branch, PR number, the commit that added the Gate 1 entry, the first implementation commit and the commit that added the Gate 2 entry, each with its time. If implementation started before Gate 1, say so in a note and add a deviation.
