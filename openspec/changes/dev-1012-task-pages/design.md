# Design

## Context

See proposal.md. Task API (all under `/api/v1/projects/:projectId/tasks`): `GET /` (list; query per `TaskListQuerySchema`), `GET /:taskId`, `POST /:taskId/status`, `PUT /:taskId/assignee`, `POST /:taskId/archive`. Shared schemas used: `TaskListQuerySchema`, `TaskListResponseSchema`, `TaskResponseSchema`, `TaskStatusSchema`, `TaskPrioritySchema`, `TASK_STATUS_TRANSITIONS`, `ChangeTaskStatusRequestSchema`, `AssignTaskRequestSchema`, `MemberListResponseSchema`. Per SDS section 6 both OWNER and MEMBER may update, assign and archive tasks; non-members get 404. Context7: React Router `useSearchParams` was checked (Context7 has React Router 7.x only, same API as used in DEV-1011). The Context7 lookup for TanStack Query timed out; DEV-1011 usage (`useQuery`, `useMutation`, `invalidateQueries`) is reused and `placeholderData: keepPreviousData` is to be confirmed against the official TanStack Query v5 docs at apply time.

## Goals / Non-Goals

**Goals:** FR-FE-4, 5, 8, 9, 10 on top of the DEV-1011 contract without editing its Group 1 files beyond the route array.
**Non-Goals:** task editing, comments, activity, project pages.

## Decisions

1. **Reuse the contract.** `apiFetch`, `ApiError`, `useAuth`, `LoadingState` / `EmptyState` / `ErrorState`, `AppLayout`, shadcn components and the test render helper are used as is. No new packages.
2. **Routes.** Two lazy routes inside the existing protected `AppLayout` children: `/projects/:projectId/tasks` and `/projects/:projectId/tasks/:taskId`. The only edit to Group 1 is adding these two entries to `routes`.
3. **API module `src/lib/api/tasks.ts`.** One function per route (`listTasks`, `getTask`, `changeTaskStatus`, `assignTask`, `archiveTask`), each passing a shared response schema to `apiFetch`. Project and member helpers belong to DEV-1011 Group 2 (`projects.ts`), so this module also holds two small read helpers it needs: `getTaskProject` (`GET /projects/:id`, for `archivedAt`) and `listTaskMembers` (`GET /projects/:id/members`, for assignee names and options). At integration they are replaced by the Group 2 equivalents if identical (recorded as a deviation), which avoids editing `projects.ts` here.
4. **URL state.** `useSearchParams` is the single source of truth: `status`, `priority`, `assigneeId`, `dueFrom`, `dueTo` (date inputs, `YYYY-MM-DD`), `includeArchived`, `sortBy`, `sortOrder`, `page`. A pure `parseTaskListParams(searchParams)` reads each parameter with the shared enum/uuid schemas and ignores invalid values (falls back to defaults), so a hand-edited URL never causes a 400. A pure `toApiQuery` maps date inputs to UTC ISO datetimes (`dueFrom` start of day, `dueTo` end of day) and omits defaults; the result is validated with `TaskListQuerySchema`. Changing any filter or sort resets `page` to 1. Page size is fixed at 20.
5. **Server state.** TanStack Query keys: `['tasks', projectId, query]`, `['task', projectId, taskId]`, `['project', projectId]`, `['project', projectId, 'members']`. The list keeps previous data while paging. Mutations invalidate `['task', ...]` and `['tasks', projectId]`.
6. **List UI.** A filter bar (labelled `select`s and date inputs, "Include archived" checkbox, "Clear filters"), a table with sortable column buttons (status, priority, assignee, due date; `aria-sort` set; first click asc, second desc), previous/next controls from `meta.totalPages` with "Page X of Y". Rows link to the detail page; archived rows carry an "Archived" badge. Empty result with active filters shows an `EmptyState` with "Clear filters"; an empty project shows "No tasks yet" (creating tasks is DEV-1013).
7. **Detail UI.** Read view of all fields, with the assignee shown by member name ("Unassigned" when none, "Former member" if the id is not in the member list). Actions:
   - Status: one button per allowed target from `TASK_STATUS_TRANSITIONS[task.status]`; a 409 shows an inline message and refetches.
   - Assign: labelled select of project members plus "Unassigned", submits on change; 400/404 shown inline.
   - Archive: button opens the existing confirmation dialog; success refetches.
8. **Permission rules in the UI.** Both roles may perform all three actions (SDS section 6), so there is no role difference today; the UI uses a single `canModify(project, task)` helper (`project.archivedAt === null && task.archivedAt === null`) so a future role rule changes one place. When false, the actions are hidden and an "Archived" notice is shown. The backend stays authoritative: a 403 or 409 from any action is shown inline.
9. **Error mapping.** 401: handled by the client (refresh once, then the session ends and the guard redirects to login). 403: "You do not have permission". 404 (non-member, unknown project or task): "Not found". Network/other: `ErrorState` with retry. Each data view has loading, empty and error states.
10. **Lighthouse.** Append `{ path: '/projects/<fixture-id>/tasks', seedSession: true }` to `PAGES` and add task list fixtures to the stub API (`GET /projects/:id`, `/members`, `/tasks`). Must meet 95 in all four categories (FRS: the task list is a main page).
11. **Tests.** Vitest + Testing Library with a mocked `fetch`: URL parse/map unit tests, list and detail component tests per the spec scenarios. No tests of docs or styling.

## Risks / Trade-offs

- **Parallel edits.** `router.tsx`, `scripts/lighthouse.mjs` (PAGES and stub), and duplicated project/member helpers will conflict with Group 2; each is a few lines, resolved at merge (evidence for DEV-1014).
- **Date-range timezone.** Date inputs are UTC days to match the API's UTC datetimes; a user in another timezone may see a one-day offset at range edges. Accepted.
- **No create button.** Tasks cannot be created from the UI until DEV-1013; the empty state says so neutrally.
