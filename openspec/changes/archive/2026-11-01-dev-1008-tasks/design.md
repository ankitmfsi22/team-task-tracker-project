# Design

## Context

See proposal.md. Builds on the DEV-1007 contract commit: `projectAccess(prisma, { roles?, write? })` (404, 403, 409 order; sets `res.locals.project` and `res.locals.membership`), `ProjectIdParamsSchema`, the `Project`/`ProjectMember` models. Zod 4.6.7 and Prisma 7.10.1 are already pinned. Zod 4 `z.iso.datetime()` (strict UTC `Z` timestamps), `.refine` and `.strict()` were checked with Context7 (v4.6.5) on 2026-11-01; Prisma enum, relation and `onDelete` modelling is the same as in DEV-1007 (checked there). No new library API.

## Goals / Non-Goals

**Goals:** FR-TSK-1..6 as a contract group (merged first) plus services, routes and tests.

**Non-Goals:** list, filter, sort, pagination (DEV-1009); comments and activity (DEV-1010); frontend; un-archiving; hard delete; reassigning when a member leaves the project.

## Decisions

1. **Two groups.** Group 1 is contract only: shared task schemas and types, `Task` model and migration, OpenAPI paths. Group 2 adds services, controller, routes and behavioural tests. Group 1 adds no backend runtime code.
2. **Data model.** `enum TaskStatus { TODO IN_PROGRESS IN_REVIEW DONE }`, `enum TaskPriority { LOW MEDIUM HIGH URGENT }`. `Task(id uuid, projectId, title, description?, status default TODO, priority default MEDIUM, dueDate DateTime?, assigneeId?, createdById, archivedAt?, createdAt, updatedAt)`. FKs: `project` cascade, `assignee` `onDelete: SetNull`, `createdBy` `onDelete: Restrict`. Indexes on `projectId` and `assigneeId`. `User` gets `assignedTasks` and `createdTasks` relations, `Project` gets `tasks`. `db-change-checker` reviews the migration.
3. **Routes** (all behind `authenticate`, `validate`, `projectAccess`; ids are UUID params):

   | Method and path | Access | Result |
   | --- | --- | --- |
   | `POST /projects/:projectId/tasks` | member, write | 201 task |
   | `GET /projects/:projectId/tasks/:taskId` | member | 200 task (also if archived) |
   | `PATCH /projects/:projectId/tasks/:taskId` | member, write | 200; body title, description, priority, dueDate |
   | `POST /projects/:projectId/tasks/:taskId/status` | member, write | 200; body `{ status }` |
   | `PUT /projects/:projectId/tasks/:taskId/assignee` | member, write | 200; body `{ assigneeId: uuid or null }` |
   | `POST /projects/:projectId/tasks/:taskId/archive` | member, write | 200 archived task |

   Both roles are allowed on every route (SDS section 6), so no `roles` option is used. Separate status and assign routes keep each rule single-purpose and give DEV-1010 one hook per recorded action (assignment, status change, archive).
4. **Task lookup.** The service loads the task by `{ id: taskId, projectId }`; a missing task, or one in another project, gives 404 `TASK_NOT_FOUND`, so a task id never leaks across projects.
5. **Create.** Body (strict, so a `status` field is a 400): `title` (1..200), `description?` (max 5000), `priority?` (default MEDIUM), `dueDate?` (UTC ISO 8601 timestamp), `assigneeId?`. `createdById` is the caller. A new task always starts as TODO (FRS decision approved by Ankit Singh); the status route is the only way to change it.
6. **Status transitions.** One table in `packages/shared` (`TASK_STATUS_TRANSITIONS`) used by the service. The same status, or any pair not in the table, gives 409 `INVALID_TRANSITION`.
7. **Due date.** A UTC ISO 8601 timestamp (`z.iso.datetime()`, trailing `Z`; offsets are rejected). Past means earlier than now. The schema checks the format only (so the format check needs no clock); the service compares with the clock because "unchanged" needs the stored value. Create: past gives 400 `VALIDATION_ERROR`. Update: a value equal to the stored `dueDate` is accepted, any other past value gives 400; `null` clears it.
8. **Assignee.** The service looks up a `ProjectMember` row for `(projectId, assigneeId)`; absent gives 400 `ASSIGNEE_NOT_MEMBER`. Applies on create and on the assign route; `null` unassigns.
9. **Archive and edit lock.** Archive sets `archivedAt`. PATCH, status, assign and archive on an archived task give 409 `TASK_ARCHIVED`. Reads still work. PATCH uses `.strict()` so a `status` or `assigneeId` field in it is a 400, not silently ignored.
10. **Check order for mutations.** 401, 400 (params, body), project 404, project archived 409, task 404, task archived 409, then rule errors (400 assignee or due date, 409 transition).
11. **Layers.** `routes/tasks.routes.ts` → `controllers/tasks.controller.ts` → `services/tasks.service.ts` → Prisma; business rules live in the service.
12. **OpenAPI.** `buildOpenApiDocument` gains the six task paths from the shared schemas, built in a separate helper to keep the diff away from DEV-1007's.
13. **Response.** id, projectId, title, description, status, priority, dueDate, assigneeId, createdById, archivedAt, createdAt, updatedAt (dates as ISO strings).

## Risks

- **Parallel edit points with DEV-1007 group 2:** `packages/shared/src/index.ts` (one export line), `openapi.ts`, `backend/prisma/schema.prisma` (new block appended, plus relation lines on `User` and `Project`), `scripts/tests/prisma.test.mjs` (model list assertion), `backend/src/app.ts` (router mount), the `local-dev-environment` spec delta (both changes modify the same requirement; the later archive must list all five models) and the `docs/deviations.md` D-number range.
- A member removed from a project (DEV-1007) can remain the assignee of existing tasks; accepted, recorded as a deviation.
