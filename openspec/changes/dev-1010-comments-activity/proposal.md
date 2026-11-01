# Proposal

Ticket: DEV-1010 (Linear DEV-14, fetched via Linear MCP). Requirements: FRS FR-CMT-1..5, FR-ACT-1..3; SDS sections 2 and 4.

## Why

Tasks can be created, assigned, moved and archived (DEV-1008) but members cannot discuss them and nothing records who changed what. Comments and the activity history are the remaining task-detail features, and DEV-1013 (frontend) needs the API contract.

## What Changes

- Contract first (merged before the rest; DEV-1013 builds on it): shared Zod schemas and types for comments and activity, Prisma `Comment` and `Activity` models with one migration, and the OpenAPI paths.
- Comments under `/api/v1/projects/:projectId/tasks/:taskId/comments`: add, list (paginated), edit (author only), delete (author, or a project OWNER for any comment). Comments are hard-deleted.
- Activity: `TasksService` writes one append-only entry for task creation, assignment, status change and archiving, in the same database transaction as the change (actor, action, timestamp, old/new metadata).
- `GET /api/v1/projects/:projectId/tasks/:taskId/activity` (paginated, members only). There is no route to edit or delete activity.
- Comment edits and deletes are not recorded as activity.
- Action names and the metadata shape are recorded as DECISION lines in `docs/FRS.md` section 5 (approved at Gate 1).
- Reuses `projectAccess` (non-member 404). Supertest integration tests against PostgreSQL, including 400, 401, 403 and 404.

## Capabilities

### New Capabilities
- `comments`: comment contract, add, list, edit, delete and their authorization.
- `activity`: activity contract, recording on task changes, and the history route.

### Modified Capabilities
None. The activity recording changes the behaviour of the existing task routes only by adding a side effect; their requirements are unchanged.

## Impact

- Code: `packages/shared/src`, `backend/prisma` (two models, one enum, one migration), `backend/src` (comments route/controller/service, activity route, `TasksService` mutations now take the actor id and run in a transaction).
- Docs: `docs/FRS.md`, `docs/deviations.md`, `docs/traceability.md` at archive.
- New packages: none.
- Out of scope: file attachments, real-time updates, recording project or comment events, backfilling activity for tasks created before this change, frontend (DEV-1013).
- Breaking: none for clients (new routes only).
- Rollback: revert the branch and drop the `Comment` and `Activity` tables (a new down migration); no existing table is altered.
