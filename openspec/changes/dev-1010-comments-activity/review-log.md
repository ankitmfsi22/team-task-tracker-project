# Review log

- Change: dev-1010-comments-activity (DEV-1010)
- Reviewer: independent reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-01

## Reviewer report (verbatim)

Reviewer: independent reviewer sub-agent (read-only) | Date: 2026-11-01 | Context: fresh

Test evidence: I ran `pnpm test` myself and it passed: shared 110 tests, backend 244 tests in 22 files, frontend 1 test, plus the root node:test tooling tests. I did not run lint, typecheck or build.

| Severity | file:line | Issue | Fix | Status |
| --- | --- | --- | --- | --- |
| Non-blocking | backend/src/routes/comments.routes.ts:25-52 | `validate` runs before `projectAccess`. A non-member who sends an invalid body or query gets 400 instead of 404, so validation errors reveal that the route exists to a non-member. It also differs from the "non-member 404" rule in AGENTS.md. Existing task routes may already do the same. | Accept as a deviation consistent with the existing routes, or put `projectAccess` before body validation. | Open |
| Non-blocking | backend/src/services/comments.service.ts:66-92 | In `update` and `remove`, the 403 author check runs before `assertTaskWritable`. A non-author gets 403 on an archived task, and the author gets 409. The spec does not define this order, and the `findTask` call is repeated three times per request. | Document the order, or merge into one task lookup. | Open |
| Non-blocking | backend/src/services/activity.service.ts:22 | `as ActivityResponse` casts unvalidated stored JSON. This is already accepted as D-082, and the cast is not `any` or `@ts-ignore`. | None (accepted D-082). Optionally parse with `ActivityMetadataSchemas` on read. | Open |
| Non-blocking | backend/src/services/tasks.service.ts:140-146 | Concurrent assign or status requests can write an activity entry from a stale `from` value, because `task` is read outside the transaction (check-then-write race). Atomicity with the task change is correct. | Read the task inside the transaction, or use a conditional `updateMany` guard. | Open |
| Non-blocking | backend/prisma/schema.prisma:107-130 | There is no index on `Comment.authorId` or `Activity.actorId`, and `Activity.metadata` has no default. This is already accepted as D-079. | None (accepted D-079). | Open |
| Non-blocking | backend/src/routes/comments.routes.ts:27 | Comment collection routes reuse `ActivityParamsSchema` for their params. This is already accepted as D-082. | None (accepted D-082). | Open |

No blocking findings.

Checks that passed:

- Every spec requirement and scenario has a route, service logic and an integration test.
- Authentication, Zod validation and `projectAccess` are on every new route.
- Activity writes use `$transaction` in `create`, `assign`, `changeStatus` and `archive`, and a trigger-based test shows a status change rolls back when the activity insert fails.
- Layering is respected.
- No schema is redefined outside `packages/shared`.
- The only existing test changed is `scripts/tests/prisma.test.mjs`, extended per D-080 and not weakened.
- Activity has only a GET route (append-only).

## Disposition

Non-blocking findings are accepted as deviations (PR "accepted deviations"); there are no blocking findings, so no fix was required.

| # | Finding | Disposition | Reason | Deviation |
| --- | --- | --- | --- | --- |
| 1 | `validate` before `projectAccess` on comment routes | Accepted | Same order as the task routes (D-061, D-065); only the request shape is revealed, never whether the project exists | D-084 |
| 2 | 403 before 409 on an archived task; `findTask` repeated | Accepted | The spec does not define this order; the caller is already a member, so nothing leaks; an extra lookup is cheap | D-085 |
| 3 | `as ActivityResponse` cast of stored JSON | Accepted | `TasksService` is the only writer | D-082 |
| 4 | Stale `from` in activity under concurrent writes | Accepted | Same check-then-write race as D-064; atomicity with the change is intact | D-086 |
| 5 | No index on `authorId`/`actorId`, `metadata` has no default | Accepted | Users are never deleted; services always pass an object | D-079 |
| 6 | `ActivityParamsSchema` reused for comment collection params | Accepted | Identical shape; a second name would duplicate it | D-082 |

## Security audit (security-auditor, read-only, before PR)

No blocking findings. Non-blocking: dev-only `minimatch` advisory outside this diff and no rate limiting (D-087); check-then-write race on comment writes (D-086); append-only enforced by the API and not by the database (D-079); unvalidated metadata cast (D-082); `validate` before `projectAccess` (D-084).
