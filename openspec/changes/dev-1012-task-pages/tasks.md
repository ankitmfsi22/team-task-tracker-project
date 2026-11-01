# Tasks

Ticket: DEV-1012 (Linear DEV-16). One commit per task: `type(scope): description (DEV-1012)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1. No new packages.

## 1. Task list

- [x] 1.1 `src/lib/api/tasks.ts` (list, get, status, assign, archive, project and members read helpers), pure `parseTaskListParams` / `toApiQuery`, and the `/projects/:projectId/tasks` route. Verify: unit tests for URL parsing (restore, invalid ignored), date mapping and default omission (specs: Filters restored, Due range, Invalid URL value).
- [x] 1.2 Task list page: filter bar, URL sync with page reset, clear filters, archived toggle and badge. Verify: component tests for filter-to-URL-and-request, restore from URL, clear filters, include archived (specs: Task list with URL-synced filters, Archived tasks toggle).
- [x] 1.3 Sorting, pagination controls and list states (loading, empty project, empty with filters, 403, 404, 500 with retry). Verify: component tests for sort toggle, next/previous and disabled edges, each state (specs: sorting and pagination, Task list states).

## 2. Task detail

- [ ] 2.1 Task detail page read view with assignee name and states, route `/projects/:projectId/tasks/:taskId`. Verify: component tests for fields, unassigned, 404, 403 (spec: Task detail page).
- [ ] 2.2 Actions: allowed status transitions, assign/unassign, archive with confirmation, `canModify` hiding, inline 403/409 errors. Verify: component tests for transitions offered, status success and 409, assign, unassign, archive confirm and cancel, 403, archived task, archived project, MEMBER view (specs: Task actions, Unauthorized and impossible actions are hidden).

## 3. Verification

- [ ] 3.1 Add the task list to `scripts/lighthouse.mjs` (PAGES and stub fixtures); run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lighthouse` (scores in `docs/evidence/DEV-1012/`) and `openspec validate dev-1012-task-pages --strict`; append deviations to `docs/deviations.md`. Verify: Lighthouse run output (spec: Task list in the Lighthouse gate).
