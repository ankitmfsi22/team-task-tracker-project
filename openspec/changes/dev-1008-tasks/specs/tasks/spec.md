# Spec Delta

## Purpose

Defines tasks inside a project: creation, viewing, update, assignment, status transitions, the due date rule and archiving, with the shared contracts and OpenAPI paths for the task routes. Listing and filtering belong to DEV-1009; activity recording to DEV-1010.

## ADDED Requirements

### Requirement: Shared contracts and OpenAPI paths
`packages/shared` SHALL export the `TaskStatus` and `TaskPriority` enums, the task request and response schemas and types, the status transition table, and the OpenAPI document SHALL describe the six task routes.

#### Scenario: Schemas accept valid and reject invalid input
- **WHEN** the create, update, status and assign schemas parse a valid body, an empty title, an unknown status or priority, a non-UTC or malformed `dueDate`, a non-UUID `assigneeId`, or an empty update body
- **THEN** the valid body passes and every invalid one fails

#### Scenario: OpenAPI describes the task routes
- **WHEN** `buildOpenApiDocument()` is called
- **THEN** it contains the six task paths under `/api/v1/projects/{projectId}/tasks`, with their request bodies and the 400, 401, 404 and 409 responses

### Requirement: Create task
`POST /api/v1/projects/:projectId/tasks` SHALL let any member of a non-archived project create a task with a title, optional description, status, priority and due date, and return 201 with the task.

#### Scenario: Member creates a task
- **WHEN** a member posts a valid title with optional description, status, priority and a future `dueDate`
- **THEN** the response is 201 with the task, `createdById` is the caller, and status defaults to TODO and priority to MEDIUM when omitted

#### Scenario: Invalid input is rejected
- **WHEN** a member posts an empty or over-long title, an unknown status or priority, or a malformed `dueDate`
- **THEN** the response is 400 `VALIDATION_ERROR` and no task is created

#### Scenario: Non-member is denied
- **WHEN** a user who is not a member of the project, or any user for a nonexistent project, posts a task
- **THEN** the response is 404 `PROJECT_NOT_FOUND` and no task is created

#### Scenario: Archived project rejects new tasks
- **WHEN** a member posts a task to an archived project
- **THEN** the response is 409 `PROJECT_ARCHIVED`

#### Scenario: Unauthenticated request
- **WHEN** a client posts a task without a valid access token
- **THEN** the response is 401

### Requirement: View task
`GET /api/v1/projects/:projectId/tasks/:taskId` SHALL return the task to any project member, including an archived task.

#### Scenario: Member views a task
- **WHEN** a member requests a task of the project
- **THEN** the response is 200 with the task

#### Scenario: Non-member or unknown task
- **WHEN** a non-member requests a task, a member requests a task id that does not exist, or a member requests a task that belongs to another project
- **THEN** the response is 404 (`PROJECT_NOT_FOUND` for the non-member, `TASK_NOT_FOUND` otherwise)

#### Scenario: Invalid id
- **WHEN** the `taskId` is not a UUID
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Update task
`PATCH /api/v1/projects/:projectId/tasks/:taskId` SHALL let any member change the title, description, priority and due date of a non-archived task. Status and assignee are changed only through their own routes.

#### Scenario: Member updates fields
- **WHEN** a member sends a valid partial body
- **THEN** the response is 200 with the updated task and unspecified fields unchanged

#### Scenario: Invalid body
- **WHEN** the body is empty, has an empty title, or contains `status` or `assigneeId`
- **THEN** the response is 400 `VALIDATION_ERROR` and the task is unchanged

#### Scenario: Non-member is denied
- **WHEN** a non-member patches a task
- **THEN** the response is 404 `PROJECT_NOT_FOUND`

#### Scenario: Archived task cannot be edited
- **WHEN** a member patches an archived task
- **THEN** the response is 409 `TASK_ARCHIVED` and the task is unchanged

### Requirement: Due date rule
A `dueDate` in the past SHALL be rejected with 400 whenever it is set or changed, on create or update; an unchanged existing `dueDate` SHALL be accepted.

#### Scenario: Past due date on create
- **WHEN** a member creates a task with a `dueDate` earlier than now
- **THEN** the response is 400 `VALIDATION_ERROR` and no task is created

#### Scenario: Past due date on update
- **WHEN** a member patches a task with a `dueDate` earlier than now that differs from the stored one
- **THEN** the response is 400 `VALIDATION_ERROR` and the task is unchanged

#### Scenario: Unchanged due date is accepted
- **WHEN** a task's stored `dueDate` has since passed and a member patches the title and sends the same `dueDate`
- **THEN** the response is 200

#### Scenario: Due date can be cleared
- **WHEN** a member patches `dueDate` to `null`
- **THEN** the response is 200 and `dueDate` is null

### Requirement: Assign task
`PUT /api/v1/projects/:projectId/tasks/:taskId/assignee` SHALL let any member assign a non-archived task to a current member of the same project, or unassign it with `null`. Create accepts the same `assigneeId` rule.

#### Scenario: Assign to a member
- **WHEN** a member assigns the task to a user who is a member of the project
- **THEN** the response is 200 and `assigneeId` is that user

#### Scenario: Assignee is not a member
- **WHEN** the `assigneeId` is a registered user who is not a member of the project, or an unknown user, on assign or on create
- **THEN** the response is 400 `ASSIGNEE_NOT_MEMBER` and the task is unchanged

#### Scenario: Unassign
- **WHEN** a member sends `{ "assigneeId": null }`
- **THEN** the response is 200 and `assigneeId` is null

#### Scenario: Invalid body
- **WHEN** the body lacks `assigneeId` or it is not a UUID or null
- **THEN** the response is 400 `VALIDATION_ERROR`

#### Scenario: Non-member is denied
- **WHEN** a non-member assigns a task
- **THEN** the response is 404 `PROJECT_NOT_FOUND`

#### Scenario: Archived task cannot be assigned
- **WHEN** a member assigns an archived task
- **THEN** the response is 409 `TASK_ARCHIVED`

### Requirement: Status transitions
`POST /api/v1/projects/:projectId/tasks/:taskId/status` SHALL accept only these transitions: TODO to IN_PROGRESS; IN_PROGRESS to TODO or IN_REVIEW; IN_REVIEW to IN_PROGRESS or DONE; DONE to IN_PROGRESS. Every other transition, including to the same status, SHALL respond 409.

#### Scenario: Allowed transition
- **WHEN** a member moves a task along an allowed transition, for example TODO to IN_PROGRESS
- **THEN** the response is 200 with the new status

#### Scenario: Invalid transition
- **WHEN** a member moves a task along any other transition, for example TODO to DONE, DONE to TODO, or TODO to TODO
- **THEN** the response is 409 `INVALID_TRANSITION` and the status is unchanged

#### Scenario: Invalid status value
- **WHEN** the body has an unknown or missing `status`
- **THEN** the response is 400 `VALIDATION_ERROR`

#### Scenario: Non-member is denied
- **WHEN** a non-member changes a task's status
- **THEN** the response is 404 `PROJECT_NOT_FOUND`

#### Scenario: Archived task
- **WHEN** a member changes the status of an archived task
- **THEN** the response is 409 `TASK_ARCHIVED`

### Requirement: Archive task
`POST /api/v1/projects/:projectId/tasks/:taskId/archive` SHALL let any member of the project, whatever the role, archive a task as a soft delete by setting `archivedAt`.

#### Scenario: Member archives a task
- **WHEN** a MEMBER (or an OWNER) archives a task
- **THEN** the response is 200 with `archivedAt` set, and the task is still returned by the get route

#### Scenario: Already archived
- **WHEN** a member archives an archived task
- **THEN** the response is 409 `TASK_ARCHIVED`

#### Scenario: Non-member or unknown task
- **WHEN** a non-member archives a task, or a member archives a task id that does not exist
- **THEN** the response is 404

#### Scenario: Archived project
- **WHEN** a member archives a task in an archived project
- **THEN** the response is 409 `PROJECT_ARCHIVED`
