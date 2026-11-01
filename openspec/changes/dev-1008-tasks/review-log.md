# Review log

- Change: dev-1008-tasks (DEV-1008)
- Reviewer: reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-01
- Scope: `git diff origin/main...HEAD` after merging origin/main (DEV-1007)

## Reviewer report (verbatim)

Review of feature/tasks/DEV-1008-tasks against openspec/changes/dev-1008-tasks (diff `origin/main...HEAD`).

Test result: I ran `pnpm test` myself and it exited 0. shared: 71 passed. backend: 14 files, 155 tests passed. The root `node:test` tooling tests, including `scripts/tests/prisma.test.mjs`, are in the same run; I only read the tail of the output, so I did not see their count. I did not run lint, typecheck or build.

BLOCKING: none.

NON-BLOCKING:
1. backend/src/app.ts:36-39 and backend/src/routes/projects.routes.ts:26: the mounts coexist correctly. `/projects` is mounted first and its router calls `router.use(authenticate)` for every path, but no route there matches `/:projectId/tasks...`, so requests fall through to the tasks router. The side effect is that `authenticate` runs twice on task routes. Harmless; a short comment would help.
2. backend/src/controllers/tasks.controller.ts:17,23,35-36 (and the other handlers): `req.params`/`req.body` are cast with `as` and `as unknown as TaskParams`. This is already accepted as D-067; a typed `validate` output would remove the casts.
3. backend/src/services/tasks.service.ts:29-31: on create, a past `dueDate` is checked before the assignee. The design lists "400 assignee or due date" with no order, so this is acceptable (D-067).
4. backend/src/services/tasks.service.ts:92-109 (changeStatus, archive): the check and the write are separate queries (D-064). A race could archive twice or apply a double transition.
5. backend/src/routes/tasks.routes.ts:25-30: `validate` runs before `projectAccess` on body routes. A non-member with a bad body gets 400, not 404. This departs from the design's check order (project 404 before body rules), but it is recorded as D-065 and matches DEV-1007's D-061.
6. backend/src/tasks.*.integration.test.ts: only create has a 401 test (D-067). Get, update, status, assign and archive do not, though all routes share `authenticate`.
7. openspec/changes/dev-1008-tasks/approvals.md:6: the Gate 2 row is empty. That is expected before the PR is approved; I did not and cannot approve it.

Items you asked me to check, all fine:
- Spec scenario coverage: every scenario in specs/tasks/spec.md maps to a test. Several are covered by `it.each` blocks (invalid body, invalid status value, MEMBER and OWNER archive, the transition table) rather than single `it`s.
- Design adherence: routes → controller → service → Prisma is followed. All six routes use authenticate, validate and projectAccess, with `write: true` on mutations. The service looks tasks up by `{id, projectId}`. `TASK_STATUS_TRANSITIONS` lives in shared. Archived tasks return 409 `TASK_ARCHIVED` on edits.
- backend/prisma/schema.prisma: `Task` relations on `User` (named `TaskAssignee` and `TaskCreator`) and `Project` are consistent. The `onDelete` rules (cascade, SetNull, Restrict) match the design, as do the two indexes. The migration is present.
- packages/shared: `tasks.ts` is exported from index.ts, and the OpenAPI paths and schemas are merged through the separate `openapi-tasks.ts` helper.
- docs/deviations.md: D-062 to D-067 are correctly numbered, following D-061.
- specs/local-dev-environment/spec.md: the delta lists all five models (User, RefreshToken, Project, ProjectMember, Task) in both the requirement text and the scenario.

Verdict: no blocking findings; the work meets the spec and design and is ready for Gate 2, with items 2 to 6 carried as accepted deviations (D-064, D-065, D-067).

## Disposition (main session)

| Finding | Severity     | Status                                                                                     |
| ------- | ------------ | ------------------------------------------------------------------------------------------ |
| 1       | NON-BLOCKING | Accepted: harmless double `authenticate` on task routes; the mount order is intentional    |
| 2       | NON-BLOCKING | Accepted: existing `validate` pattern, types come from shared (D-067)                      |
| 3       | NON-BLOCKING | Accepted: both errors are 400, the design fixes no order (D-067)                           |
| 4       | NON-BLOCKING | Accepted: conditional update is hardening beyond the spec (D-064)                          |
| 5       | NON-BLOCKING | Accepted: only schema details leak, same as DEV-1007 D-061 (D-065)                         |
| 6       | NON-BLOCKING | Accepted: all routes share `authenticate`; the spec requires 401 only for create (D-067)   |
| 7       | NON-BLOCKING | Accepted: Gate 2 is pending by design                                                      |
