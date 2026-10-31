# Workflow

Every ticket follows one lifecycle. Rules: `CLAUDE.md`. Evidence per ticket: `docs/traceability.md`.

## Lifecycle

1. Fetch the ticket via Linear MCP (labelled fixture in `docs/tickets/` only if MCP is unavailable). Branch: `feature/{domain}/DEV-XXXX-{short-name}`.
2. `/opsx:explore` when the problem is unclear.
3. `/opsx:propose` writes `proposal.md`, `design.md`, `tasks.md` and `specs/<capability>/spec.md`. Copy `approvals.md` and `review-log.md` from `docs/templates/`. Run `openspec validate <change> --strict`. Use `/opsx:update` to revise.
4. **Gate 1**: stop. The human adds a Gate 1 entry (`Approved`) to `approvals.md` and commits it. No production code, and no implementation commit, before that commit.
5. `/opsx:apply`: for each task the test-writer writes failing tests from the spec scenarios, then implement, then `pnpm lint`, `pnpm typecheck`, `pnpm test`, then one commit per task: `type(scope): description (DEV-XXXX)`.
6. `/opsx:verify`, then the reviewer sub-agent in a fresh context. The main session saves its findings verbatim in `review-log.md`. Blocking findings are fixed; non-blocking ones are marked "Accepted (non-blocking): reason" and listed in the PR and `docs/deviations.md`.
7. Open the PR from `.github/pull_request_template.md`.
8. **Gate 2**: the human approves the PR and adds a Gate 2 entry (`Approved`) to `approvals.md`.
9. `/opsx:sync`, then `/opsx:archive`, then append the row to `docs/traceability.md`. `node scripts/check-changes.mjs` (run through its node:test in `pnpm test` and CI) fails if an archived change lacks an artifact, a gate approval or has an `Open` finding.

## Why sync and archive run on the feature branch

`main` is push-protected, so nothing can be archived after merge. Verify, sync and archive therefore run in that order on the feature branch right after Gate 2, before the merge (D-033).

## Fast lane

A direct change without OpenSpec is allowed only for a typo, a config change or a dependency patch. New behaviour, API or schema changes always use the lifecycle above.
