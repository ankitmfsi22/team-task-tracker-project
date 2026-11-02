# Traceability register

One row per ticket: ticket to Linear key to change to branch to PR to gates. Every later ticket appends its row in the same PR (see `.github/pull_request_template.md`). AC3 ordering (no production code before Gate 1) is visible by comparing the Gate 1 and First implementation columns (all times 2026-10-31, local).

"First implementation commit" is the first commit on the branch after Gate 1 that is not a planning or approval document.

| Ticket   | Linear | Change (archive path)                                               | Branch                                        | PR  | Gate 1 commit   | First implementation commit | Gate 2 commit   |
| -------- | ------ | ------------------------------------------------------------------- | --------------------------------------------- | --- | --------------- | --------------------------- | --------------- |
| DEV-1001 | DEV-5  | `openspec/changes/archive/2026-10-31-dev-1001-project-setup`        | `feature/infra/DEV-1001-project-setup`        | #1  | `1aac462` 14:53 | `5838cfc` 14:59             | `c104c35` 18:43 |
| DEV-1002 | DEV-6  | `openspec/changes/archive/2026-10-31-dev-1002-claude-code-setup`    | `feature/infra/DEV-1002-claude-code-setup`    | #2  | `0b43a25` 18:57 | `9903815` 19:00             | `83fd4aa` 19:11 |
| DEV-1003 | DEV-7  | `openspec/changes/archive/2026-10-31-dev-1003-autonomous-agents`    | `feature/infra/DEV-1003-autonomous-agents`    | #3  | `553e39e` 19:34 | `69a0cc7` 19:35             | `692fd60` 19:54 |
| DEV-1004 | DEV-8  | `openspec/changes/archive/2026-10-31-dev-1004-mcp-integration`      | `feature/infra/DEV-1004-mcp-integration`      | #5  | `b58ced6` 20:38 | `47367e8` 20:40             | `dd9c1e9` 21:46 |
| DEV-1005 | DEV-9  | `openspec/changes/archive/2026-10-31-dev-1005-openspec-workflow`    | `feature/infra/DEV-1005-openspec-workflow`    | #6  | `ef6c3b5` 21:58 | `2572009` 21:59             | `a0b75c0` 22:06 |
| DEV-1006 | DEV-10 | `openspec/changes/archive/2026-10-31-dev-1006-auth`                 | `feature/backend/DEV-1006-auth`               | #7  | `2467934` 22:35 | `c0299fd` 22:38             | `390dee1` 23:39 |
| DEV-1007 | DEV-11 | `openspec/changes/archive/2026-11-01-dev-1007-projects`             | `feature/projects/DEV-1007-projects`          | #9  | `1a295fe` 00:02 | `d999451` 00:05             | `95166cf` 13:17 |
| DEV-1008 | DEV-12 | `openspec/changes/archive/2026-11-01-dev-1008-tasks`                | `feature/tasks/DEV-1008-tasks`                | #8  | `6d0ce14` 00:40 | `d8a54e8` 00:42             | `09cca24` 13:52 |
| DEV-1009 | DEV-13 | `openspec/changes/archive/2026-11-01-dev-1009-task-filtering`       | `feature/tasks/DEV-1009-task-filtering`       | #10 | `e9c78a1` 14:30 | `f4387e7` 14:33             | `3aa62e6` 15:13 |
| DEV-1010 | DEV-14 | `openspec/changes/archive/2026-11-01-dev-1010-comments-activity`    | `feature/comments/DEV-1010-comments-activity` | #11 | `92e10dd` 15:42 | `28a7230` 15:46             | `161f778` 16:54 |
| DEV-1011 | DEV-15 | `openspec/changes/archive/2026-11-02-dev-1011-auth-project-pages`   | `feature/web/DEV-1011-auth-project-pages`     | #13 | `98ad9e7` 17:24 | `6c50f7f` 17:39             | `53a8ffe` 01:30 |
| DEV-1012 | DEV-16 | `openspec/changes/archive/2026-11-02-dev-1012-task-pages`           | `feature/web/DEV-1012-task-pages`             | #12 | `6370e56` 22:57 | `9345807` 00:13             | `7497574` 10:56 |
| DEV-1013 | DEV-17 | `openspec/changes/archive/2026-11-02-dev-1013-comments-activity-ui` | `feature/web/DEV-1013-comments-activity-ui`   | #14 | `7f5552d` 11:49 | `cb4b033` 12:02             | `589a709` 14:45 |
| DEV-1014 | DEV-18 | `openspec/changes/archive/2026-11-02-dev-1014-worktree-evidence`    | `feature/infra/DEV-1014-worktree-evidence`    | #15 | `700110d` 15:03 | `6fdc1c1` 15:04             | `2cf1e9b` 15:21 |
| DEV-1015 | DEV-19 | `openspec/changes/archive/2026-11-02-dev-1015-codebase-graph`       | `feature/infra/DEV-1015-codebase-graph`       | #16 | `9310ee0` 15:51 | `159074d` 15:59             | `b1fb83d` 17:05 |

Notes:

- DEV-1007: times are 2026-11-01 local; implementation started after Gate 1.
- DEV-1001: the Gate 1 amendments (`dff7f86`, CI added; later alignment) came after implementation started; they are recorded in its `approvals.md`.
- DEV-1002: guardrail fixes after review went through PR #4 (`fix/infra/DEV-1002-guardrail-fixes`), see D-021.
- Gate 2 commits record the entry in `approvals.md`; the archive commit follows on the same branch.
- DEV-1006: Gate 1 was amended after implementation (task 4.3, server entrypoint found by /opsx:verify); the amendment is a separate row in its `approvals.md`.
- DEV-1010: times are 2026-11-01 local; implementation started after Gate 1. The Gate 1 amendment for design.md (check order, `8ce62d6`) came after implementation and before Gate 2; it is a separate row in its `approvals.md`.
- DEV-1011: Gate 1 and first implementation times are 2026-11-01 local, Gate 2 is 2026-11-02 local; implementation started after Gate 1. The Gate 1 amendment for design.md decision 13 (Lighthouse free port, median of 5, `de4cb05`) came after implementation and before Gate 2; it is a separate row in its `approvals.md`. Built in worktree `../ttt-1011` in parallel with DEV-1012.
- DEV-1012: Gate 1 time is 2026-11-01 local, first implementation and Gate 2 are 2026-11-02 local; implementation started after Gate 1. Built in worktree `../ttt-1012` in parallel with DEV-1011; origin/main (DEV-1011) was merged into the branch before Gate 2 (`8b952f0`), see `docs/evidence/DEV-1012/integration.md`.
- DEV-1013: Gate 1 (11:49), first implementation (12:02) and Gate 2 are all 2026-11-02 local; implementation started after Gate 1. Gate 2 entry, spec sync and archive were committed together in `589a709`.
- DEV-1014: Gate 1 (15:03), first implementation (15:04) and Gate 2 (15:21) are all 2026-11-02 local; implementation started after Gate 1. Docs and evidence only; consolidates the DEV-1007/1008 and DEV-1011/1012 worktree evidence in `docs/evidence/DEV-1014/parallel-work.md`. Spec sync and archive were committed after Gate 2.

## Append rule

Add the new ticket's row when the change is archived: assignment ID, Linear key (`docs/tickets/README.md`), archive path, branch, PR number, the commit that added the Gate 1 entry, the first implementation commit and the commit that added the Gate 2 entry, each with its time. If implementation started before Gate 1, say so in a note and add a deviation.
| DEV-1016 | DEV-20 | `openspec/changes/archive/2026-11-02-dev-1016-testing` | `feature/infra/DEV-1016-testing` | #17 | `12c6a1b` 17:36 | `3aee334` 17:41 | `80a004c` 18:21 |
