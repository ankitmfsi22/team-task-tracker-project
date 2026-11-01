# Tasks

Ticket: DEV-1010 (Linear DEV-14). One commit per task: `type(scope): description (DEV-1010)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1. No new packages.

## 1. CONTRACT (merged first; DEV-1013 builds on it)

- [x] 1.1 Shared Zod schemas and types for comments and activity (`packages/shared/src/comments.ts`, `activity.ts`, exported from `index.ts`); rebuild `dist`. Verify: shared unit tests for valid and invalid comment bodies and activity metadata (specs: Shared comment contract and OpenAPI paths, Shared activity contract and OpenAPI path).
- [x] 1.2 Prisma `Comment`, `Activity` and `ActivityAction` plus migration `20261103000000_comments_activity`; run the db-change-checker sub-agent and fix blocking findings. Verify: migration applies on the test database and `prisma generate` and typecheck pass.
- [ ] 1.3 OpenAPI paths for the four comment routes and the activity route (`openapi-comments.ts`, merged in `openapi.ts`). Verify: `openapi.test.ts` asserts the methods, query parameters and 400, 401, 403, 404 and 409 responses (specs: OpenAPI describes the comment routes, OpenAPI describes the activity route).

## 2. Comments (backend)

- [ ] 2.1 Comment routes, controller and `CommentsService`: add, list, edit (author only) and delete (author or OWNER), with `projectAccess`, task lookup, archived checks and `COMMENT_NOT_FOUND`. Verify: integration tests for 201, 200 list and `meta`, edit and delete by author, owner deleting any comment, 403 for another member (edit and delete), 400 empty and over-long body, 404 non-member, unknown task and unknown comment, 409 archived task and project, 401, and no activity added (specs: Add, List, Edit and Delete comment).

## 3. Activity (backend)

- [ ] 3.1 `TasksService.create`, `assign`, `changeStatus` and `archive` take the actor id and write the task change and the activity entry in one transaction; controller passes `res.locals.userId`. Verify: integration tests for the four actions and their metadata, one entry for create with assignee, unassign, unchanged assignment recording nothing, rejected changes recording nothing, a forced activity failure rolling the change back; existing DEV-1008 tests updated for the new argument only (spec: Record activity on task changes).
- [ ] 3.2 `GET .../tasks/:taskId/activity` with route, controller and `ActivityService` (newest first, paginated). Verify: integration tests for 200 order and `meta`, 404 non-member and task of another project, 400 invalid pagination, 401, and 404 for `POST`, `PATCH` and `DELETE` (spec: View activity history).

## 4. Verification

- [ ] 4.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1010-comments-activity --strict`; append deviations to `docs/deviations.md`.
