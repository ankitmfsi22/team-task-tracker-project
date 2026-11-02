# DEV-1012 integration with main (after DEV-1011 merged)

Date: 2026-11-02. Command: `git fetch && git merge origin/main` (merge, not rebase) on `feature/web/DEV-1012-task-pages`. origin/main was 94eeecf (PR #13, DEV-1011).

## Conflicting and overlapping files

| File                                              | Result                       | Resolution                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/deviations.md`                              | text conflict                | Took main's file (D-001 to D-100) and appended the DEV-1012 rows renumbered D-088 to D-097 -> D-101 to D-110. References in `review-log.md` and `lighthouse.md` renumbered the same way.                                                                                  |
| `scripts/lighthouse.mjs`                          | auto-merged, checked by hand | Kept DEV-1011's free preview port, 5 audits per page with the median gated, and diagnostics. Kept the task list page in `PAGES` and the stub fixtures. Added `role: 'OWNER'` to the stub project response (DEV-1011's `getProject` parses `ProjectDetailResponseSchema`). |
| `frontend/src/routes/router.tsx`                  | auto-merged, checked by hand | Both sides kept: DEV-1011 routes plus the two task routes.                                                                                                                                                                                                                |
| `frontend/src/lib/api/tasks.ts`                   | no conflict, changed         | Removed the duplicate `getTaskProject` and `listTaskMembers`. The task pages now use `getProject`, `listMembers` and `projectDetailKeys` from `projects.ts`.                                                                                                              |
| `frontend/src/pages/task-detail-actions.test.tsx` | fixture only                 | The project mock now includes `role: 'OWNER'`, which `ProjectDetailResponseSchema` requires. No assertion changed.                                                                                                                                                        |
| `docs/traceability.md`                            | auto-merged                  | Main's rows kept; DEV-1012 adds its row at archive.                                                                                                                                                                                                                       |

## Gate results after the merge

| Gate                               | Result                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `pnpm lint`                        | pass                                                                                            |
| `pnpm typecheck`                   | pass                                                                                            |
| `pnpm build`                       | pass                                                                                            |
| `pnpm format:check`                | pass                                                                                            |
| `openspec validate --all --strict` | 16 passed, 0 failed                                                                             |
| `pnpm --filter frontend test`      | 16 files, 95 tests pass                                                                         |
| `pnpm test` (root)                 | 237 pass, 1 fail: "pnpm lighthouse runs and exits 0" (performance 87 to 94 inside the full run) |
| `pnpm lighthouse` alone            | see `lighthouse.md` (after-merge runs)                                                          |

## Lighthouse after the merge

The threshold stays 95; nothing was skipped. A/B on the same machine with a clean `origin/main` checkout (no DEV-1012 code): main login 99/100, projects 98/99. The branch in the same window: login 100, projects 99, task list 99. In other windows the branch and main code both dropped (`/projects`, identical to main, scored 87 and 93), so the scores move with machine state, not with this change.
