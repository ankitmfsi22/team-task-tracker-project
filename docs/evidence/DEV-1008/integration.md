# DEV-1008 integration with main (DEV-1007 merged)

`git fetch && git merge origin/main` (merge, not rebase) on feature/tasks/DEV-1008-tasks. Merge commit 2acf891; origin/main was 137fbb6 (PR #9).

## Conflicts

| File                 | Resolution                                                                                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/app.ts` | Kept both sides. Imports for projects and tasks routers and services; `/projects` router mounted first, then `/projects/:projectId/tasks`. Requests for task paths fall through the projects router to the tasks router (`authenticate` runs twice, harmless; D-069). |
| `docs/deviations.md` | Kept DEV-1007's D-052..D-061; renumbered DEV-1008's rows D-052..D-057 to D-062..D-067; updated references in `docs/evidence/DEV-1008/security-auditor.md`. Added D-068 and D-069.                                                                                     |

## Merged without conflict (checked)

`backend/prisma/schema.prisma` (Project, ProjectMember, Task models and relations), `scripts/tests/prisma.test.mjs` (model list includes Project, ProjectMember, RefreshToken, Task, User), `packages/shared/src/index.ts` and `openapi.ts` (projects and tasks exports and paths), migrations (`20261101000000_projects`, `20261102000000_tasks`, in order). The DEV-1008 `local-dev-environment` delta already lists all five models (the main spec lists four), so the later archive sync is correct.

## Gates after the merge

`pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `openspec validate --all --strict`: all passed (exit 0). Counts: root node:test 229 pass, 0 fail; shared 71; backend 14 files, 155 tests; frontend 1. Reviewer sub-agent re-run on `git diff origin/main...HEAD`: no blocking findings (see `openspec/changes/dev-1008-tasks/review-log.md`).
