# Proposal

Ticket: DEV-1012 (Linear DEV-16, fetched via Linear MCP). Requirements: FRS FR-FE-4, 5, 8, 9, 10. Depends on the DEV-1008 task API and DEV-1009 list API (merged) and on the DEV-1011 Group 1 frontend contract (commit ab522dd). Runs in parallel with DEV-1011 Group 2.

## Why

The task API is complete but the frontend has no task screens. Users cannot browse a project's tasks, filter or sort them, or open one to see its status, priority, assignee and due date.

## What Changes

- Task list page at `/projects/:projectId/tasks`: filters (status, priority, assignee, due range, include archived), sorting, pagination (page size 20), all kept in the URL query so views are shareable and survive reload.
- Task detail page at `/projects/:projectId/tasks/:taskId`: read view of title, description, status, priority, assignee, due date, archived state.
- Detail actions: change status (only allowed transitions), assign to a member or unassign, archive with confirmation. Hidden when the task or its project is archived; a 403/404/409 from the API is shown, never swallowed.
- Loading, empty and error states, including 401 (session ends), 403 and 404.
- Lighthouse: append the task list page to the `PAGES` array and the stub API fixtures in `scripts/lighthouse.mjs`.
- New packages: none.

## Capabilities

### New Capabilities
- `web-tasks`: task list (filters, sort, pagination, URL state), task detail and its actions, states and permission-based UI.

### Modified Capabilities
- None.

## Impact

- Code: new `frontend/src/pages/task-list.tsx`, `task-detail.tsx`, `frontend/src/lib/api/tasks.ts`, task components; two route entries in `frontend/src/routes/router.tsx`; one entry in `scripts/lighthouse.mjs`; `docs/deviations.md`, `docs/traceability.md` at archive.
- No backend, shared schema or Prisma change; shared schemas are imported, never redefined.
- Out of scope: task create/edit form, comments, activity (DEV-1013); project pages and members management (DEV-1011 Group 2); Playwright (DEV-1016).
- Expected conflicts with DEV-1011 Group 2: `router.tsx` route array, `scripts/lighthouse.mjs` PAGES and stub fixtures, and project API helpers (see design.md).
- Breaking: none. Rollback: revert the branch.
