# Functional Requirements Specification (FRS)

Source: docs/reference/ASSIGNMENT.md. `DECISION:` = approved, not in the assignment. `ASSUMPTION:` = not in the assignment, awaiting approval (inline tags included). DECISION: the HTTP status codes used here (400, 401, 403, 404, 409) are our choice.

## 1. Auth
Tickets: DEV-1006

- FR-AUTH-1: DECISION: The system SHALL allow a user to register with email and password.
- FR-AUTH-2: The system SHALL reject registration with invalid input or an already-registered email.
- FR-AUTH-3: The system SHALL allow a registered user to log in and SHALL return a JWT access token and a JWT refresh token.
- FR-AUTH-4: DECISION: The system SHALL reject login with wrong credentials using a generic error that does not reveal which field was wrong.
- FR-AUTH-5: DECISION: The system SHALL allow a user to log out, after which the refresh token MUST no longer be usable.
- FR-AUTH-6: The system SHALL issue a new access token from a valid refresh token and SHALL reject an invalid, expired or revoked refresh token.
- FR-AUTH-7: The system SHALL store passwords only as secure hashes and MUST NOT return or log them.
- FR-AUTH-8: The system SHALL validate all auth input with Zod and respond 400 on invalid input.
- FR-AUTH-9: Protected endpoints SHALL respond 401 when the access token is missing, invalid or expired.
- FR-AUTH-10: The system SHALL enforce role-based permissions and respond 403 when the role is not allowed.
- DECISION: Registration identifies users by unique email plus a display name.
- DECISION: Roles are `OWNER` and `MEMBER`, scoped per project (see SDS authorization table). No global admin role.

## 2. Projects
Tickets: DEV-1007

- FR-PRJ-1: DECISION: An authenticated user SHALL be able to create a project and SHALL become its first member with the owner role.
- FR-PRJ-2: A project member SHALL be able to view the project; a non-member MUST receive 404.
- FR-PRJ-3: An authorized member SHALL be able to update project details.
- FR-PRJ-4: An authorized member SHALL be able to archive a project; archived projects MUST NOT accept new tasks or comments.
- FR-PRJ-5: An authorized member SHALL be able to add a registered user as a project member.
- FR-PRJ-6: An authorized member SHALL be able to remove a member; unauthorized attempts by a member MUST receive 403.
- FR-PRJ-7: DECISION: The system SHALL list only the projects the caller is a member of.
- FR-PRJ-8: Requests for a nonexistent project SHALL respond 404; invalid input SHALL respond 400.
- DECISION: Non-members SHALL receive 404 for a project AND its tasks, comments and activity, so existence is not revealed.
- DECISION: Only the owner role can update, archive, and add/remove members. The last owner cannot be removed.
- DECISION: Archived projects are read-only and hidden from the default list.

## 3. Tasks
Tickets: DEV-1008

- FR-TSK-1: A project member SHALL be able to create a task in a non-archived project with title, optional description, status, priority and optional due date.
- FR-TSK-2: A project member SHALL be able to view and update tasks in their project; non-members MUST receive 404.
- FR-TSK-3: The system SHALL allow assigning a task only to a current member of the same project and MUST reject other assignees with 400.
- FR-TSK-4: The system SHALL validate status transitions and MUST reject invalid transitions with 409.
- FR-TSK-5: A project member SHALL be able to archive a task; archived tasks MUST NOT be editable.
- FR-TSK-6: The system SHALL validate all task input with Zod; requests for a nonexistent task SHALL respond 404.
- DECISION: Statuses are `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`.
- DECISION: Priorities are `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- DECISION: Allowed transitions: TODO to IN_PROGRESS; IN_PROGRESS to TODO or IN_REVIEW; IN_REVIEW to IN_PROGRESS or DONE; DONE to IN_PROGRESS. Invalid transitions respond 409.
- DECISION: A dueDate in the past SHALL be rejected (400) whenever it is set or changed, on create or update; an unchanged existing dueDate is accepted.
- DECISION: Any project member may archive tasks; archive is a soft delete (`archivedAt`).

## 4. Task filtering
Tickets: DEV-1009

- FR-FLT-1: The task list endpoint SHALL support filtering by status, priority, assignee and due date (range).
- FR-FLT-2: The endpoint SHALL support sorting by status, priority, assignee and due date, ascending or descending.
- FR-FLT-3: The endpoint SHALL paginate results and SHALL return pagination metadata.
- FR-FLT-4: The endpoint SHALL reject invalid filter, sort or pagination values with 400.
- FR-FLT-5: The endpoint SHALL return only tasks in projects the caller is a member of; a non-member project MUST respond 404.
- DECISION: Archived tasks are excluded unless an `includeArchived` filter is set.
- DECISION: Default page size is 20, maximum 100.

## 5. Comments & Activity
Tickets: DEV-1010

- FR-CMT-1: A project member SHALL be able to add a comment to a task in their project; a non-member MUST receive 404.
- FR-CMT-2: A comment author SHALL be able to edit their own comment.
- FR-CMT-3: A comment author SHALL be able to delete their own comment.
- FR-CMT-4: A project member who is not authorized MUST receive 403 when editing or deleting a comment.
- FR-CMT-5: Comment input SHALL be validated; empty comments MUST be rejected with 400.
- FR-ACT-1: The system SHALL record an activity entry on task creation, assignment, status change and archiving.
- FR-ACT-2: Each activity entry SHALL include actor, action, timestamp and relevant change metadata (for example old and new value).
- FR-ACT-3: The system SHALL return a task's activity history to project members only; a non-member MUST receive 404.
- DECISION: Project owners may also delete any comment in their project.
- DECISION: Activity entries are append-only and cannot be edited or deleted.
- DECISION: Comment edits and deletes are not recorded as activity (assignment lists only four actions).

## 6. Frontend
Tickets: DEV-1011, DEV-1012, DEV-1013

- FR-FE-1: The frontend SHALL provide register, login and logout pages (DEV-1011).
- FR-FE-2: The frontend SHALL redirect unauthenticated users from protected routes to login (DEV-1011).
- FR-FE-3: The frontend SHALL provide pages to list, create, view, update and archive projects and manage members (DEV-1011).
- FR-FE-4: The frontend SHALL provide a task list with filter, sort and pagination controls (DEV-1012).
- FR-FE-5: The frontend SHALL provide a task detail page (DEV-1012).
- FR-FE-6: The frontend SHALL allow creating and editing tasks, including assignee, status, priority and due date (DEV-1013).
- FR-FE-7: The frontend SHALL allow adding, editing and deleting comments and SHALL show activity history (DEV-1013).
- FR-FE-8: DECISION: The frontend SHALL show clear loading, empty and error states, including 401, 403 and 404 responses.
- FR-FE-9: The frontend SHALL use Tailwind CSS, shadcn/ui and TanStack Query, and SHALL reuse types and Zod schemas from packages/shared.
- FR-FE-10: DECISION: The frontend SHALL hide or disable actions the current user is not authorized to perform.
- DECISION: Access token is kept in memory and the refresh token in an httpOnly cookie (see SDS).

## 7. Non-functional
Tickets: DEV-1001, DEV-1016, DEV-1018

- NFR-1: The system SHALL run locally with Docker Compose (PostgreSQL 16 and app services) using pinned image versions.
- NFR-2: The repository SHALL enforce ESLint and Prettier, with a Husky pre-commit hook that runs them. (Source: team requirement)
- NFR-3: `pnpm typecheck` MUST pass with no errors.
- NFR-4: The project SHALL include unit and integration tests (Vitest, Supertest) and end-to-end tests (Playwright).
- NFR-5: `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` MUST all pass at integration checkpoints.
- NFR-6: Tests SHALL cover error and authorization-denied scenarios, and the final app MUST pass the Playwright user journey.
- NFR-7: The main pages SHALL score 95 or higher in Lighthouse. (Source: team requirement)
- NFR-7a: Lighthouse 95+ SHALL be measured on the production build (vite build + vite preview), not the dev server. (Source: team requirement)
- NFR-8: DECISION: The repository MUST NOT contain secrets; `.env` files with secrets MUST be git-ignored, and a `.env.example` with placeholders SHALL be provided.
- NFR-9: Versions SHALL be pinned and documented; `@latest` and unpinned Docker images MUST NOT be used.
- NFR-10: Commits SHALL follow conventional commits and reference the issue key.
- DECISION: "Main pages" for Lighthouse means login, project list and task list. (Source: team requirement)
- DECISION: The Lighthouse 95+ target applies to the Performance, Accessibility, Best Practices and SEO categories. (Source: team requirement)

## 8. Out of scope

Unless explicitly approved, the system MUST NOT include: real-time collaboration, chat/video, file attachments, native mobile apps, OAuth/social login, payments, email delivery, AI-based task prioritization, a custom issue tracker, a custom MCP server, or autonomous production deployments.
