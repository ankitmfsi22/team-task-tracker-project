# Proposal

Ticket: DEV-1008 (Linear DEV-12, fetched via Linear MCP). Requirements: FRS FR-TSK-1..6; SDS sections 3, 4, 6.

## Why

Tasks are the core resource of the tracker. DEV-1009 (filtering), DEV-1010 (comments, activity) and DEV-1012 (frontend task pages) need the task contracts and table first. This ticket runs in parallel with DEV-1007 and builds on its contract commit (`e8cbc69`: shared project schemas, `Project`/`ProjectMember` models, `projectAccess` middleware). It uses none of DEV-1007 group 2.

## What Changes

- Shared contracts in `packages/shared`: `TaskStatus` and `TaskPriority` enums, schemas and types for create, update, status change, assign, params and response, and OpenAPI paths for the task routes.
- Prisma `TaskStatus`, `TaskPriority` enums and `Task` model with a migration.
- Endpoints under `/api/v1/projects/:projectId/tasks`: create, get, update, change status, assign or unassign, archive. All sit behind `authenticate`, `validate` and `projectAccess` (`write: true` on mutations, so an archived project gives 409).
- Rules: assignee must be a current project member (400); status transitions follow the FRS table (409 otherwise); a past `dueDate` is rejected (400) when set or changed, an unchanged one is accepted; any member can archive; an archived task cannot be edited (409).
- Supertest integration tests against PostgreSQL, including 400, 401, 404 and 409 cases and a non-member denial on every route.

## Capabilities

### New Capabilities
- `tasks`: task create, get, update, assignment, status transitions, due date rule and archive within a project (no list).

### Modified Capabilities
- `local-dev-environment`: the schema-model scenario now also includes `Task`.

## Impact

- Code: `packages/shared/src`, `backend/src`, `backend/prisma`, `scripts/tests/prisma.test.mjs`.
- Docs: `docs/deviations.md`, `docs/traceability.md` at archive.
- New packages: none.
- Out of scope: list, filter, sort, pagination (DEV-1009); comments and activity recording (DEV-1010); frontend.
- Parallel work with DEV-1007: shared edit points are listed in design.md (Risks).
- Breaking: none. Rollback: revert the branch; the migration only adds two enums and one table.
