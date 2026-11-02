# Web Comments Activity Specification

## Purpose

Defines the comments and activity history panels on the task detail page: listing with pagination, adding, editing and deleting comments with role-based actions, and read-only behaviour for archived tasks and projects.

## Requirements

### Requirement: Comment list
The task detail page SHALL list the task's comments oldest first with author name, body and time, paginated with Previous and Next controls, and SHALL show loading, empty and error states (including 403 and 404).

#### Scenario: Comments listed oldest first
- **WHEN** the task has three comments
- **THEN** they are shown oldest first with author and time

#### Scenario: Pagination
- **WHEN** the list has more than one page and the user selects Next
- **THEN** the next page is requested with `page` and `pageSize`, and Previous is disabled on the first page

#### Scenario: Empty and error states
- **WHEN** the task has no comments, or the list API answers 404
- **THEN** "No comments yet" or the shared not-found error state is shown, with a retry for other failures

### Requirement: Add comment
A member of an active project SHALL be able to add a comment to an active task. The body SHALL be validated with the shared create schema before any request.

#### Scenario: Add a comment
- **WHEN** the user submits "Looks good" and the API answers 201
- **THEN** the comment appears at the end of the list and the field is cleared

#### Scenario: Invalid body
- **WHEN** the user submits an empty, whitespace-only or 2001-character body
- **THEN** a field error is shown and no request is sent

#### Scenario: Add forbidden or conflicting
- **WHEN** the create API answers 403 or 409
- **THEN** an inline message is shown and the typed text is kept

### Requirement: Edit comment
Only the author of a comment SHALL be offered Edit, even when the user is a project OWNER. The body SHALL be validated with the shared update schema.

#### Scenario: Author edits
- **WHEN** the author saves a new body and the API answers 200
- **THEN** the comment shows the new body

#### Scenario: Others are not offered Edit
- **WHEN** the user is not the author, including a project OWNER
- **THEN** no Edit control is rendered on that comment

#### Scenario: Edit rejected
- **WHEN** the author saves an empty body, or the update API answers 403
- **THEN** a field error without a request, or "You do not have permission", is shown and the comment is unchanged

### Requirement: Delete comment
The author, or a project OWNER for any comment, SHALL be offered Delete, which requires confirmation. A MEMBER who is not the author SHALL NOT be offered Delete.

#### Scenario: Author deletes
- **WHEN** the author confirms Delete and the API answers 204
- **THEN** the comment is removed from the list, and if the user cancels no request is sent

#### Scenario: Owner deletes a comment by another user
- **WHEN** the user is the project OWNER and confirms Delete on a MEMBER's comment
- **THEN** the delete API is called and the comment is removed

#### Scenario: Member is not offered Delete
- **WHEN** the user is a MEMBER and not the author
- **THEN** no Delete control is rendered on that comment

#### Scenario: Delete forbidden
- **WHEN** the delete API answers 403
- **THEN** "You do not have permission" is shown and the comment remains

### Requirement: Comments are read-only on archived items
The comment form and the Edit and Delete controls SHALL NOT be rendered when the task or its project is archived; the existing comments SHALL stay visible with an "Archived" notice.

#### Scenario: Archived task or project
- **WHEN** the task or the project has `archivedAt` set
- **THEN** existing comments are listed, and no add form, Edit or Delete control is rendered

### Requirement: Activity history
The task detail page SHALL show the task's activity newest first, paginated, with actor name, a readable action, timestamp and change metadata (status from and to, assignee names with "Unassigned" and "Former member" fallbacks). It SHALL offer no way to change activity.

#### Scenario: Activity entries are described
- **WHEN** the history holds a status change from TODO to IN_PROGRESS and an assignment from nobody to a member
- **THEN** each entry shows the actor, the readable action, the from and to values and the time, newest first

#### Scenario: Pagination, empty and error states
- **WHEN** the history spans two pages, is empty, or the API answers 403
- **THEN** Next and Previous page it, "No activity yet" is shown, and "You do not have permission" is shown respectively

#### Scenario: Archived task still shows history
- **WHEN** the task or project is archived
- **THEN** the activity panel is still shown
