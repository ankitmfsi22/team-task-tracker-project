# Tasks

## 1. Lighthouse gate separation

- [x] 1.1 Remove the `pnpm lighthouse runs and exits 0` case from `scripts/tests/agents-doc.test.mjs`; keep the logic tests; verify the "Unit suite has no browser audit" and "Gate still enforces 95" scenarios; close D-104 in `docs/deviations.md`.

## 2. Flaky root tooling test (time-boxed)

- [x] 2.1 Reproduce the intermittent failure (repeated runs, alone and under CPU load), fix the real cause without skips or weaker assertions; if not found, save the evidence in `docs/evidence/DEV-1016/flaky.md` and record "Follow-up: post-submission".

## 3. Playwright E2E

- [x] 3.1 Test-writer first: replace the placeholder case in `scripts/tests/placeholders.test.mjs` and the `test:e2e` entry in `agents-doc.test.mjs` for the "Placeholder is gone" scenario; confirm they fail.
- [x] 3.2 Add `@playwright/test` 1.61.1 (after approval), `e2e/playwright.config.ts` (backend and `vite preview` web servers, Chromium) and `test:e2e`; record the version in `docs/VERSIONS.md`.
- [ ] 3.3 Write the journey test (register, project, add member, task, filter, comment, activity) and make "User journey passes" and "Failure is reported" pass.

## 4. Scenario-to-test map

- [ ] 4.1 Test-writer first: a `node:test` in `scripts/tests/` for the "Unmapped scenario fails the check" and "Row pointing to a missing test fails the check" scenarios (using temporary fixtures, not edits to real specs); confirm it fails; then write `docs/testing/scenario-test-map.md` for every scenario in `openspec/specs/` and this change and make it pass.

## 5. Coverage

- [ ] 5.1 Add `@vitest/coverage-v8` 5.0.5 (approved), coverage config with `lines: 80` and `coverage` scripts for backend, frontend, shared and root; run them, save the reports in `docs/evidence/DEV-1016/coverage/`; for any package below 80% add tests only for real uncovered application code (test-writer first), never lowering the threshold or excluding files.

## 6. Evidence and deviations

- [ ] 6.1 Run `pnpm test:e2e`, save the Playwright report in `docs/evidence/DEV-1016/`, append the DEV-1016 rows to `docs/deviations.md` (e2e local only; no S-DEV IDs, mapping file instead), update the coverage matrix if a gap was found, and run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check`, `openspec validate dev-1016-testing --strict`.
