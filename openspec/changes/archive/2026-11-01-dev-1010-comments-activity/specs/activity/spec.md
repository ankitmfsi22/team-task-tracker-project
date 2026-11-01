# Spec Delta

## ADDED Requirements

### Requirement: Shared activity contract and OpenAPI path
`packages/shared` SHALL export `ActivityActionSchema` (`TASK_CREATED`, `TASK_ASSIGNED`, `TASK_STATUS_CHANGED`, `TASK_ARCHIVED`), the per-action metadata schema, the activity response and list schemas and types, and the OpenAPI document SHALL describe `GET /api/v1/projects/{projectId}/tasks/{taskId}/activity`. The API SHALL expose no route that creates, edits or deletes activity.

#### Scenario: Metadata schema accepts valid and rejects invalid input
- **WHEN** the metadata schema parses `TASK_STATUS_CHANGED` with `{ from: "TODO", to: "IN_PROGRESS" }`, `TASK_ASSIGNED` with `{ from: null, to: <uuid> }`, `TASK_ARCHIVED` with `{}`, an unknown action, or `TASK_STATUS_CHANGED` with `to: "BLOCKED"`
- **THEN** the first three pass and the last two fail

#### Scenario: OpenAPI describes the activity route
- **WHEN** `buildOpenApiDocument()` is called
- **THEN** the activity path has only a `get`, with the 400, 401 and 404 responses

### Requirement: Record activity on task changes
`TasksService` SHALL record one activity entry (actor, action, timestamp, old/new metadata per FRS section 5) in the same database transaction as the change, for task creation, a change of assignee, a status change and archiving. A rejected change and an update of title, description, priority or due date SHALL record nothing.

#### Scenario: Creation, assignment, status change and archive are recorded
- **WHEN** a member creates a task, assigns it to another member, moves it from TODO to IN_PROGRESS and archives it
- **THEN** the task has four entries `TASK_CREATED`, `TASK_ASSIGNED` (`from` null, `to` the assignee), `TASK_STATUS_CHANGED` (`from` TODO, `to` IN_PROGRESS) and `TASK_ARCHIVED`, each with the acting member as actor and a `createdAt`

#### Scenario: Creation with an assignee records one entry
- **WHEN** a member creates a task with an `assigneeId`
- **THEN** exactly one entry exists, `TASK_CREATED` with that `assigneeId` in its metadata

#### Scenario: Unassign and unchanged assignment
- **WHEN** a member unassigns the task, and then assigns it again to the current assignee
- **THEN** the unassign records `TASK_ASSIGNED` with `to` null, and the repeated assignment records nothing

#### Scenario: Rejected changes and other edits record nothing
- **WHEN** a status change is rejected with 409, an assignee is not a member (400), a non-member acts (404), or a member updates the title
- **THEN** no activity entry is added

#### Scenario: Change and entry are atomic
- **WHEN** writing the activity entry fails during a status change
- **THEN** the task keeps its previous status and no entry exists

### Requirement: View activity history
`GET /api/v1/projects/:projectId/tasks/:taskId/activity` SHALL let any member of the project list the task's activity, newest first, and return 200 with `{ "data": [entries], "meta": { page, pageSize, total, totalPages } }`, each entry `{ id, taskId, action, metadata, actor: { id, name }, createdAt }`. It SHALL be allowed for archived tasks and projects and SHALL return 404 for a non-member.

#### Scenario: Member views history
- **WHEN** a member lists the activity of a task that was created and then moved to IN_PROGRESS
- **THEN** the response is 200 with `TASK_STATUS_CHANGED` first and `TASK_CREATED` second, and `meta.total` 2

#### Scenario: Non-member is denied
- **WHEN** a user who is not a member, or any user for a task of another project or a nonexistent task, requests the activity
- **THEN** the response is 404 and no activity data is returned

#### Scenario: Invalid pagination and unauthenticated request
- **WHEN** a member requests `page=0` or an unknown query parameter, or a client has no valid access token
- **THEN** the responses are 400 `VALIDATION_ERROR` and 401

#### Scenario: Activity is append-only
- **WHEN** a client sends `POST`, `PATCH` or `DELETE` to the activity path or to an activity entry path
- **THEN** the response is 404 and no entry changes; comment edits and deletes add no entry
