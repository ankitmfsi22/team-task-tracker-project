@AGENTS.md

## Workflow (MANDATORY)
- Features, API and schema changes: use only the installed OpenSpec commands: /opsx:explore, /opsx:propose, /opsx:update, /opsx:apply, /opsx:verify, /opsx:sync, /opsx:archive. Never create or use custom-named workflow commands.
- Every ticket: fetch the ticket via Linear MCP; use a labelled fixture in `docs/tickets/` only if MCP is unavailable, and say so.
- Check library APIs with Context7 MCP before using them; if it fails, note it and use official docs (Rule 5).
- /opsx:propose MUST produce all four artifacts together: `proposal.md`, `design.md`, `tasks.md`, `specs/<capability>/spec.md`. Then run `openspec validate <change> --strict`.
- Gate 1: STOP after propose. No production code until the human adds a Gate 1 entry in the change's `approvals.md` and commits it.
- /opsx:apply: for every task, FIRST invoke the test-writer sub-agent to write failing tests from the spec scenarios, THEN implement, then run lint, typecheck and test, then make one commit per task.
- After apply: run /opsx:verify, then invoke the reviewer sub-agent in a fresh context. The reviewer sub-agent (read-only) returns its findings; the main session saves them verbatim to `review-log.md` in the change folder. Blocking findings MUST be fixed before the PR.
- Gate 2: the human approves the PR; a Gate 2 entry is added to `approvals.md`.
- Fast lane (direct change without OpenSpec) is allowed only for a typo, config change or dependency patch.
- Lifecycle summary and the in-branch sync/archive reason: `docs/workflow.md`; every archived ticket appends a row to `docs/traceability.md`.
- Keep artifacts brief: max ~6 tasks per ticket, tests only for spec scenarios, no tests about docs/evidence files. Non-blocking findings go to the PR as accepted deviations; only blocking ones get fixed. Because pushing to main is forbidden, run /opsx:sync and /opsx:archive on the feature branch right after Gate 2, before merge.

## Every change folder MUST contain
`proposal.md`, `design.md`, `tasks.md`, `specs/`, `approvals.md`, `review-log.md`.
Copy `approvals.md` and `review-log.md` from `docs/templates/`.

## Commands
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `openspec validate <change> --strict`

## Commits and branches
- Commit: `type(scope): description (DEV-XXXX)`
- Branch: `feature/{domain}/DEV-XXXX-{short-name}`

## Definition of done
- The real ticket (or the labelled fixture) has been verified.
- OpenSpec artifacts are reviewed and approved (Gate 1).
- Implementation matches the approved change.
- Required tests pass, including error and authorization-denied scenarios.
- Build, lint, typecheck and test gates pass.
- Independent review is complete and blocking findings are resolved (`review-log.md`).
- Ticket, spec, branch, commit, tests and PR are traceable.
- /opsx:verify, /opsx:sync and /opsx:archive are completed at the right stage.

## Never
- Read or print `.env` files or secrets.
- Force-push, or push to main.
- Skip Gate 1.
- Approve your own work.
- Weaken or delete tests.
- Add packages without asking.
