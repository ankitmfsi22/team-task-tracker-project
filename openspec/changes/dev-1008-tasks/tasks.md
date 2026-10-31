# Tasks

Ticket: DEV-1008 (Linear DEV-12). One commit per task: `type(scope): description (DEV-1008)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1. No new packages. Do not implement anything from DEV-1007 group 2; activity recording is DEV-1010.

## 1. Contract only (merged first; DEV-1009, DEV-1010, DEV-1012 build on it)

- [x] 1.1 Shared schemas and types in `packages/shared/src/tasks.ts`: `TaskStatus`, `TaskPriority`, `TASK_STATUS_TRANSITIONS`, task create, update (strict), status, assign, params and response; one export line in `index.ts`; the six task paths in the OpenAPI document; rebuild `dist`. Verify: shared unit tests for valid and invalid input and for the OpenAPI paths (spec: Shared contracts and OpenAPI paths).
- [x] 1.2 Prisma `TaskStatus`, `TaskPriority` and `Task` model, relations on `User` and `Project`, and the migration; run `db-change-checker`; update `scripts/tests/prisma.test.mjs`. Verify: `prisma validate` and `migrate deploy` succeed against Compose (spec: modified Prisma requirement).

## 2. Task routes (backend, behaviour)

- [ ] 2.1 Create and get task with routes, controller and service, mounted behind `projectAccess` (`write: true` on create), including the assignee-membership and due-date rules on create. Verify: integration tests for 201 with status TODO and default priority, 400 invalid input, 400 past due date, 400 non-member assignee, 404 non-member, nonexistent and cross-project task, 409 archived project, 401 (specs: Create task, View task, Due date rule).
- [ ] 2.2 Update task (title, description, priority, due date). Verify: integration tests for 200 partial update, unchanged past due date 200, past due date 400, clear with null, strict body 400, non-member 404, archived task 409 (specs: Update task, Due date rule).
- [ ] 2.3 Assign and change status. Verify: integration tests for assign, unassign, non-member assignee 400, every allowed transition 200, a sample of invalid transitions and same-status 409, invalid value 400, non-member 404, archived task 409 (specs: Assign task, Status transitions).
- [ ] 2.4 Archive task. Verify: integration tests for MEMBER and OWNER 200, still readable, second archive 409, non-member and unknown task 404, archived project 409 (spec: Archive task).

## 3. Verification

- [ ] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1008-tasks --strict`; run `security-auditor`; record new deviations in `docs/deviations.md`.
