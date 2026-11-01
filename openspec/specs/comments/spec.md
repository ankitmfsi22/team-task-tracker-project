# comments Specification

## Purpose

Defines comments on tasks: the shared contract and OpenAPI paths, adding and listing comments by project members, and editing (author only) and deleting (author or project OWNER) comments, with non-member and archived-project handling. Comment edits and deletes are not recorded as activity.

## Requirements

### Requirement: Shared comment contract and OpenAPI paths
`packages/shared` SHALL export the comment request and response schemas and types, and the OpenAPI document SHALL describe the four comment routes under `/api/v1/projects/{projectId}/tasks/{taskId}/comments`. A comment body SHALL be trimmed, 1 to 2000 characters, and the request schemas SHALL be strict.

#### Scenario: Schemas accept valid and reject invalid input
- **WHEN** the create and update schemas parse a valid body, an empty body, a whitespace-only body, a 2001-character body, a missing `body`, or a body with an unknown field
- **THEN** the valid body passes (trimmed) and every invalid one fails

#### Scenario: OpenAPI describes the comment routes
- **WHEN** `buildOpenApiDocument()` is called
- **THEN** it contains `post` and `get` on the collection path and `patch` and `delete` on the item path, with the 400, 401, 403, 404 and 409 responses where they apply

### Requirement: Add comment
`POST /api/v1/projects/:projectId/tasks/:taskId/comments` SHALL let any member of a non-archived project add a comment to a non-archived task and return 201 with the comment (`author` is the caller). A non-member SHALL receive 404.

#### Scenario: Member adds a comment
- **WHEN** a member posts `{ "body": "  Looks good  " }` to a task of the project
- **THEN** the response is 201 with body `Looks good`, `author` the caller and `createdAt` set

#### Scenario: Empty or invalid comment is rejected
- **WHEN** a member posts an empty, whitespace-only or over-long body, or an unknown field
- **THEN** the response is 400 `VALIDATION_ERROR` and no comment is created

#### Scenario: Non-member is denied
- **WHEN** a user who is not a member, or any user for a nonexistent project, posts a comment
- **THEN** the response is 404 `PROJECT_NOT_FOUND` and no comment is created

#### Scenario: Task outside the project or archived
- **WHEN** a member posts to a task id of another project or a nonexistent task, or to an archived task, or to a task of an archived project
- **THEN** the response is 404 `TASK_NOT_FOUND`, 409 `TASK_ARCHIVED` and 409 `PROJECT_ARCHIVED` respectively, and no comment is created

#### Scenario: Unauthenticated request
- **WHEN** a client posts a comment without a valid access token
- **THEN** the response is 401

### Requirement: List comments
`GET /api/v1/projects/:projectId/tasks/:taskId/comments` SHALL let any member list the task's comments, oldest first, and return 200 with `{ "data": [comments], "meta": { page, pageSize, total, totalPages } }`. Listing SHALL be allowed for archived tasks and projects.

#### Scenario: Member lists comments
- **WHEN** a member lists a task with three comments
- **THEN** the response is 200 with the three comments oldest first and `meta.total` 3

#### Scenario: Non-member is denied
- **WHEN** a user who is not a member lists the comments
- **THEN** the response is 404 and no comment data is returned

#### Scenario: Invalid pagination
- **WHEN** a member lists with `pageSize=101` or an unknown query parameter
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Edit comment
`PATCH /api/v1/projects/:projectId/tasks/:taskId/comments/:commentId` SHALL let only the comment's author change its body and return 200 with the comment and a new `updatedAt`. Another member, including a project OWNER, SHALL receive 403 `FORBIDDEN`. Editing SHALL NOT create an activity entry.

#### Scenario: Author edits own comment
- **WHEN** the author patches a valid body
- **THEN** the response is 200 with the new body and `updatedAt` later than `createdAt`, and no activity entry is added

#### Scenario: Another member is denied
- **WHEN** a member who is not the author, or the project OWNER, patches the comment
- **THEN** the response is 403 `FORBIDDEN` and the body is unchanged

#### Scenario: Invalid body, non-member and unknown comment
- **WHEN** the author patches an empty body, a non-member patches, or the comment id does not exist on that task
- **THEN** the responses are 400 `VALIDATION_ERROR`, 404 `PROJECT_NOT_FOUND` and 404 `COMMENT_NOT_FOUND` respectively

### Requirement: Delete comment
`DELETE /api/v1/projects/:projectId/tasks/:taskId/comments/:commentId` SHALL let the comment's author, or a project OWNER for any comment, delete it permanently and return 204. Another MEMBER SHALL receive 403 `FORBIDDEN`. Deleting SHALL NOT create an activity entry.

#### Scenario: Author deletes own comment
- **WHEN** the author deletes the comment
- **THEN** the response is 204, the comment no longer appears in the list and no activity entry is added

#### Scenario: Owner deletes any comment
- **WHEN** a project OWNER deletes a comment written by a MEMBER
- **THEN** the response is 204 and the comment is gone

#### Scenario: Other member is denied
- **WHEN** a MEMBER who is not the author deletes the comment
- **THEN** the response is 403 `FORBIDDEN` and the comment remains

#### Scenario: Non-member and unknown comment
- **WHEN** a non-member deletes, or the comment id does not exist on that task
- **THEN** the responses are 404 `PROJECT_NOT_FOUND` and 404 `COMMENT_NOT_FOUND`
