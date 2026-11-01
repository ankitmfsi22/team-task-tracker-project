# Review log

- Change: dev-1012-task-pages (DEV-1012)
- Reviewer: reviewer sub-agent (read-only, fresh context)
- Context: fresh
- Date: 2026-11-02

Result: no Blocking findings. Non-blocking findings are accepted deviations (CLAUDE.md), recorded in `docs/deviations.md` as D-094 to D-097.

## Disposition

| Severity     | file:line                                          | Issue                                                                                   | Fix                                          | Status           |
| ------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------- |
| Non-blocking | frontend/src/pages/task-detail.tsx:546-547         | Project query failure hides the actions with no notice                                  | None in this change                          | Accepted (D-094) |
| Non-blocking | frontend/src/pages/task-list.tsx:236-248           | `?page` beyond the last page shows "No tasks yet" with no way back                      | None in this change                          | Accepted (D-095) |
| Non-blocking | frontend/src/pages/task-list.tsx:180-184           | Members query error ignored; assignees show "Former member"                             | None in this change                          | Accepted (D-095) |
| Non-blocking | frontend/src/pages/task-list.tsx:273               | Previous stays enabled while placeholder data shows; rapid clicks can skip pages        | None in this change                          | Accepted (D-096) |
| Non-blocking | frontend/src/pages/task-detail.tsx:539-542         | Assignee reads "Former member" and actions appear late until members and project arrive | None in this change                          | Accepted (D-096) |
| Non-blocking | scripts/lighthouse.mjs, docs/deviations.md D-091  | Task list performance varies 73 to 98 under load                                        | Gate run alone; evidence file lists all runs | Accepted (D-091) |
| Non-blocking | frontend/src/pages/task-detail.tsx:610, :596       | The 403 test does not assert that the select value reverts                              | None                                         | Accepted (D-097) |
| Non-blocking | openspec/changes/dev-1012-task-pages/tasks.md:16   | Task 2.2 cites "Unauthorized and impossible actions are hidden"; spec title differs     | None (Gate 1 artifact, documentation only)   | Accepted (D-097) |
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
- The `task-detail.test.tsx` edit in commit 427d4f9 is legitimate. It only adds `{ selector: ':not(option)' }` to three queries, because the new "Assign to" select repeats the member names and "Unassigned" as options. The assertions keep their meaning, and the change is recorded as D-092.
- The Lighthouse change is correct: a PAGES entry plus stub routes for the project, members and tasks. The hard-coded project id equals `PROJECTS[0].id`, which is the `TASK_PROJECT` the stub serves.

**Non-blocking findings**

| Severity     | file:line                                                  | Evidence                                                                                                                                                                                                                                      | Recommendation                                                                                                                         |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Non-blocking | frontend/src/pages/task-detail.tsx:546-547                 | If the project query fails (403 or 404), `project` is undefined, `canModify` returns false and the actions disappear with no notice and no error. `projectQuery.isError` is never read.                                                       | Show an error or notice when the project query fails. Alternatively, record the behaviour as an accepted deviation.                    |
| Non-blocking | frontend/src/pages/task-list.tsx:236-248                   | If `?page=99` is beyond the last page, the API returns an empty `data` array. With no filter active, the page says "No tasks yet" with no way back, which is misleading.                                                                      | When `meta.total > 0` and `data` is empty, show an empty state with a link or button to page 1. A clamp is also possible.              |
| Non-blocking | frontend/src/pages/task-list.tsx:180-184                   | The members query error is ignored. The assignee filter then has no options, and rows show "Former member" for every assigned task.                                                                                                           | Treat a members error as a non-fatal inline notice. Alternatively, fall back to the raw id or "Unknown".                               |
| Non-blocking | frontend/src/pages/task-list.tsx:273                       | Next is disabled while placeholder data shows, but Previous is not. Rapid clicks on Previous during a pending page change can skip pages (goToPage uses `result.meta.page`, the stale value).                                                 | Also disable Previous when `isPlaceholderData`, or compute the page from the URL params.                                               |
| Non-blocking | frontend/src/pages/task-detail.tsx:539-542                 | The task is shown as soon as it loads, but members and project load separately. The assignee reads "Former member" until members arrive, and the actions appear late.                                                                         | Wait for the members query before rendering the assignee, or show "…" while it loads.                                                  |
| Non-blocking | scripts/lighthouse.mjs and docs/deviations.md D-091        | Task list performance varies from 73 to 98 across runs. A 95 gate that is flaky under load may fail CI.                                                                                                                                       | Keep the documented mitigation (run the gate alone). Confirm the final evidence file shows a passing run on an idle machine.          |
| Non-blocking | frontend/src/pages/task-detail.tsx:610 and :596            | The assign select is controlled by `task.assigneeId`. On a failed mutation it reverts, which is correct, but a 403 test only checks that the message shows.                                                                                   | Optional: assert that the select value is unchanged.                                                                                   |
| Non-blocking | openspec/changes/dev-1012-task-pages/tasks.md:16           | Task 2.2 cites the spec requirement "Unauthorized and impossible actions are hidden", but the spec title is "Impossible actions are hidden".                                                                                                  | Fix the reference; documentation only.                                                                                                 |
| Non-blocking | openspec/changes/dev-1012-task-pages/review-log.md         | The file is still the empty template.                                                                                                                                                                                                         | The main session must save this review there verbatim, as CLAUDE.md requires.                                                          |
