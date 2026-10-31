# Proposal

Ticket: DEV-1007 (Linear DEV-11, fetched via Linear MCP). Requirements: FRS FR-PRJ-1..8, FR-AUTH-10; SDS sections 3, 4, 6.

## Why

Projects are the authorization boundary for tasks, comments and activity. DEV-1008 (tasks) and DEV-1011 (frontend project pages) run in parallel with this ticket, so they need the project contracts, the `Project` and `ProjectMember` tables and the project-access middleware first. This change delivers those contracts as a first group and the project routes after them.

## What Changes

- Shared contracts in `packages/shared`: Zod schemas and types for projects and members, pagination, and OpenAPI paths for the project routes.
- Prisma `ProjectRole` enum and `Project` and `ProjectMember` models with a migration.
- `projectAccess` middleware: loads the caller's membership (404 for a missing project or a non-member), checks the role (403), and optionally rejects writes to an archived project (409). DEV-1008 reuses it.
- Endpoints under `/api/v1/projects`: create, list, get, update, archive, and list, add and remove members. The creator becomes OWNER; only OWNER updates, archives and manages members; the last owner cannot be removed; archived projects are read-only and hidden from the default list.
- Supertest integration tests against PostgreSQL, including 400, 403, 404 and 409 cases.

## Capabilities

### New Capabilities
- `projects`: project CRUD, archive, membership, role-based access and the project-access rule that other project-scoped resources follow.

### Modified Capabilities
- `local-dev-environment`: the "schema defines only `User` and `RefreshToken`" scenario no longer holds once `Project` and `ProjectMember` exist.

## Impact

- Code: `packages/shared/src`, `backend/src`, `backend/prisma`, `scripts/tests/prisma.test.mjs` (model list assertion).
- Docs: `docs/deviations.md`, `docs/traceability.md` at archive.
- New packages: none.
- Parallel work: `packages/shared/src/index.ts` and `openapi.ts` are shared edit points with DEV-1008; expect a merge conflict there (DEV-1014 evidence).
- Breaking: none. Rollback: revert the branch; the migration only adds two tables and one enum, and `prisma migrate reset` restores a local database.
