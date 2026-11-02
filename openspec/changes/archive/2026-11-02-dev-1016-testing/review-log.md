# Review log

- Change: dev-1016-testing (DEV-1016)
- Reviewer: reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-02

## Findings (verbatim)

| Severity | file:line | Issue | Fix | Status |
| -------- | --------- | ----- | --- | ------ |
| Non-blocking | docs/testing/scenario-test-map.md (row "workspace-quality-gates / Failure is reported") | The spec scenario "Failure is reported" has no automated test, only a `review:` row. Task 3.3 says to make it pass. D-130 discloses this. | Accept as D-130. Optionally add a `node:test` that checks the html reporter is configured with `outputFolder` `../playwright-report`. | Accepted |
| Non-blocking | docs/testing/scenario-test-map.md (rows "Coverage passes" and "Coverage below the threshold fails") | Both scenarios map to `review:` rows, not tests. Evidence of the failing threshold is only in docs/evidence/DEV-1016/coverage.md, from a manual run with `--coverage.thresholds.lines=101`. | Accept. Optionally add a static test that each package config has `thresholds.lines` equal to 80. | Accepted |
| Non-blocking | docs/testing/scenario-test-map.md (activity rows "Invalid pagination and unauthenticated request" and "Metadata schema accepts valid and rejects invalid input") | These are multi-clause scenarios mapped to one test each. The test named for "Invalid pagination and unauthenticated request" is only `Unauthenticated request is 401`, so the 400 half (`page=0`, unknown query parameter) is not covered by the named test. The metadata row names only the `to: BLOCKED` reject test, although shared `activity.test.ts` has separate tests for the other cases. D-131 admits the map is not hand-verified. | Name a second test in the row, or note "see also". Accept as D-131. | Accepted |
| Non-blocking | scripts/tests/lighthouse-outside-unit-suite.test.mjs:513-534 | The scenario says no Chrome or `vite preview` process is started. The test is a regex scan for spawn calls containing `pnpm lighthouse`. It would miss indirect invocations. | Accept. It meets the "full Lighthouse run removed" intent, and the threshold-95 test is sound. | Accepted |
| Non-blocking | scripts/e2e.mjs:374-376 | Extra CLI args are joined into a shell string run with `shell: true` and are not escaped. The script is local-only and the input is the developer's own, so there is no real exposure. | Pass arguments as an array with `shell: false`, or quote them. | Accepted |
| Non-blocking | docs/deviations.md D-128 vs design.md decision 4 | The Chromium download size is "about 94 MB" in D-128 and "about 150 MB" in design.md. | Align the two figures. | Accepted |
| Non-blocking | e2e/playwright.config.ts:184 | The backend readiness URL `/api/v1/projects` returns 401. This works because Playwright treats 200-403 as ready, but it is not obvious. | Add a comment, or use a health route if one exists. | Accepted |

Verdict (reviewer): no Blocking findings. The branch matches the approved spec, with only the Non-blocking items above, which are mostly already recorded as deviations.

## Disposition

| Finding | Blocking | Disposition |
| ------- | -------- | ----------- |
| Failure is reported has only a `review:` row | No | Accepted (non-blocking): covered by D-130; the runner exit code is the evidence |
| Coverage scenarios have only `review:` rows | No | Accepted (non-blocking): threshold failure evidenced in `docs/evidence/DEV-1016/coverage.md` |
| Two multi-clause activity rows name one test | No | Accepted (non-blocking): D-131 |
| Lighthouse guard is a regex scan | No | Accepted (non-blocking): guards the removed case; threshold test is sound |
| `e2e.mjs` joins extra args into a shell string | No | Accepted (non-blocking): local-only, developer input |
| Chromium size 94 MB vs 150 MB | No | Accepted (non-blocking): design.md figure was an estimate; D-128 holds the measured figure |
| Readiness URL returns 401 | No | Accepted (non-blocking): Playwright accepts 200 to 403 |

Not run by the reviewer: `pnpm test:e2e`, `pnpm coverage`, `pnpm lighthouse`, build, lint, typecheck (all run by the main session and recorded in `docs/evidence/DEV-1016/`).
