# Design

## Context

Frontend-only change (see proposal.md). The DEV-1008 and DEV-1010 APIs and all Zod schemas already exist in `packages/shared`, so no schema is added or redefined (CreateTaskRequestSchema, UpdateTaskRequestSchema, Create/UpdateCommentRequestSchema, CommentListResponseSchema, ActivityListResponseSchema). `task-detail.tsx` already holds the status, assign and archive actions, `canModify(project, task)`, `describeActionError`, and loads the project (with the caller's `role`) and members. `create-project-dialog.tsx` is the form pattern (`useState`, `safeParse`, `fieldErrorsFrom`, `FormField`, `Dialog`). `useAuth()` provides the current user id.

## Goals / Non-Goals

**Goals:** reuse existing queries, state components and form pattern; keep permission rules in one helper; keep the Lighthouse stub deterministic.

**Non-Goals:** real-time updates, editing status or assignee inside the edit form, activity for comment edits and deletes (the API records none), any backend or shared change.

## Decisions

1. **Forms as dialogs, one shared `TaskFormDialog`.** It serves create (list page) and edit (detail page) with a `mode` prop. Alternative: separate routes; rejected because the dialog pattern exists and avoids new routes. Status and assignee on an existing task stay on their inline controls (their own API routes, strict update schema); create includes assignee.
2. **Due date as a date input converted to the end of that day in UTC (`YYYY-MM-DDT23:59:59Z`).** The API wants a UTC ISO datetime and rejects past values; end of day means "today" is accepted. This is the FRS decision approved at Gate 1 (docs/FRS.md, "Frontend sends a date-only due date as end of that day in UTC"). The client check (converted value earlier than now) mirrors the service rule; a server 400 on `dueDate` is mapped to the same field. Edit sends `dueDate` only when the date string differs from the stored one (the stored value stays acceptable even if past), and `null` when cleared.
3. **Edit sends only changed fields**, and Save is disabled when nothing changed, because the update schema rejects an empty body.
4. **One permission helper** `commentPermissions({ user, role, task, project, comment })` returning `{ canEdit, canDelete }`: edit = author and active; delete = (author or OWNER) and active; active = task and project not archived. Components only read it; the backend remains authoritative and a 403 is still shown.
5. **Panels own their queries.** `CommentsPanel` and `ActivityPanel` use TanStack Query with keys `['comments', projectId, taskId, page]` and `['activity', projectId, taskId, page]`, page in local state, `pageSize` default. After adding a comment the panel invalidates and jumps to the last page (`ceil((total + 1) / pageSize)`) so the new comment is visible. Mutations invalidate `['comments', projectId, taskId]`; task mutations also invalidate `['activity', projectId, taskId]` because status, assign and archive add entries.
6. **Activity text from shared types.** A pure `describeActivity(entry, members)` switches on the `action` discriminant; assignee ids resolve through the members list with "Unassigned" (null) and "Former member" fallbacks, reusing the wording of `assigneeName`.
7. **API clients** `lib/api/comments.ts`, `lib/api/activity.ts` and `createTask`/`updateTask` in `lib/api/tasks.ts`, all via `apiFetch` with the shared response schemas (the 204 delete uses the existing undefined-response pattern from `removeMember`).
8. **Lighthouse stub** gains `GET .../tasks/:id`, `.../comments` and `.../activity` with small fixed fixtures; `PAGES` gains the task detail path. The threshold is not touched. If a score drops under 95, fix the page (for example label or contrast), not the gate.
9. **Context7:** no new library API is used; the TanStack Query, React and Radix Dialog calls match what the repo already uses.

## Risks / Trade-offs

- [Jumping to the last page after add is computed from the pre-add total] → refetch settles on the right page; a race with another user's comment only shows an adjacent page.
- [A role change or removal mid-session leaves stale buttons] → the backend 403 is shown inline; acceptable, same as DEV-1012.
- [Date input has no time of day] → end-of-day UTC is documented in the form hint; time-of-day entry is out of scope.
- [Detail page Lighthouse score could drop with two more panels] → panels stay plain markup, no new packages, lazy route already splits the bundle.
