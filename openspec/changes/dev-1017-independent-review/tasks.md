# Tasks

## 1. Fresh-context reviews

- [x] 1.1 Invoke `reviewer` and `security-auditor` in parallel, fresh contexts, over whole `main` (scope in design decision 1); require severity, `file:line`, issue, fix, blocking yes/no. Save the reviewer output verbatim in `review-log.md` (template table, "Context: fresh") and the security output in `docs/evidence/DEV-1017/security-audit.md`; send back any finding missing `file:line` or severity.

## 2. Graph-assisted impact

- [ ] 2.1 Rebuild Code Review Graph at the current commit; get impact radius and affected tests for project-access, auth/refresh and comment permissions; confirm each claim in source with `file:line`; save raw output in `docs/evidence/DEV-1017/graph.md`; check Context7 only if a graph tool's usage is unclear.

## 3. Fix blocking, accept the rest

- [ ] 3.1 Classify every finding in source; for each blocking one: test-writer first, fix, own commit, status "Fixed" in `review-log.md`; add each non-blocking one to `docs/deviations.md` as an accepted deviation (status "Accepted"). If a fix needs an API or schema change, stop for `/opsx:update`.

## 4. Final report and verification

- [ ] 4.1 Write `docs/review/final-review.md` (spec compliance, security, test coverage, authorization-denied matrix per route group, graph impact, accepted deviations); update D-019 in `docs/deviations.md` to "Follow-up: post-submission" (hook untouched); run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `openspec validate dev-1017-independent-review --strict`.
