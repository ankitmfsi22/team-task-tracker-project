# Proposal

Ticket: DEV-1009 (Linear DEV-13, fetched via Linear MCP). Requirements: FRS FR-FLT-1..5; SDS section 4.

## Why

DEV-1008 delivered single-task routes but no way to list tasks. The task list is the main screen (DEV-1012) and needs filtering, sorting and pagination from the API.

## What Changes

- Shared contract in `packages/shared`: `TaskListQuerySchema` (builds on `PaginationQuerySchema`), `TaskListResponseSchema` (`{ data, meta }`) and the OpenAPI `GET` path.
- `GET /api/v1/projects/:projectId/tasks` behind `authenticate`, `validate` and `projectAccess` (read access, so an archived project can still be listed).
- Filters `status`, `priority`, `assigneeId`, `dueFrom`/`dueTo` (inclusive UTC range), `includeArchived`; sort by `status`, `priority`, `assignee`, `dueDate` with `sortOrder`; `page`/`pageSize` (default 20, max 100) and `meta`.
- Invalid or unknown query values respond 400. Query names and the range format are recorded as DECISION lines in `docs/FRS.md` section 4 (approved at Gate 1).
- Supertest integration tests against PostgreSQL, including 400, 401 and non-member 404.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `tasks`: adds the list, filter, sort and pagination requirements (ADDED delta).

## Impact

- Code: `packages/shared/src`, `backend/src` (route, controller, service). No Prisma schema change and no new migration.
- Docs: `docs/FRS.md`, `docs/deviations.md`, `docs/traceability.md` at archive.
- New packages: none.
- Out of scope: full-text search; multi-value filters; frontend (DEV-1012); activity (DEV-1010).
- Breaking: none (new `GET` on an existing path). Rollback: revert the branch; nothing is persisted.
