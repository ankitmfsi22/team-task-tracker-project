# Parallel work evidence (DEV-1014)

Consolidates evidence that already exists; nothing is re-run. Guide: `docs/WORKTREES.md`. Commit hashes and times are from `git log` (local time, +0530). Sections marked "provided by Ankit Singh" were supplied by the human and are recorded verbatim.

## 1. Separate worktrees and branches

| Ticket   | Worktree      | Branch                                    | Evidence                             |
| -------- | ------------- | ----------------------------------------- | ------------------------------------ |
| DEV-1007 | `../ttt-1007` | `feature/projects/DEV-1007-projects`      | `docs/evidence/DEV-1007/worktree.md` |
| DEV-1008 | `../ttt-1008` | `feature/tasks/DEV-1008-tasks`            | `docs/evidence/DEV-1008/worktree.md` |
| DEV-1011 | `../ttt-1011` | `feature/web/DEV-1011-auth-project-pages` | `docs/evidence/DEV-1011/worktree.md` |
| DEV-1012 | `../ttt-1012` | `feature/web/DEV-1012-task-pages`         | `docs/evidence/DEV-1012/worktree.md` |

Each `worktree.md` holds the recorded `git worktree list` and `git branch --show-current`.

## 2. Shared contract before parallel work

For both pairs: the contract is the first ticket's Gate-1-approved contract group; the second branch was cut from that commit (the merge base of the two branches); the second ticket has its own Gate 1 before its first implementation commit. The backend API was already on `main` for the frontend pair.

| Pair        | Ticket 1 Gate 1               | Contract commit (second branch cut here) | Ticket 2 Gate 1               | Ticket 2 first implementation commit |
| ----------- | ----------------------------- | ---------------------------------------- | ----------------------------- | ------------------------------------ |
| 1007 / 1008 | `1a295fe` 2026-11-01 00:02:50 | `e8cbc69` 2026-11-01 00:15:30            | `6d0ce14` 2026-11-01 00:40:11 | `d8a54e8` 2026-11-01 00:42:50        |
| 1011 / 1012 | `98ad9e7` 2026-11-01 17:24:18 | `ab522dd` 2026-11-01 18:05:45            | `6370e56` 2026-11-01 22:57:56 | `9345807` 2026-11-02 00:13:26        |

## 3. Integration

Command in both cases: `git fetch && git merge origin/main` (merge, not rebase) on the second branch.

### Pair 1: DEV-1007 and DEV-1008, merge `2acf891`

```
*   2acf891 merge: integrate origin/main (DEV-1007) into DEV-1008 (DEV-1008)
|\
| *   137fbb6 Merge pull request #9 from ankitmfsi22/feature/projects/DEV-1007-projects
| |\
| | * 7895bb6 docs(projects): archive dev-1007-projects and add traceability row (DEV-1007)
| | * 95166cf docs(projects): approve DEV-1007 at Gate 2 (DEV-1007)
```

Conflicts: `backend/src/app.ts` (kept both routers, projects first, then tasks) and `docs/deviations.md` (DEV-1008's rows renumbered D-052..D-057 to D-062..D-067). Details: `docs/evidence/DEV-1008/integration.md`.

Gates after the merge (from that file): `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` and `openspec validate --all --strict` all passed (exit 0). Counts: root node:test 229 pass, 0 fail; shared 71; backend 14 files, 155 tests; frontend 1. Reviewer re-run on `git diff origin/main...HEAD`: no blocking findings.

### Pair 2: DEV-1011 and DEV-1012, merge `8b952f0`

```
*   8b952f0 Merge origin/main into feature/web/DEV-1012-task-pages (DEV-1012)
|\
| *   94eeecf Merge pull request #13 from ankitmfsi22/feature/web/DEV-1011-auth-project-pages
| |\
| | * d4ba029 docs(web): sync specs and archive dev-1011-auth-project-pages (DEV-1011)
| | * 53a8ffe docs(web): record Gate 2 approval for DEV-1011 (DEV-1011)
```

Conflicts: `docs/deviations.md` (main's D-001..D-100 kept, DEV-1012's rows renumbered D-088..D-097 to D-101..D-110). No git conflict, but duplicate `getTaskProject` and `listTaskMembers` in `frontend/src/lib/api/tasks.ts` were replaced by DEV-1011's `getProject`, `listMembers` and `projectDetailKeys`. Details: `docs/evidence/DEV-1012/integration.md`.

Gates after the merge (from that file): `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm format:check` pass; `openspec validate --all --strict` 16 passed, 0 failed; `pnpm --filter frontend test` 16 files, 95 tests pass; root `pnpm test` 237 pass, 1 fail ("pnpm lighthouse runs and exits 0", performance 87 to 94 inside the full run). The Lighthouse threshold stayed 95 and nothing was skipped; see `docs/evidence/DEV-1012/lighthouse.md`.

## 4. Cleanup output (provided by Ankit Singh)

Pair 1: branches deleted feature/projects/DEV-1007-projects (was 7895bb6), feature/tasks/DEV-1008-tasks (was c50451a); git worktree list → only team-task-tracker-v2 e2e4ed1 [main].

Pair 2: branches deleted feature/web/DEV-1011-auth-project-pages (was d4ba029), feature/web/DEV-1012-task-pages (was b512c18); git worktree list → only team-task-tracker-v2 db978a0 [main]. Folders needed manual delete (node_modules/.env outside git).
