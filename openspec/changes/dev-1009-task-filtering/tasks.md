# Tasks

Ticket: DEV-1009 (Linear DEV-13). One commit per task: `type(scope): description (DEV-1009)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1. No new packages, no Prisma change.

## 1. Contract (merged first; DEV-1012 builds on it)

- [x] 1.1 Shared `TaskListQuerySchema` (strict, `dueFrom <= dueTo`), `TaskListResponseSchema` and types in `packages/shared/src/tasks.ts`; the `GET` path in `openapi-tasks.ts`; rebuild `dist`. Verify: shared unit tests for valid and invalid queries and the OpenAPI path (spec: Shared list contract and OpenAPI path).

## 2. List route (backend)

- [x] 2.1 `GET /projects/:projectId/tasks` with route, controller (re-parses the query) and service: project scoping, default order, archived excluded unless `includeArchived`, `meta`. Verify: integration tests for 200 list and `meta`, `includeArchived=true`, other-project tasks not returned, 404 non-member and nonexistent project, 401 (spec: List tasks).
- [x] 2.2 Filters and pagination. Verify: integration tests for status, priority, assignee and combined filters, inclusive due range excluding tasks without `dueDate`, page 2 of 25, page beyond the end, 400 for each invalid filter and pagination value and unknown parameter (specs: Filter tasks, Paginate tasks).
- [x] 2.3 Sorting. Verify: integration tests for priority desc, status asc, assignee name, dueDate with null last in both directions, stable pages across ties, 400 invalid `sortBy`/`sortOrder` (spec: Sort tasks); apply the Risks fallback if needed.

## 3. Verification

- [ ] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1009-task-filtering --strict`; append deviations to `docs/deviations.md`.
