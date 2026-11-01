# Design

## Context

See proposal.md. Builds on DEV-1007 and DEV-1008: `PaginationQuerySchema`/`PaginationMetaSchema` in `common.ts`, the `ProjectListQuerySchema` pattern (`includeArchived` as `z.enum(['true','false'])` with a transform), `projectAccess(prisma)` without `write`, the `Task` model with `@@index` on `projectId` and `assigneeId`. Zod 4.6.5 behaviour was checked with Context7 on 2026-11-01: `z.coerce.boolean()` turns the string `"false"` into `true`, so `includeArchived` keeps the enum plus transform; `strictObject` rejects unknown keys. Prisma 7.10.1 `findMany` with `where`, `orderBy`, `skip`, `take` and `count` is unchanged; Context7 did not confirm `nulls` ordering on a relation field (see Risks).

## Goals / Non-Goals

**Goals:** FR-FLT-1..5 on one list route with the query names recorded in `docs/FRS.md` section 4.

**Non-Goals:** full-text search, multi-value or `unassigned` filters, cursor pagination, frontend (DEV-1012), schema changes.

## Decisions

1. **Contract first.** `TaskListQuerySchema` goes in `packages/shared/src/tasks.ts`: `PaginationQuerySchema.extend({ status?, priority?, assigneeId?, dueFrom?, dueTo?, includeArchived, sortBy?, sortOrder })`, made strict, with a refinement that `dueFrom <= dueTo`. `dueFrom`/`dueTo` reuse `DueDateSchema` (UTC ISO 8601). `TaskListResponseSchema = { data: TaskResponse[], meta: PaginationMeta }`. The OpenAPI `GET` is added to `openapi-tasks.ts`.
2. **Route.** `router.get('/', auth, validate({ params: ProjectIdParamsSchema, query: TaskListQuerySchema }), projectAccess(prisma), controller.list)`. No `write`, so archived projects stay readable.
3. **Parsed query.** `validate` only checks `req.query` (Express 5 makes it read-only), so defaults and transforms are not applied to it. The controller parses `TaskListQuerySchema` again to get the typed query; the service never sees raw strings.
4. **Service.** `TasksService.list(projectId, query)` builds one `where` object: `projectId`, optional `status`, `priority`, `assigneeId`, `dueDate: { gte, lte }`, and `archivedAt: null` unless `includeArchived`. It runs `findMany` and `count` with the same `where` in one `$transaction`, then returns `{ data: tasks.map(toTaskResponse), meta }` with `totalPages = ceil(total / pageSize)`.
5. **Ordering.** `status`/`priority` order by the Postgres enum declaration order, which already matches the logical order. `dueDate` uses `{ sort, nulls: 'last' }`. `assignee` uses the two-segment read described under Risks (assigned by name, then unassigned), because nulls cannot be placed last on a relation. Default is `createdAt desc`. `id asc` is always appended as the tie-breaker, so pages never overlap.
6. **Error codes.** Existing `VALIDATION_ERROR` 400 from `validate`; no new codes.

## Risks / Trade-offs

- **Nulls last on the assignee relation.** Prisma 7.10.1 cannot order a relation field with `nulls` (`UserOrderByWithRelationInput.name` is a plain `SortOrder`), and Postgres puts nulls first on `desc`. Ordering by `assigneeId` first would group by UUID and break name order, so `sortBy=assignee` reads two segments in one transaction: assigned tasks ordered by assignee name, then `assigneeId`, then `id`; followed by unassigned tasks ordered by `id`. The page is cut across both segments (`skip`, then the remaining `take`), and `total` is the sum of both counts. Recorded as D-070.
- **Offset pagination under concurrent writes** can skip or repeat a row between requests; accepted for this scope, `id` tie-breaker keeps a single snapshot stable.
- **Strict query** rejects clients that send extra parameters; the only client is DEV-1012, which uses the documented names.
