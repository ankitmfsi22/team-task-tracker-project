# Design

## Context

See proposal.md. The backend has `createApp`, `authenticate` (sets `res.locals.userId`), `validate`, `AppError` and the error handlers from DEV-1006. `packages/shared` holds the auth schemas and `buildOpenApiDocument`. Prisma 7.10.1 with the `@prisma/adapter-pg` driver adapter. Prisma modelling (explicit join model with a composite key, enums, `onDelete: Cascade`) was checked with Context7 on 2026-10-31. No new library API is used.

## Goals / Non-Goals

**Goals:** the contracts, tables and middleware DEV-1008 and DEV-1011 need, merged first; project routes that meet FR-PRJ-1..8.

**Non-Goals:** tasks, comments, activity (the archived rule is enforced for them by the middleware, but their routes belong to later tickets); changing a member's role; a member leaving on their own; frontend; list search.

## Decisions

1. **Two groups.** Group 1 (tasks 1.x) is contract only: shared schemas, Prisma models and migration, the middleware and OpenAPI paths. It is committed and approved first, so DEV-1008 and DEV-1011 can branch from it. Group 2 (tasks 2.x) adds routes, services and the behavioural tests.
2. **Data model.** `enum ProjectRole { OWNER MEMBER }`. `Project(id uuid, name, description?, archivedAt?, createdAt)`. `ProjectMember(projectId, userId, role, createdAt)` with `@@id([projectId, userId])` (the unique pair), both foreign keys `onDelete: Cascade`, and an index on `userId` for the list query. `User` gets a `memberships` relation. `db-change-checker` reviews the migration.
3. **Routes** (all behind `authenticate`; ids are UUID params validated by `validate`):

   | Method and path | Who | Result |
   | --- | --- | --- |
   | `POST /projects` | any user | 201 project, caller becomes OWNER |
   | `GET /projects?page&pageSize&includeArchived` | any user | 200 `{data, meta}` of the caller's projects, newest first |
   | `GET /projects/:projectId` | member | 200 project with the caller's `role` |
   | `PATCH /projects/:projectId` | OWNER | 200 updated project |
   | `POST /projects/:projectId/archive` | OWNER | 200 archived project |
   | `GET /projects/:projectId/members` | member | 200 members with user id, email, name, role |
   | `POST /projects/:projectId/members` | OWNER | 201 member; body `{ email, role? }`, role defaults to MEMBER |
   | `DELETE /projects/:projectId/members/:userId` | OWNER | 204 |

   Archive is a POST action (soft delete via `archivedAt`, there is no hard delete and no unarchive in scope).
4. **`projectAccess(prisma, { roles?, write? })` middleware.** Runs after `authenticate` and `validate`. It reads the project and the caller's membership in one query, then: no project or no membership gives 404 `PROJECT_NOT_FOUND` (the same response for both, so existence is not revealed); a role outside `roles` gives 403 `FORBIDDEN`; `write: true` on an archived project gives 409 `PROJECT_ARCHIVED`. The order is fixed: 404, then 403, then 409. On success it sets `res.locals.project` and `res.locals.membership`. DEV-1008 and DEV-1010 mount it on their routes with `write: true` for mutations, which satisfies "archived projects reject new tasks and comments" without touching this ticket's code again.
5. **Archived is read-only.** Update, archive and member add or remove use `write: true`, so a second archive is 409 `PROJECT_ARCHIVED`. Reads (get, list members) still work.
6. **Last owner.** Removing a member is done in one transaction that counts the project's owners; removing the only OWNER gives 409 `LAST_OWNER`. This also covers an owner removing themselves.
7. **Adding members.** The user is found by email (lowercased by the shared schema). Unknown email gives 404 `USER_NOT_FOUND` (registration already reveals email existence, D-047); an existing member gives 409 `ALREADY_MEMBER`. Adding with role OWNER is allowed, so a project can have several owners.
8. **List.** Pagination follows the SDS convention; `pageSize` default 20, max 100. `PaginationQuerySchema` and `PaginationMetaSchema` go into `packages/shared/src/common.ts` so DEV-1009 reuses them. `includeArchived` is a boolean query flag, default false.
9. **Layers.** `routes/projects.routes.ts` → `controllers/projects.controller.ts` → `services/projects.service.ts` → Prisma. The middleware does only the access check; business rules (last owner, duplicate member) live in the service.
10. **OpenAPI.** `buildOpenApiDocument` gains the eight project paths, generated from the shared schemas as for auth.
11. **Tests.** Task 1.3 tests the middleware through a throwaway route registered with `extraRoutes`. Group 2 tests use Supertest against PostgreSQL as in DEV-1006, with two users for the non-member and MEMBER cases.

## Risks

- DEV-1008 may need an extra field on `res.locals.membership`; keep the shape small and additive.
- `index.ts` and `openapi.ts` in `packages/shared` are edited by both parallel tickets; keep each ticket's additions in its own file and one export line.
