# Proposal

## Why

DEV-1016 (Linear DEV-20) closes the testing story: unit and integration tests, an authorization matrix, and an end-to-end journey. Most tests already exist (about 22 backend integration files, 8 shared, 20 frontend). What is missing is a real `pnpm test:e2e` (still a placeholder), and two open follow-ups: the Lighthouse run inside `pnpm test` fails under load (D-104, D-089, D-115) and one root tooling test is intermittently flaky.

## What Changes

- Add a coverage matrix (requirement or error code to existing test file) in `design.md`; add tests only for real gaps found while building it (none found so far for 400/401/403/404/409; tasks have no 403 by design).
- Move the full Lighthouse run out of `pnpm test`: remove the `pnpm lighthouse runs and exits 0` case from the root suite; `pnpm lighthouse` stays its own gate, run alone, threshold 95. Fast logic tests (`lighthouse-gate`, `lighthouse-pages`) stay.
- Time-boxed investigation of the flaky root tooling test (one task): fix the cause if found; otherwise record the evidence and "Follow-up: post-submission".
- Replace the `test:e2e` placeholder with a Playwright suite against the production build plus the backend on the Compose test Postgres: register, project, add member, task, filter, comment, activity. Replace the placeholder spec scenario and its placeholder test.
- E2E runs locally only, not in CI (deviation with reason); the Playwright report is saved as evidence.
- Scenario-to-test check (Linear AC): the specs carry no S-DEV IDs and cannot be edited, so add `docs/testing/scenario-test-map.md` (capability, scenario title, test file and test name) for every scenario in `openspec/specs/` and this change, and a `node:test` that fails if a scenario has no row or a row points to a missing test file. Recorded as a deviation.
- Coverage (Linear AC): add coverage scripts for backend, frontend and shared with an 80% line threshold on application code; the report is saved as evidence. Gaps below 80% are closed with tests for real gaps only, never by lowering the threshold or excluding files.
- New dev dependencies, approved at Gate 1: `@playwright/test` 1.61.1 and `@vitest/coverage-v8` 5.0.5 (both exact; the latter equals the pinned vitest). No other package without asking.
- Out of scope: load testing.

## Capabilities

### New Capabilities

### Modified Capabilities
- `workspace-quality-gates`: `test:e2e` becomes a real gate (replaces the placeholder requirement); Lighthouse is not part of `pnpm test`.

## Impact

- `package.json` files (scripts, devDependencies), lockfile, coverage config per package, `docs/testing/scenario-test-map.md`, `docs/VERSIONS.md`, new `e2e/` folder with `playwright.config.ts`, `scripts/tests/placeholders.test.mjs` and `agents-doc.test.mjs` edits, `docs/deviations.md`, `docs/evidence/DEV-1016/`; traceability row at archive.
- No API, schema or production code change.
