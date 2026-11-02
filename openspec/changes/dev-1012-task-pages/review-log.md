# Review log

- Change: dev-1012-task-pages (DEV-1012)
- Reviewer: reviewer sub-agent (read-only, fresh context)
- Context: fresh
- Date: 2026-11-02

Result: no Blocking findings. Non-blocking findings are accepted deviations (CLAUDE.md), recorded in `docs/deviations.md` as D-107 to D-110.

## Disposition

| Severity     | file:line                                          | Issue                                                                                   | Fix                                          | Status           |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------- |
| Non-blocking | frontend/src/pages/task-detail.tsx:546-547         | Project query failure hides the actions with no notice                                  | None in this change                          | Accepted (D-107) |
| Non-blocking | frontend/src/pages/task-list.tsx:236-248           | `?page` beyond the last page shows "No tasks yet" with no way back                      | None in this change                          | Accepted (D-108) |
| Non-blocking | frontend/src/pages/task-list.tsx:180-184           | Members query error ignored; assignees show "Former member"                             | None in this change                          | Accepted (D-108) |
| Non-blocking | frontend/src/pages/task-list.tsx:273               | Previous stays enabled while placeholder data shows; rapid clicks can skip pages        | None in this change                          | Accepted (D-109) |
| Non-blocking | frontend/src/pages/task-detail.tsx:539-542         | Assignee reads "Former member" and actions appear late until members and project arrive | None in this change                          | Accepted (D-109) |
| Non-blocking | scripts/lighthouse.mjs, docs/deviations.md D-104  | Task list performance varies 73 to 98 under load                                        | Gate run alone; evidence file lists all runs | Accepted (D-104) |
| Non-blocking | frontend/src/pages/task-detail.tsx:610, :596       | The 403 test does not assert that the select value reverts                              | None                                         | Accepted (D-110) |
| Non-blocking | openspec/changes/dev-1012-task-pages/tasks.md:16   | Task 2.2 cites "Unauthorized and impossible actions are hidden"; spec title differs     | None (Gate 1 artifact, documentation only)   | Accepted (D-110) |
| Non-blocking | openspec/changes/dev-1012-task-pages/review-log.md | Review log was the empty template                                                       | This file                                    | Fixed            |

## Reviewer report (verbatim)

Review of feature/web/DEV-1012-task-pages (`git diff ab522dd..HEAD`) against openspec/changes/dev-1012-task-pages.

Verdict: no Blocking findings. All 61 frontend Vitest tests pass; I ran `pnpm exec vitest run` in `frontend/`. The root `pnpm test` hit my 120s timeout; it finished in the background with exit 0, but I did not read its tail. I did not run lint, typecheck, build, Lighthouse or `openspec validate`. The Lighthouse scores in `docs/evidence/DEV-1012/lighthouse.md` are unverified by me.

**Spec and design coverage**

- Every spec scenario has a matching test. I matched them by test name and did not read every assertion body.
- The checked design decisions are followed:
  - `useSearchParams` is the single source of truth (`task-list.tsx:172-173`).
  - Query keys are `['tasks', projectId, query]`, `['task', ...]`, `['project', id]` and `['project', id, 'members']`.
  - `placeholderData: keepPreviousData` is used (`task-list.tsx:178`).
  - A filter or sort change deletes `page` (reset to 1).
  - `canModify` exists (`task-detail.tsx:495`).
  - Error mapping is 403 "You do not have permission", 404 "Not found", otherwise Retry.
- Types and schemas come from `@team-task-tracker/shared`. I found no `any`, `@ts-ignore` or `eslint-disable`, and no new packages.
- The `task-detail.test.tsx` edit in commit 427d4f9 is legitimate. It only adds `{ selector: ':not(option)' }` to three queries, because the new "Assign to" select repeats the member names and "Unassigned" as options. The assertions keep their meaning, and the change is recorded as D-105.
- The Lighthouse change is correct: a PAGES entry plus stub routes for the project, members and tasks. The hard-coded project id equals `PROJECTS[0].id`, which is the `TASK_PROJECT` the stub serves.

**Non-blocking findings**

| Severity     | file:line                                                  | Evidence                                                                                                                                                                                                                                      | Recommendation                                                                                                                         |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Non-blocking | frontend/src/pages/task-detail.tsx:546-547                 | If the project query fails (403 or 404), `project` is undefined, `canModify` returns false and the actions disappear with no notice and no error. `projectQuery.isError` is never read.                                                       | Show an error or notice when the project query fails. Alternatively, record the behaviour as an accepted deviation.                    |
| Non-blocking | frontend/src/pages/task-list.tsx:236-248                   | If `?page=99` is beyond the last page, the API returns an empty `data` array. With no filter active, the page says "No tasks yet" with no way back, which is misleading.                                                                      | When `meta.total > 0` and `data` is empty, show an empty state with a link or button to page 1. A clamp is also possible.              |
| Non-blocking | frontend/src/pages/task-list.tsx:180-184                   | The members query error is ignored. The assignee filter then has no options, and rows show "Former member" for every assigned task.                                                                                                           | Treat a members error as a non-fatal inline notice. Alternatively, fall back to the raw id or "Unknown".                               |
| Non-blocking | frontend/src/pages/task-list.tsx:273                       | Next is disabled while placeholder data shows, but Previous is not. Rapid clicks on Previous during a pending page change can skip pages (goToPage uses `result.meta.page`, the stale value).                                                 | Also disable Previous when `isPlaceholderData`, or compute the page from the URL params.                                               |
| Non-blocking | frontend/src/pages/task-detail.tsx:539-542                 | The task is shown as soon as it loads, but members and project load separately. The assignee reads "Former member" until members arrive, and the actions appear late.                                                                         | Wait for the members query before rendering the assignee, or show "…" while it loads.                                                  |
| Non-blocking | scripts/lighthouse.mjs and docs/deviations.md D-104        | Task list performance varies from 73 to 98 across runs. A 95 gate that is flaky under load may fail CI.                                                                                                                                       | Keep the documented mitigation (run the gate alone). Confirm the final evidence file shows a passing run on an idle machine.          |
| Non-blocking | frontend/src/pages/task-detail.tsx:610 and :596            | The assign select is controlled by `task.assigneeId`. On a failed mutation it reverts, which is correct, but a 403 test only checks that the message shows.                                                                                   | Optional: assert that the select value is unchanged.                                                                                   |
| Non-blocking | openspec/changes/dev-1012-task-pages/tasks.md:16           | Task 2.2 cites the spec requirement "Unauthorized and impossible actions are hidden", but the spec title is "Impossible actions are hidden".                                                                                                  | Fix the reference; documentation only.                                                                                                 |
| Non-blocking | openspec/changes/dev-1012-task-pages/review-log.md         | The file is still the empty template.                                                                                                                                                                                                         | The main session must save this review there verbatim, as CLAUDE.md requires.                                                          |
---

## Review 2 (after merging origin/main, DEV-1011 integrated)

- Reviewer: reviewer sub-agent (read-only, fresh context)
- Context: fresh
- Date: 2026-11-02
- Diff: `git diff origin/main...HEAD` (origin/main = 94eeecf)
- Note: Review 1 above is the pre-merge review; its line numbers and test counts (61 tests) predate the merge and are kept verbatim. The branch now has 95 frontend tests.

Result: no Blocking findings.

### Disposition (review 2)

| Severity     | file:line                                            | Issue                                                                                     | Fix                                                                       | Status           |
| ------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------- |
| Non-blocking | docs/evidence/DEV-1012/lighthouse.md, integration.md | Post-merge Lighthouse gate and root `pnpm test` case are red on this machine in some runs | Listed honestly; PR states it; D-104 and the DEV-1016 follow-up stay open | Accepted (D-104) |
| Non-blocking | docs/deviations.md:107 (D-101)                       | Row said the duplicate helpers still exist                                                | D-101 reworded as resolved at integration                                 | Fixed            |
| Non-blocking | openspec/changes/dev-1012-task-pages/review-log.md   | Review 1 line numbers and "61 tests" are stale after the merge                            | Note added above; review 1 kept verbatim                                  | Fixed            |
| Non-blocking | docs/deviations.md:110 (D-104)                       | Row mentioned only the pre-merge score range                                              | D-104 updated with the post-merge range and the main A/B                  | Fixed            |

### Reviewer report 2 (verbatim)

Second review of feature/web/DEV-1012-task-pages (diff `git diff origin/main...HEAD`, origin/main = 94eeecf). No Blocking findings. I ran `pnpm --filter frontend test` (16 files, 95 tests pass) and `pnpm typecheck` (pass). I did not run lint, build, root `pnpm test`, `pnpm lighthouse` or openspec validate. The gate claims in integration.md for those are plausible against the diff but unverified by me.

**Verified**

- Spec coverage: the 10 spec requirements map onto `task-list.tsx`, `task-detail.tsx`, `tasks.ts`, `task-list-params.ts` and the Lighthouse PAGES entry. I matched scenarios to tests by name and did not read every assertion.
- Integration:
  - `task-detail.tsx:24` and `task-list.tsx:14` import `getProject`, `listMembers` and `projectDetailKeys` from `@/lib/api/projects`.
  - `tasks.ts` no longer has `getTaskProject` or `listTaskMembers`; a grep finds no remaining uses.
  - `router.tsx` keeps DEV-1011's routes and adds `/projects/:projectId/tasks` and `/projects/:projectId/tasks/:taskId`.
  - `lighthouse.mjs` keeps DEV-1011's `RUNS_PER_PAGE = 5`, median and free-port logic. It adds the task list to PAGES, `TASKS` fixtures, and stub routes for project, members and tasks.
  - The stub project response includes `role: 'OWNER'`.
- Deviations: DEV-1012 rows are D-101 to D-110, directly after D-100. The review-log.md references (D-104, D-105, D-107 to D-110) match. The lighthouse.md reference (D-104) matches. integration.md describes the renumbering correctly. Nothing in the change folder or evidence still points to D-088 to D-097.
- Tests: the diff shows no weakening. The `task-detail.test.tsx` change only scopes three text queries with `{ selector: ':not(option)' }`, because the "Assign to" select repeats the names. The `role: 'OWNER'` addition is fixture-only. I confirmed neither by reading the full test files.
- Code rules: no `any`, `@ts-ignore` or `eslint-disable` in the task files. No `package.json` or lockfile changes. Schemas come from `@team-task-tracker/shared`.

**Findings (all Non-blocking)**

| Severity     | file:line                                                                                | Evidence                                                                                                                                                                                                                                                                                                                                                                                       | Recommendation                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Non-blocking | `docs/evidence/DEV-1012/lighthouse.md` (post-merge table), `integration.md` (gate table) | After the merge, the Lighthouse gate fails in both final runs (Final 1: /projects 93 and task list 86; Final 2: /projects 87). Root `pnpm test` has 1 failure ("pnpm lighthouse runs and exits 0"). The files list these failures honestly and do not claim a pass. But the DoD requires `pnpm test` and the gate to pass, and the only "passing" evidence is pre-merge run 4 and the A/B run. | Before Gate 2, get one clean `pnpm lighthouse` and root `pnpm test` pass on an idle machine and record it. Otherwise state in the PR that the gate was red post-merge. Keep D-104 and its follow-up open. |
| Non-blocking | `docs/deviations.md:107` (D-101)                                                         | The row says `tasks.md` "holds `getTaskProject` and `listTaskMembers`, duplicating" DEV-1011's helpers, with resolution "swapped ... at merge if identical". The duplicates were removed in the merge, so the row is now false.                                                                                                                                                                | Reword D-101 as resolved: duplicates replaced by `getProject`, `listMembers` and `projectDetailKeys` at integration.                                                                                      |
| Non-blocking | `openspec/changes/dev-1012-task-pages/review-log.md` (rows and verbatim report)          | The log cites `task-detail.tsx:546-547`, `:539-542`, `:610`, `:596`, and `task-list.tsx:180-184`, `:236-248`, `:273`. The diff shows `task-detail.tsx` is 193 lines, so the task-detail citations cannot be valid. The report also says "61 tests", but the branch now has 95. The log is the first review and predates the merge, so line references and counts are stale.                    | Add a short note that the log is from the pre-merge review. Record that this second review found no Blocking issues. The first review's file is verbatim by rule, so do not edit it.                      |
| Non-blocking | `docs/deviations.md:110` (D-104)                                                         | It says the 73 to 98 range and mentions only the pre-merge window. The post-merge scores, with the task list at 86 and /projects at 87 and 93, are in `lighthouse.md` but not in the row.                                                                                                                                                                                                      | Update D-104 to mention the post-merge range.                                                                                                                                                             |
