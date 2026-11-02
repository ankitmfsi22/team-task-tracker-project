# Retrospective

Covers DEV-1001 to DEV-1018. Items marked **(provided by Ankit Singh)** are the human's account of events that are not fully visible in the repository; the rest is tied to a ticket, commit or deviation.

## Context: the previous attempt (provided by Ankit Singh)

The previous attempt received poor senior feedback because the AI mixed the SDD guide workflow with `ASSIGNMENT.md`. Eight problems were named: custom `/sdd-*` commands instead of the installed OpenSpec commands, the test-writer sub-agent never invoked, propose without `design.md` and `tasks.md`, missing explore, update and sync steps, missing agents and two hooks, missing `approvals.md`, and no per-ticket review log. This attempt fixed all eight and keeps the rules in [`CLAUDE.md`](../CLAUDE.md) so each session starts from them.

## Successes

- **One lifecycle for every ticket**: fetch from Linear MCP, propose with four artifacts, Gate 1, test-writer first, one commit per task, verify, fresh-context review, Gate 2, sync and archive on the branch. Seventeen changes are archived with all six required files; `scripts/check-changes.mjs` fails `pnpm test` if one is missing ([`workflow.md`](workflow.md), [`traceability.md`](traceability.md)).
- **Traceability is tested**: every spec scenario maps to a test or a reviewer check, and a test fails when a mapping goes stale ([`testing/scenario-test-map.md`](testing/scenario-test-map.md)). This caught stale mappings again in DEV-1018.
- **Independent review**: each ticket has a verbatim `review-log.md`; DEV-1017 reviewed the whole product in a fresh context with a security audit and graph-assisted impact analysis ([`review/final-review.md`](review/final-review.md)).
- **Parallel work in worktrees** for DEV-1007/1008 and DEV-1011/1012 with integration evidence ([`WORKTREES.md`](WORKTREES.md), [`evidence/DEV-1014/`](evidence/DEV-1014/)).
- **Evidence-based token work**: measured comparison with limits stated ([`TOKEN-REPORT.md`](TOKEN-REPORT.md)).
- **A visible deviation register** (D-001 to D-150) where every deferral has an owner or an explicit post-submission reason ([`deviations.md`](deviations.md)).
- **DEV-1018 ran the whole app in containers for real**: images build, `migrate` applies migrations and the seed, a demo user logs in through the nginx proxy, containers run non-root ([`evidence/DEV-1018/`](evidence/DEV-1018/)).

## Failures

- **Early fail-open hook, and archive and spec edits caught and reverted (provided by Ankit Singh).** The hook still fails open on malformed input (D-019); it was not fixed in time.
- **Lighthouse flakiness under load (provided by Ankit Singh).** Scores swung with machine load, up to a run that scored 0 (D-089, D-104). DEV-1016 moved Lighthouse out of the unit suite (`3aee334`).
- **Windows machine load (provided by Ankit Singh).** Work moved to macOS after the DEV-1013 apply.
- **Linear MCP authenticated to an old workspace on the Mac (provided by Ankit Singh).** DEV-1013 to DEV-1016 lookups and updates were first made in the wrong workspace and redone in `team-tasktracker`; code and OpenSpec artifacts were unaffected (D-134).
- **Context7 key not visible to VS Code until restart (provided by Ankit Singh).**
- **A reviewer's verbatim text was edited by mistake** after an ID renumber and had to be restored from git history (D-143).
- **DEV-1018 itself**: a heredoc rewrite of `pnpm-workspace.yaml` dropped its `packages:` list and regenerated the lockfile; it was caught by `pnpm install --frozen-lockfile`, reverted and redone. Adding Compose services also broke two throwaway-database starters (backend test setup and the E2E script) until they were scoped to `postgres`.

## Human interventions

- **Every Gate 1 and Gate 2** was a human decision recorded in `approvals.md` on the approver's instruction (provided by Ankit Singh).
- **Amendments when the design changed**, for example the Gate 1 amendment for the `uvx` launch of Code Review Graph and for the Lighthouse median gate (provided by Ankit Singh).
- **Scope decisions** (what is post-submission, and which findings block) (provided by Ankit Singh).
- **Linear chosen over Plane for time** (provided by Ankit Singh; [`decisions/0001-bootstrap-and-tracker.md`](decisions/0001-bootstrap-and-tracker.md)).
- **Senior-feedback fixes**: the eight items above (provided by Ankit Singh).
- **Linear workspace correction** (D-134).
- DEV-1018: the human added `SEED_DEMO_PASSWORD` to `.env.example` and `.env`, approved the image tags and Action SHAs at Gate 1, and fixed the rule that replaced tests may not be weaker.

## Improvements

- **A separate Lighthouse gate** with a CI job that has Chrome (D-088; the local gate is separate since `3aee334`) (provided by Ankit Singh).
- **A fail-closed hook** with its own OpenSpec change (D-019) (provided by Ankit Singh).
- **Branch protection** once the repo owner's email is verified (D-026) (provided by Ankit Singh).
- **Playwright E2E in CI** (provided by Ankit Singh).
- Security hardening that was reviewed and deliberately deferred: rate limiting and security headers (D-137), secret-strength checks (D-138), token-family revocation (D-140).
- Align the `workspace-quality-gates` "Actions are pinned" scenario text with SHA pinning (D-144).
- Run `docker compose up` in CI as a smoke check, and add a health route so the backend healthcheck does not rely on a 401 (D-149).
