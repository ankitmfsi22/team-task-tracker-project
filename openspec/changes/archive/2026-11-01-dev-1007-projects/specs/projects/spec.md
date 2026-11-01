# Spec Delta

## Purpose

Defines projects, project membership and the role-based access rule scoped per project (OWNER, MEMBER), with the shared contracts and OpenAPI paths for the project routes.

## ADDED Requirements

### Requirement: Create project
`POST /api/v1/projects` SHALL create a project for any authenticated user, make the caller its OWNER and return 201 with the project.

#### Scenario: Creator becomes owner
- **WHEN** an authenticated user posts a valid name and optional description
- **THEN** the response is 201 with the project, and the caller is a member of it with role OWNER

#### Scenario: Invalid input is rejected
- **WHEN** a client posts an empty name, a name over 100 characters, or no body
- **THEN** the response is 400 `VALIDATION_ERROR` and no project is created

#### Scenario: Unauthenticated request
- **WHEN** a client posts to create a project without a valid access token
- **THEN** the response is 401

### Requirement: List projects
`GET /api/v1/projects` SHALL return only the projects the caller is a member of, paginated, hiding archived projects unless `includeArchived=true`.

#### Scenario: Only own projects are listed
- **WHEN** two users each own a project and one of them lists projects
- **THEN** the response is 200 with `data` containing only that user's project and `meta` with page, pageSize, total and totalPages

#### Scenario: Archived projects are hidden by default
- **WHEN** a member lists projects after one of their projects is archived
- **THEN** the archived project is absent, and present when `includeArchived=true`

#### Scenario: Invalid pagination is rejected
- **WHEN** a client sends `pageSize=101` or `page=0`
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: View project
`GET /api/v1/projects/:projectId` SHALL return the project and the caller's role to a member, and 404 otherwise.

#### Scenario: Member views project
- **WHEN** a MEMBER or OWNER requests the project
- **THEN** the response is 200 with the project and the caller's role

#### Scenario: Non-member gets 404
- **WHEN** an authenticated user who is not a member requests the project
- **THEN** the response is 404 `PROJECT_NOT_FOUND`, identical to the response for a nonexistent project

#### Scenario: Nonexistent or malformed id
- **WHEN** a client requests a project id that does not exist, or that is not a UUID
- **THEN** the response is 404 for the nonexistent id and 400 for the malformed id

### Requirement: Update project
`PATCH /api/v1/projects/:projectId` SHALL let an OWNER change the name and description.

#### Scenario: Owner updates
- **WHEN** an OWNER patches a valid name or description
- **THEN** the response is 200 with the updated project

#### Scenario: Member is forbidden
- **WHEN** a MEMBER patches the project
- **THEN** the response is 403 `FORBIDDEN` and the project is unchanged

#### Scenario: Invalid update is rejected
- **WHEN** an OWNER patches an empty name or an empty body
- **THEN** the response is 400 `VALIDATION_ERROR`

### Requirement: Archive project and read-only archived projects
`POST /api/v1/projects/:projectId/archive` SHALL let an OWNER soft-delete a project by setting `archivedAt`. An archived project SHALL remain readable and SHALL reject every write with 409 `PROJECT_ARCHIVED`.

#### Scenario: Owner archives
- **WHEN** an OWNER archives the project
- **THEN** the response is 200 with `archivedAt` set, and the project is hidden from the default list

#### Scenario: Member is forbidden to archive
- **WHEN** a MEMBER archives the project
- **THEN** the response is 403 `FORBIDDEN` and the project is not archived

#### Scenario: Archived project is read-only
- **WHEN** an OWNER updates the project, archives it again, or adds or removes a member after it is archived
- **THEN** each response is 409 `PROJECT_ARCHIVED`, while `GET` of the project and its members still returns 200

### Requirement: Project membership
An OWNER SHALL be able to add a registered user by email as MEMBER or OWNER and remove a member. Any member SHALL be able to list members. The last OWNER SHALL NOT be removable.

#### Scenario: Owner adds a member
- **WHEN** an OWNER posts the email of a registered user who is not yet a member
- **THEN** the response is 201 with the member's user id, email, name and role (default MEMBER), and that user can now view the project

#### Scenario: Adding is rejected when invalid
- **WHEN** an OWNER posts an unknown email, an email of an existing member, or an invalid body
- **THEN** the responses are 404 `USER_NOT_FOUND`, 409 `ALREADY_MEMBER` and 400 `VALIDATION_ERROR` respectively

#### Scenario: Member cannot manage members
- **WHEN** a MEMBER adds or removes a member
- **THEN** the response is 403 `FORBIDDEN` and membership is unchanged

#### Scenario: Non-member cannot see members
- **WHEN** a non-member lists, adds or removes members
- **THEN** the response is 404 `PROJECT_NOT_FOUND`

#### Scenario: Owner removes a member
- **WHEN** an OWNER removes a MEMBER
- **THEN** the response is 204 and the removed user receives 404 for the project

#### Scenario: Last owner cannot be removed
- **WHEN** the only OWNER removes themselves or is removed
- **THEN** the response is 409 `LAST_OWNER` and the membership remains

### Requirement: Project access rule
A `projectAccess` middleware SHALL protect project-scoped routes in this order: 404 `PROJECT_NOT_FOUND` when the project does not exist or the caller is not a member, 403 `FORBIDDEN` when the caller's role is not allowed, and 409 `PROJECT_ARCHIVED` when a write route targets an archived project. Later tickets SHALL use it for tasks, comments and activity.

#### Scenario: Non-member and nonexistent project look the same
- **WHEN** a non-member and a caller using an unknown project id hit a protected route
- **THEN** both receive the same 404 response body

#### Scenario: Insufficient role
- **WHEN** a MEMBER calls a route restricted to OWNER
- **THEN** the response is 403 `FORBIDDEN`

#### Scenario: Write to archived project
- **WHEN** any member calls a write-protected route of an archived project
- **THEN** the response is 409 `PROJECT_ARCHIVED`; a 403 for a role failure takes precedence over it

#### Scenario: Access granted
- **WHEN** a member with an allowed role calls a protected route
- **THEN** the handler runs with the project and the caller's membership available

### Requirement: Shared contracts and OpenAPI paths
The request, response, params and query schemas for the project routes SHALL live in `packages/shared`, and the OpenAPI 3.1 document SHALL list the eight project paths generated from them.

#### Scenario: Contracts reject invalid input
- **WHEN** the shared schemas parse a project with an empty name, a member body with an invalid email, or a list query with `pageSize=101`
- **THEN** each parse fails

#### Scenario: OpenAPI lists the project paths
- **WHEN** the OpenAPI document is generated
- **THEN** it contains the eight project operations under `/api/v1/projects` and each request body schema equals the JSON Schema produced from the shared Zod schema
