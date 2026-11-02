# Review log

- Change: dev-1011-auth-project-pages (DEV-1011)
- Reviewer: independent reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-02

| Severity | file:line | Issue | Fix | Status |
| -------- | --------- | ----- | --- | ------ |
| Blocking | scripts/lighthouse.mjs | Lighthouse gate fails on repeated runs (/projects performance 88) | See Disposition 1 | Fixed |
| Non-blocking | docs/deviations.md D-089 | Cause and count of the flaky run do not match the evidence | See Disposition 2 | Fixed |
| Non-blocking | docs/deviations.md D-093 | Follow-up DEV-1016 to be confirmed | See Disposition 3 | Accepted |
| Non-blocking | docs/deviations.md D-088 to D-097 | Prettier reflowed the whole table | See Disposition 4 | Accepted |
| Non-blocking | frontend/src/lib/api/projects.ts:81 | `z.undefined()` defined in the frontend | See Disposition 5 | Accepted |
| Non-blocking | frontend/src/lib/auth/auth-context.tsx:30-39 | Non-secret session flag in localStorage | See Disposition 6 | Accepted |
| Non-blocking | frontend/src/pages/project-detail.tsx:140-141 | Role-based hiding and Query keys consistent | See Disposition 7 | Accepted |
| Non-blocking | specs coverage | Tests for LAST_OWNER, PROJECT_ARCHIVED and invalid name to confirm | See Disposition 8 | Accepted |
| Non-blocking | review-log.md, approvals.md | Empty at review time | See Disposition 9 | Fixed |

## Reviewer report (verbatim)

The summary table above only restates the report's findings, one row each, with the Status column set to the final disposition (the check script rejects `Open`).

Findings for branch feature/web/DEV-1011-auth-project-pages. I ran `pnpm test` and `pnpm lighthouse` myself and read the code. I did not run lint, typecheck or build.

TEST VERDICT: `pnpm test` is red. 235 of 236 root node:test cases pass. The failing case is "pnpm lighthouse runs and exits 0" (scripts/tests/agents-doc.test.mjs:84-88): /projects performance scored 88, below the 95 gate. My standalone `pnpm lighthouse` also failed (/login 97, /projects 88). I did not see the rest of the Vitest output.

BLOCKING
1. scripts/tests/agents-doc.test.mjs:84-88 and scripts/lighthouse.mjs: `pnpm test` fails because the Lighthouse case is flaky. Two runs in a row gave /projects performance 88. D-089 only explains one failure, under a parallel DEV-1012 worktree. The final evidence in docs/evidence/DEV-1011/02-lighthouse-final.md (98-99 for /projects) is not reproducible here. The definition of done needs test and lighthouse green, and a gate that fails on repeat is not acceptable as flaky.
   Recommendation: do not lower the threshold. Make the gate stable and fix the real cost. The /projects entry chunk is about 395 kB (121 kB gzip) plus a 48 kB projects chunk, so split further or trim it. Alternatively take the median of several Lighthouse runs. Re-run until `pnpm test` is green. I cannot rule out load from ttt-1012 on my side, so the human should check what was running.

NON-BLOCKING
2. docs/deviations.md D-089: it says the `pnpm test` case "failed once". It has now failed in my runs too. The evidence file says the flaky run was "before the detail page existed", but D-089 attributes it to the parallel DEV-1012 worktree. Reconcile the two and update the count and cause after fixing item 1.
3. docs/deviations.md D-093: accurate against frontend/src/test/setup.ts (asyncUtilTimeout 5000) and frontend/vite.config.ts (testTimeout 15_000). I saw no weakened assertions. Check that Follow-up: DEV-1016 is intended, since no code change closes it.
4. docs/deviations.md D-088 to D-097: the content matches the diff for D-091 (react-query 5.105.0), D-094, D-096 and D-090. The diff reflows the whole table (188 changed lines for 10 new rows). Avoid the Prettier-driven reflow of the older rows so the DEV-1012 merge conflicts stay small. D-097 already predicts overlapping IDs.
5. frontend/src/lib/api/projects.ts:81 and frontend/src/lib/api/auth.ts:25: `z.undefined()` is defined in the frontend for 204 responses. AGENTS.md says schemas live in packages/shared. Export a NoContentSchema from shared, or accept this as a minor deviation.
6. frontend/src/lib/auth/auth-context.tsx:30-39: localStorage holds the non-secret `ttt.session` flag, which design decision 6 and the Gate 1 approval cover. The access token is only in lib/auth/token.ts, and I found no token storage. A test covers it. No change needed.
7. frontend/src/pages/project-detail.tsx:140-141: write actions are hidden, not disabled, for MEMBER and for archived projects, as decision 9 requires. TanStack Query keys and mutations follow decision 8. No `any`, `@ts-ignore` or `eslint-disable` in non-test sources (grep). No change needed.
8. Spec coverage: there are 46 scenarios, and I mapped test names to the main ones. Auth, client, session, route-guard, list, create, detail, member and role-view scenarios have tests. I could not confirm explicit tests for the 409 LAST_OWNER case (the test name was truncated in my grep), the 409 PROJECT_ARCHIVED case, or the invalid-project-name case on create. The author should confirm each has a test.
9. openspec/changes/dev-1011-auth-project-pages/review-log.md is an empty template and the Gate 2 row in approvals.md is empty. Both are expected at this stage.

VERDICT: one blocking issue, `pnpm test` fails because the Lighthouse gate scores /projects at 88 on repeated runs here. Everything else is consistent with the spec, design and conventions, with minor documentation and cleanup notes.

## Disposition

Blocking findings are fixed by doing the work; non-blocking findings are accepted as deviations (PR "accepted deviations") or fixed when cheap.

| # | Finding | Disposition | Reason / work done | Deviation |
| --- | --- | --- | --- | --- |
| 1 | BLOCKING: `pnpm lighthouse` fails on repeated runs | Fixed | Root cause found by repeated runs: `vite preview` was pinned to port 4173, so two worktrees running the gate at once shared or killed each other's preview server (runs scored 0 in every category). The script now uses a free port per run, audits each page 5 times and gates the median per category (`medianScores`, unit tested, threshold still 95, a null score counts as 0), and prints FCP, LCP, TBT and any runtime error for a low page. Consecutive runs after the fix scored 100 (login) and 99 (projects) in performance; details in `02-lighthouse-final.md` | D-089, D-098 |
| 2 | D-089 cause and count | Fixed | D-089 rewritten with the real causes (shared preview port, load) and the real failure count | D-089 |
| 3 | D-093 follow-up DEV-1016 | Accepted | Intended: DEV-1016 owns the Playwright and test-infrastructure work | D-093 |
| 4 | Prettier reflowed the whole deviations table | Accepted | `pnpm format:check` is a mandatory gate and the table is column-aligned; DEV-1012 resolves its append conflict on merge | D-097 |
| 5 | `z.undefined()` in the frontend for 204 | Accepted | A Zod primitive for "no body", not a domain schema or type; no shared schema is redefined | D-099 |
| 6 | `ttt.session` flag in localStorage | Accepted | Approved at Gate 1 (design decision 6); holds the constant `1`, no identity | none (Gate 1) |
| 7 | Hidden actions and Query keys follow decisions 8 and 9 | Accepted | Informational, no change needed | none |
| 8 | Tests for LAST_OWNER, PROJECT_ARCHIVED, invalid name | Accepted | LAST_OWNER and invalid project name (empty and 101 characters) have tests; the `PROJECT_ARCHIVED` inline message is design decision 10 only, no spec scenario, so it has no test | D-099 |
| 9 | Empty review-log / Gate 2 row | Fixed | This file now holds the review; the Gate 2 row stays empty until the human approves the PR | none |

## Security audit (security-auditor, read-only, before PR)

Full output saved verbatim in `docs/evidence/DEV-1011/03-security-audit.md`. Verdict: PASS, no blocking findings.

| # | Finding | Disposition | Reason / work done | Deviation |
| --- | --- | --- | --- | --- |
| N1 | `startsWith('/')` also accepts `//host` as stored redirect target | Fixed | The check now rejects `//` and backslash prefixes in `protected-route.tsx`; regression test in `login.test.tsx` | none |
| N2 | Two moderate dev-only advisories (`glob`, `minimatch`) via `lighthouse` | Accepted | Not in the shipped bundle; same family as D-049, D-060, D-066 and D-087 | D-100 |
| N3 | `ttt.session` readable by page scripts | Accepted | By design (Gate 1); never put identity in it | none |
| N4 | Refresh-failure `ApiError` carries the server message | Accepted | The UI renders fixed strings only | none |
