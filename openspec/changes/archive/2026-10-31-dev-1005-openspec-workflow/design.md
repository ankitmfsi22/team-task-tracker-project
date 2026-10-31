## Context

DEV-1005 AC: (1) each change links ticket key, branch and spec and holds the six artifacts; (2) `openspec validate <change> --strict` passes after propose; (3) no production code before a Gate 1 entry; (4) verify, sync and archive in order, Gate 2 recorded.

Observed: `docs/templates/` has `approvals.md` and `review-log.md`; four archived changes exist, each with both gates `Approved`; CI already runs `openspec validate --all --strict`; `docs/tickets/README.md` maps assignment IDs to Linear keys. Review-log tables differ per ticket (DEV-1001 has a leading `#` column; some rows are shorter than the header).

## Decisions

- **Check as a module**: `scripts/check-changes.mjs` exports `checkChanges(archiveDir)` returning a list of problems (`change: file: reason`) and runs as a CLI. The test imports it, runs it on the real archive and on temp-dir fixtures for the failure cases. Not wired into `pnpm lint`; `pnpm test` runs it in CI, so no gate command changes.
- **Gate rule**: `approvals.md` passes when a row whose first cell starts with `Gate 1` and a row starting with `Gate 2` both have Decision `Approved` (amendment rows are allowed). Empty or `Changes requested` fails.
- **Review-log rule**: find the column headed `Status` in each table; any later row whose Status cell begins with `Open` fails. Rows shorter than the header are skipped. The file must exist.
- **Scope of the check**: archived changes only; active changes are validated by `openspec validate --strict`. The check never edits archived files.
- **Register**: `docs/traceability.md` is a hand-kept table (columns: Ticket, Linear, Change, Branch, PR, Gate 1 commit + date, First implementation commit + date, Gate 2 commit; the first implementation commit is the first non-planning, non-approval commit on the branch, so AC3 ordering is visible per row). No test about it (project rule: no tests about docs); the PR template asks the author to append the row and Gate 2 review confirms it.
- **PR template**: plain markdown headings with checkboxes; the FRS IDs field says "n/a (tooling)" for infra tickets.
- **AC3 (no code before Gate 1)**: enforced by process: CLAUDE.md lists "Skip Gate 1" under Never, and the independent reviewer compares commit order with the Gate 1 commit. A git-history test is skipped: it needs full history, breaks on squash merges and tests the repo's past rather than a spec scenario.
- **AC4 vs CLAUDE.md**: the ticket says verify, sync and archive "after merge". `main` is push-protected, so CLAUDE.md runs them on the feature branch right after Gate 2, before merge. The order (verify, sync, archive) is kept; recorded as D-033.
- **workflow.md**: under one page: ticket fetch, explore, propose, validate, Gate 1, apply (test-writer, implement, one commit per task), verify, reviewer, review-log, Gate 2, sync, archive, PR; fast lane limited to typo, config change, dependency patch.

## Risks

- A legacy review log with an unusual layout could fail the check; the apply task fixes the parser, never the archived file.
- The register can drift from reality; mitigated by the PR template field and Gate 2 review.
