# Design

## Context

Playwright APIs checked with Context7 (`/microsoft/playwright`): `webServer` accepts an array (frontend and backend, `reuseExistingServer: !process.env.CI`), `reporter: [['html', { outputFolder }]]`, browsers install with `playwright install --with-deps` in CI. The Linear DEV-20 acceptance criteria are in scope: the scenario-to-test check and 80% coverage on application code (Gate 1 decision).

## Coverage matrix (existing tests)

| Requirement / code | Existing test files |
| ------------------ | ------------------- |
| Unit: validation | `packages/shared/src/{auth,projects,tasks,comments,activity,common}.test.ts` |
| Unit: status transitions | `tasks.test.ts` (shared), `tasks.assign-status.integration.test.ts` |
| Unit: permissions | `middleware/project-access.integration.test.ts`, `comments.edit-delete.integration.test.ts` |
| 400 | all 13 `*.integration.test.ts` incl. auth, projects, tasks, comments, activity |
| 401 | auth (2), projects, tasks create/list, comments (2), activity, project-access |
| 403 | projects, projects.archive, projects.members, comments.edit-delete, project-access (tasks have no 403 rule: any member may edit) |
| 404 | projects, members, archive, all tasks files, comments, activity, project-access |
| 409 | auth register, members, archive, tasks create/update/assign/archive/activity, comments |
| Frontend forms | `login`, `register`, `task-create-form`, `task-edit-form` tests |
| Frontend permission UI | `project-detail`, `task-detail-actions`, `task-comments-actions`, `app-layout` tests |
| Integration on real Postgres | `backend/src/test/global-setup.ts` (throwaway Compose Postgres) |
| E2E journey | none (gap, filled by this change) |
| Lighthouse | `scripts/lighthouse.mjs` plus logic tests; full run wrongly inside `pnpm test` (gap) |

Real gaps: the E2E journey and the Lighthouse placement. No new unit or integration tests are planned.

## Goals / Non-Goals

**Goals:** a real E2E gate; Lighthouse as a separate gate; the flaky test fixed or evidenced.
**Non-Goals:** load testing, CI e2e, new tests for already covered scenarios.

## Decisions

1. **Lighthouse out of `pnpm test`**: the loop in `agents-doc.test.mjs` keeps `format:check` and `test:e2e` (the latter replaced, see 3) and drops `lighthouse`. `pnpm lighthouse` runs alone; threshold 95 and `RUNS_PER_PAGE` unchanged; D-104 follow-up closed.
2. **Flaky tooling test (one task, time-boxed)**: run the root suite repeatedly, alone and under CPU load, to reproduce. Working hypothesis: `node --test` runs files in parallel and the heavy Lighthouse and `pnpm` child processes starve the hook, `openspec validate` (55 s) and Compose tests. 8 runs on a quiet machine passed 242/242, so the load case is the one to reproduce. Fix by cause (for example serialising heavy files or per-test timeouts), no skips, no weaker assertions. If not found: evidence in `docs/evidence/DEV-1016/flaky.md` and "Follow-up: post-submission".
3. **E2E design**: `@playwright/test` 1.61.1 (exact), Chromium only, config at `e2e/playwright.config.ts`, `workers: 1`. `webServer` array: the backend (built, `node dist`) on the Compose test Postgres database (migrated via the same throwaway mechanism as the backend tests), and `vite preview` of the production build with the same-origin proxy. One journey test: register, create project, add member, create task, filter, comment, activity entry visible. Each run registers fresh unique users, so no cleanup is needed. `test:e2e` runs the config; the HTML report goes to `playwright-report/` (already git-ignored) and a copy to `docs/evidence/DEV-1016/`.
4. **E2E not in CI** (deviation): it needs Docker Postgres, a production build and a browser download (about 150 MB) that make the 4 existing CI steps much slower, and the ticket time-box ends at 21:00. CI keeps format, lint, typecheck, test, build, validate and audit. The suite is documented as a required local gate before merge. A follow-up can add a CI job with `playwright install --with-deps chromium` pinned to 1.61.1.
5. **Placeholder replacement**: remove the "E2E placeholder" requirement and its test case in `placeholders.test.mjs`; `agents-doc.test.mjs` no longer runs `test:e2e` in the unit suite (it needs services), only checks the script exists.

## Risks / Trade-offs

- [E2E flaky from timing] → web-first assertions, one worker, no fixed sleeps, unique data per run.
- [Local only, so regressions unseen in CI] → recorded deviation; report saved as evidence.
- [Flaky root cause not found in the time-box] → evidence plus post-submission follow-up.
- [Playwright 1.64.1 is newer; 1.61.1 is the version documented in Context7] → exact pin, recorded in `docs/VERSIONS.md`.

6. **Scenario map**: the specs have no S-DEV IDs and must not be edited, so `docs/testing/scenario-test-map.md` is a table `capability | scenario title | test file : test name` with one row per scenario of every spec under `openspec/specs/` (333 today) and of this change. A `node:test` in `scripts/tests/` parses `#### Scenario:` headings from those specs and the change's delta specs, and fails when a scenario has no row, or a row's test file does not exist or does not contain the named test. Scenarios with no automated test (docs and process scenarios) map to a reviewer check named in the row (`review: <what>`), which the test accepts only with that prefix. Deviation: "no S-DEV IDs in specs; mapping file instead".
7. **Coverage**: `@vitest/coverage-v8` 5.0.5 (same as vitest) in backend, frontend and shared; `coverage` script per package using `vitest run --coverage` with the v8 provider, `include` limited to `src/**` application code excluding only test files and type declarations, and a `thresholds.lines: 80` that fails the run. Reports go to `docs/evidence/DEV-1016/coverage/`. If a package is under 80%, add tests for the uncovered application code; the threshold is never lowered and no application file is excluded to pass. Root `pnpm coverage` runs the three.

## Risks (added)

- [Mapping file drifts from specs] mitigated by the `node:test` failing on a missing row; archive adds scenarios, so the map is updated in the same change.
- [Coverage below 80% in a package] new tests only for real gaps; if impossible in the time-box, record it honestly rather than weaken the gate.
- [Flaky candidate observed] one of 5 repeated root runs failed `openspec validate --all --strict` while this change folder was being created mid-run, so it is confounded; the 55 s timeout under load is still the main suspect. Task 2.1 reproduces it cleanly.
