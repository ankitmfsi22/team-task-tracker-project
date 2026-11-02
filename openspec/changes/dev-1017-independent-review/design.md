# Design

## Context

All feature tickets are merged. `main` has 19 specs, backend integration tests per feature, a Playwright journey and an 80% coverage gate (DEV-1016). Review so far was per-PR. The graph index was built on the DEV-1015 branch and is stale.

## Goals / Non-Goals

- Goals: one independent review of whole `main`; saved evidence; blocking fixed; rest accepted.
- Non-goals: fixing non-blocking findings; D-019; new features; new packages.

## Decisions

1. **Two sub-agents, fresh contexts, in parallel.** `reviewer` (spec compliance and test coverage) and `security-auditor` (secrets, auth/tokens, membership). The reviewer tool set has no general shell, so the prompt names the files to read (`openspec/specs/`, `backend/src/`, `packages/shared/`, `frontend/src/`, `docs/evidence/`, `docs/testing/`) instead of a diff. Neither agent gets this session's conclusions, only the scope and the output format (severity, `file:line`, issue, fix, blocking yes/no).
2. **Graph is a lead, source is the proof.** Rebuild with the pinned CLI (`export PATH="$HOME/.local/bin:$PATH"`, per `docs/GRAPH-TOOLS.md`), then `get_impact_radius_tool` and `query_graph_tool` for `project-access.ts`, the auth/token services and `comments.service.ts`. Confirm each caller and test by reading source. Save the raw graph output under `docs/evidence/DEV-1017/`.
3. **Verbatim log, separate report.** The main session pastes the reviewer's table into `review-log.md` unedited. `docs/review/final-review.md` is the consolidated summary (security findings, graph impact, coverage, accepted deviations, D-019).
4. **Blocking means:** a spec requirement violated, a missing membership/role check, a secret or token exposure, or an untested authorization path. Everything else is non-blocking.
5. **Fixes go through the normal loop:** test-writer first, then implementer, one commit per fix `fix(scope): ... (DEV-1017)`. A fix needing an API or schema change stops the change for `/opsx:update`.
6. **No tests about the review docs** (project rule). Tests exist only for blocking-finding fixes.

## Risks / Trade-offs

- A fresh agent may report noise: each finding is checked in source by the main session before being classified; a rejected finding is still kept verbatim in the log with status "Rejected" and a reason.
- Time-box to 21:00: if blocking fixes cannot finish, stop and tell the human; do not downgrade a finding to fit the time.
- The reviewer cannot run the full suite (`pnpm test:*` only); the main session runs lint, typecheck, test and build and supplies results as evidence.

## Open Questions

None.
