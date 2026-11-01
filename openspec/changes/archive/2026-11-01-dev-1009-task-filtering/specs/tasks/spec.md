# Spec Delta

## ADDED Requirements

### Requirement: Shared list contract and OpenAPI path
`packages/shared` SHALL export `TaskListQuerySchema`, `TaskListResponseSchema` and their types, and the OpenAPI document SHALL describe `GET /api/v1/projects/{projectId}/tasks` with its query parameters and the 400, 401 and 404 responses. Query defaults SHALL be `page` 1, `pageSize` 20, `includeArchived` false.

#### Scenario: Query schema accepts valid and rejects invalid input
- **WHEN** the schema parses an empty query, a full valid query, `status=BLOCKED`, `priority=urgent`, a non-UUID `assigneeId`, a `dueFrom` that is not a UTC ISO 8601 timestamp, `dueFrom` later than `dueTo`, `includeArchived=yes`, `pageSize=101`, `page=0`, `sortBy=title`, `sortOrder=up`, or an unknown parameter
- **THEN** the empty and full valid queries pass (defaults applied for the empty one) and every invalid one fails

#### Scenario: OpenAPI describes the list route
- **WHEN** `buildOpenApiDocument()` is called
- **THEN** the task collection path has a `get` with the query parameters and the 400, 401 and 404 responses

### Requirement: List tasks
`GET /api/v1/projects/:projectId/tasks` SHALL let any member of the project list its tasks and return 200 with `{ "data": [tasks], "meta": { page, pageSize, total, totalPages } }`. Archived tasks SHALL be excluded unless `includeArchived=true`. Listing SHALL be allowed in an archived project. Without `sortBy` tasks SHALL be ordered by `createdAt` descending, then `id`.

#### Scenario: Member lists tasks
- **WHEN** a member lists a project with three active tasks and one archived task
- **THEN** the response is 200 with the three active tasks newest first and `meta` `{ page: 1, pageSize: 20, total: 3, totalPages: 1 }`

#### Scenario: Archived tasks included on request
- **WHEN** a member lists with `includeArchived=true`
- **THEN** the archived task is in `data` and counted in `meta.total`

#### Scenario: Non-member is denied
- **WHEN** a user who is not a member lists the tasks of a project, or the project does not exist
- **THEN** the response is 404 and no task data is returned

#### Scenario: Unauthenticated request is rejected
- **WHEN** the request has no valid access token
- **THEN** the response is 401

#### Scenario: Tasks of other projects are not returned
- **WHEN** a member lists a project while another project they belong to also has tasks
- **THEN** `data` contains only tasks of the requested project

### Requirement: Filter tasks
The list route SHALL filter by `status`, `priority`, `assigneeId` and a due-date range, and filters SHALL combine with AND. `dueFrom` and `dueTo` SHALL be inclusive UTC ISO 8601 timestamps; when either is set, tasks without a `dueDate` SHALL be excluded.

#### Scenario: Filter by status, priority and assignee
- **WHEN** a member lists with `status=IN_PROGRESS`, `priority=HIGH` and an `assigneeId`
- **THEN** `data` contains only tasks matching all three and `meta.total` counts only those

#### Scenario: Filter by due-date range
- **WHEN** a member lists with `dueFrom` and `dueTo` timestamps
- **THEN** `data` contains only tasks whose `dueDate` is between them, both ends included, and no task without a `dueDate`

#### Scenario: Invalid filter is rejected
- **WHEN** a member lists with an unknown status or priority, a non-UUID `assigneeId`, a malformed `dueFrom`, `dueFrom` later than `dueTo`, or an unknown parameter
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Sort tasks
The list route SHALL sort by `sortBy` one of `status`, `priority`, `assignee`, `dueDate` with `sortOrder` `asc` (default) or `desc`. `status` and `priority` SHALL sort by enum order, `assignee` by the assignee's display name, and tasks without an assignee or `dueDate` SHALL sort last in both directions. `id` SHALL be the final tie-breaker.

#### Scenario: Sort by priority and due date
- **WHEN** a member lists with `sortBy=priority&sortOrder=desc`, then with `sortBy=dueDate&sortOrder=asc`
- **THEN** the first response is URGENT first and LOW last, and the second is earliest `dueDate` first with tasks without a `dueDate` at the end

#### Scenario: Invalid sort is rejected
- **WHEN** a member lists with `sortBy=title` or `sortOrder=up`
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Paginate tasks
The list route SHALL accept `page` (default 1, minimum 1) and `pageSize` (default 20, maximum 100), and `meta.totalPages` SHALL be `ceil(total / pageSize)`.

#### Scenario: Second page
- **WHEN** a project has 25 matching tasks and a member lists with `page=2&pageSize=20`
- **THEN** `data` has 5 tasks and `meta` is `{ page: 2, pageSize: 20, total: 25, totalPages: 2 }`

#### Scenario: Page beyond the end
- **WHEN** a member lists with `page=9` and only one page exists
- **THEN** the response is 200 with empty `data` and the real `total` and `totalPages`

#### Scenario: Invalid pagination is rejected
- **WHEN** a member lists with `page=0`, `pageSize=101` or `pageSize=abc`
- **THEN** the response is 400 `VALIDATION_ERROR`
