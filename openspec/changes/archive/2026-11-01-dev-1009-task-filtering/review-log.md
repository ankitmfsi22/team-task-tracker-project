# Review log

- Change: dev-1009-task-filtering (DEV-1009)
- Reviewer: independent reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-01
- Test run: `pnpm test` was run by me. shared 74/74 passed, frontend 1/1 passed, backend 189/189 passed (17 files).

## Findings

**BLOCKING: none.** Every spec requirement and scenario is implemented. Auth, validation, filters, sorting, pagination and layering are correct as written.

**NON-BLOCKING**

1. **Assignee two-segment pagination across the boundary is untested.**
   - Location: `backend/src/tasks.sort.integration.test.ts:219-257`; logic at `backend/src/services/tasks.service.ts` (`listSortedByAssignee`).
   - Reason: the tests only check a single page holding both assigned and unassigned tasks. No test pages across the assigned/unassigned boundary.
   - Failure scenario: a regression in `skip - assignedCount` or in `remaining = pageSize - assigned.length` would pass the suite. For example, with 3 assigned and 3 unassigned tasks and `pageSize=2`:
     - page 2 should return 1 assigned + 1 unassigned;
     - page 3 should return the last 2 unassigned;
     - a bug could duplicate or drop a row at the seam.
   - I traced the code by hand and it is correct for these cases (`skip < assignedCount` reads the first segment, `skip - assignedCount` is the second segment's offset, `remaining` is the page's leftover). The gap is the missing test, not a bug.
   - Suggested fix: add a test with `pageSize=2` over 3 assigned + 3 unassigned tasks, asserting the pages and that `total` is the same on every page.

2. **Unbounded `page` can produce a huge `skip`.**
   - Location: `packages/shared/src/common.ts:4` (the `page` field), used at `backend/src/services/tasks.service.ts` (`skip = (page - 1) * pageSize`).
   - Reason: `page` has a minimum of 1 and no maximum. The spec only requires a minimum.
   - Failure scenario: `?page=9007199254740991&pageSize=100` gives a `skip` beyond the range Prisma or Postgres accepts. That would probably return a 500 instead of the spec'd 200 with empty `data`. I did not execute this, so it is unverified.
   - This is a pre-existing shared schema also used by the projects list.
   - Suggested fix: record it as a deviation, or cap `page` with `.max(...)` in a follow-up.

3. **Counts and reads in `listSortedByAssignee` are not strictly consistent.**
   - Location: `backend/src/services/tasks.service.ts` (the interactive `$transaction` in `listSortedByAssignee`).
   - Reason: the transaction uses the default READ COMMITTED isolation. The counts and the two `findMany` calls can see different snapshots.
   - Failure scenario: a task is assigned or unassigned between the count and the read. A page then shows a duplicate or missing row, or `total` is off by one for that request.
   - This is the same class of risk as the offset-pagination risk the design already accepts.
   - Suggested fix: accept it and note it in `docs/deviations.md`, or use `isolationLevel: 'RepeatableRead'`.

4. **Assignee sort order depends on the database collation.**
   - Location: `backend/src/services/tasks.service.ts` (`{ assignee: { name: sortOrder } }`).
   - Reason: ordering by display name uses the Postgres collation, which is not necessarily case-insensitive.
   - Failure scenario: users "bob" and "Alice" sort differently under the C collation than under en_US.
   - Duplicate names are handled: `assigneeId`, then `id`, break ties.
   - Suggested fix: no action required. Optionally document it.

5. **The `dueFrom <= dueTo` refine reports its error under `dueFrom` only.**
   - Location: `packages/shared/src/tasks.ts` (the `.refine` with `path: ['dueFrom']`).
   - Reason: the error is attached to a single field, which is acceptable. The `dueFrom > dueTo` case is covered in the shared unit test and at `backend/src/tasks.filter-paginate.integration.test.ts:206`.
   - Failure scenario: none functional. This is cosmetic only.

## Checked and found correct

- **Route:** `GET /` has `auth`, then `validate` with `params` and `query`, then `projectAccess(prisma)`, then the controller. Non-members and missing projects get 404, no token gets 401, and archived projects stay readable because there is no `write` flag.
- **Layering:** routes call controllers, controllers call the service, and the service calls Prisma. The controller's re-parse of `req.query` is recorded as D-073 and matches the D-058 pattern.
- **Shared-schema rule:** `TaskListQuerySchema`, `TaskListResponseSchema` and the types live in `packages/shared`. The backend imports them. No `any`, no `@ts-ignore`.
- **Filters:**
  - `dueDate` uses `gte`/`lte`, so both ends are inclusive.
  - A null `dueDate` never matches a range.
  - `archivedAt: null` applies unless `includeArchived=true`.
  - Filters combine with AND.
  - `assigneeId` combined with `sortBy=assignee` is ANDed correctly.
  - `includeArchived` is an enum plus transform. `z.coerce.boolean()` would break `"false"`, and this approach avoids that.
- **Sorting:**
  - `status` and `priority` follow the Prisma enum declaration order, which is the logical order.
  - `dueDate` uses `nulls: 'last'` in both directions.
  - `id` is the last tie-breaker everywhere.
  - The default is `createdAt` descending.
  - The assignee sort runs the assigned segment by name, then the unassigned segment. Offsets, `remaining` and `total = assigned + unassigned` are correct.
- **Pagination:** `totalPages = ceil(total / pageSize)`. A page beyond the end returns empty `data` with the real totals. The `pageSize` cap of 100 is enforced and tested.
- **Existing test edit:** the assertion at `packages/shared/src/openapi.test.ts:129` changed from `['post']` to `['get', 'post']`. This is a legitimate update because the route was added, and it is recorded as D-072. No tests were weakened or removed. The docs diff only reformats the table column width plus adds D-070 to D-073. D-071 is referenced but its row exists (line 77).
- **Security:** no secrets or hashes are logged or returned. The response is built through `toTaskResponse`. The query is strict, so unknown parameters give a 400.
- **Spec scenarios:** all have tests, split across `tasks.list`, `tasks.filter-paginate`, `tasks.sort` and `shared/tasks.test.ts` and `openapi.test.ts`. The scenario "Invalid pagination is rejected" is covered at `tasks.filter-paginate.integration.test.ts:255` and the sort-validation case at `tasks.sort.integration.test.ts:297`.

## Disposition (main session, added after the verbatim report above)

No blocking findings, so no fixes were required. Non-blocking findings are accepted and listed as deviations D-074 to D-077 in `docs/deviations.md`.

| #   | Disposition | Reason                                                                                                                 |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | Accepted    | Reviewer traced the logic as correct; a seam test is a follow-up, not required by a spec scenario                      |
| 2   | Accepted    | Pre-existing shared `page` schema also used by the projects list; capping it affects DEV-1007 and is a separate change |
| 3   | Accepted    | Same class of risk as the offset pagination the design already accepts                                                 |
| 4   | Accepted    | Collation is a database setting; no spec requirement on case handling                                                  |
| 5   | Accepted    | Cosmetic; the 400 is returned and tested                                                                               |
