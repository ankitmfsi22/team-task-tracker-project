# Design

## Context

See proposal.md. Builds on DEV-1007/1008/1009: `projectAccess(prisma, { write })` (404 non-member, 409 archived project, sets `res.locals.membership.role`), `validate`, `PaginationQuerySchema`/`PaginationMetaSchema`, `AppError`, and `TasksService`. Interactive `prisma.$transaction(async (tx) => ...)` is already used in `TasksService.listSortedByAssignee` (Prisma 7.10.1). Context7 returned only Prisma 8 material for `Json` fields, so the Prisma 7 `Json` column and `Prisma.InputJsonValue` input follow the official Prisma 7 docs (noted as a limitation).

## Goals / Non-Goals

**Goals:** FR-CMT-1..5 and FR-ACT-1..3; activity written atomically with the change.

**Non-Goals:** attachments, real-time updates, activity for comments or project events, backfill, frontend.

## Decisions

1. **Contract first (Group 1).** `packages/shared/src/comments.ts` and `activity.ts`: `CommentParamsSchema` (`projectId`, `taskId`, `commentId`), `CreateCommentRequestSchema` / `UpdateCommentRequestSchema` (strict `{ body }`, `z.string().trim().min(1).max(2000)`), `CommentResponseSchema`, `CommentListResponseSchema`, `ActivityActionSchema`, `ActivityMetadataSchema`, `ActivityResponseSchema`, `ActivityListResponseSchema`; list queries are `PaginationQuerySchema` made strict. OpenAPI paths go in `openapi-comments.ts` and are merged in `openapi.ts` like the task paths.
2. **Routes.** All mounted at `/projects/:projectId/tasks/:taskId`, each with `authenticate`, `validate`, `projectAccess`:
   - `POST /comments` 201, `PATCH /comments/:commentId` 200, `DELETE /comments/:commentId` 204: `projectAccess(prisma, { write: true })`.
   - `GET /comments` and `GET /activity` 200: `projectAccess(prisma)` (readable in an archived project).
3. **Comment rules (service).** Order: project-level checks first, in `projectAccess` (404 `PROJECT_NOT_FOUND` for a non-member, 409 `PROJECT_ARCHIVED` on writes, same as the task routes, D-065); then comment-level checks in the service (404 `TASK_NOT_FOUND` for a task not in the project, 404 `COMMENT_NOT_FOUND` for a comment not on that task, 403 `FORBIDDEN`, then 409 `TASK_ARCHIVED`). Edit: author only. Delete: author, or `role === OWNER`. Add, edit and delete on an archived task are 409 `TASK_ARCHIVED`; in an archived project 409 `PROJECT_ARCHIVED` (FR-PRJ-4). Reading is always allowed. List order: `createdAt` asc, `id` asc. Comment responses carry `author: { id, name }`.
4. **Activity action names (FRS DECISION).** Enum `ActivityAction`: `TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_ARCHIVED`.
5. **Metadata shape (FRS DECISION).** A JSON object per action, validated as a discriminated union in shared:
   - `TASK_CREATED`: `{ title, priority, assigneeId: uuid | null }` (a task created with an assignee gets this one entry only, no extra `TASK_ASSIGNED`).
   - `TASK_ASSIGNED`: `{ from: uuid | null, to: uuid | null }` (unassign is `to: null`). Assigning the current assignee again records nothing.
   - `TASK_STATUS_CHANGED`: `{ from: TaskStatus, to: TaskStatus }`.
   - `TASK_ARCHIVED`: `{}`.
   The response is `{ id, taskId, action, metadata, actor: { id, name }, createdAt }`; list order `createdAt` desc, `id` asc.
6. **Atomic recording.** `create`, `assign`, `changeStatus` and `archive` in `TasksService` take the actor id (the controller passes `res.locals.userId`) and run the task write and `activity.create` in one `$transaction`; if either fails neither is committed. `update` (title, description, priority, due date) records nothing, per FR-ACT-1. A new `ActivityService` only reads; there is no update or delete method and no such route, so entries are append-only.
7. **Schema.** `Comment(id, taskId, authorId, body, createdAt, updatedAt)` and `Activity(id, taskId, actorId, action, metadata Json, createdAt)`; `taskId` FK `ON DELETE CASCADE`, `authorId`/`actorId` FK `ON DELETE RESTRICT` (users are never deleted); `@@index([taskId, createdAt])` on both. One migration `20261103000000_comments_activity`, reviewed by db-change-checker.
8. **Error codes.** Reuse `VALIDATION_ERROR`, `FORBIDDEN`, `PROJECT_NOT_FOUND`, `TASK_NOT_FOUND`, `TASK_ARCHIVED`, `PROJECT_ARCHIVED`; new `COMMENT_NOT_FOUND` (404).

## Risks / Trade-offs

- **Existing tasks have no history.** No backfill; a task created before the migration has no `TASK_CREATED` entry. Recorded as a deviation.
- **Check-then-write races** (D-064) stay: two concurrent status changes can both pass the check, producing two entries. Accepted; a conditional update is hardening beyond this scope.
- **Service signatures change.** `assign`, `changeStatus`, `archive` and `create` gain a user id; existing DEV-1008 tests are updated for the new argument only, not weakened.
- **Offset pagination** under concurrent writes can skip or repeat a row (as in DEV-1009).
