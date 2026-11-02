# Web Tasks Specification

## Purpose
Task pages in the web app: the task list with URL-synced filters, sorting and pagination, the task detail page, status, assignee and archive actions, hiding of impossible actions, and the Lighthouse gate for the task list.

## Requirements

### Requirement: Task list with URL-synced filters
The task list page at `/projects/:projectId/tasks` SHALL show the project's tasks from the list API and SHALL offer filters for status, priority, assignee, due date range and include-archived. The filters, sort and page SHALL be kept in the URL query and read from it on load. Invalid URL values SHALL be ignored. Changing a filter or sort SHALL reset the page to 1.

#### Scenario: Filter updates the URL and the request
- **WHEN** the user selects status IN_PROGRESS
- **THEN** the URL query contains `status=IN_PROGRESS` and the list API is called with `status=IN_PROGRESS` and `page=1`

#### Scenario: Filters are restored from the URL
- **WHEN** the page loads with `?priority=HIGH&assigneeId=<member id>&includeArchived=true`
- **THEN** the controls show those values and the list API is called with them

#### Scenario: Due range maps to UTC datetimes
- **WHEN** the user sets due from 2026-12-01 and due to 2026-12-31
- **THEN** the API receives `dueFrom=2026-12-01T00:00:00.000Z` and `dueTo=2026-12-31T23:59:59.999Z`

#### Scenario: Invalid URL value is ignored
- **WHEN** the page loads with `?status=BOGUS&page=-3`
- **THEN** no 400 request is sent and the list shows the unfiltered first page

#### Scenario: Clear filters
- **WHEN** the user clicks "Clear filters"
- **THEN** all filter parameters are removed from the URL and the unfiltered list is requested

### Requirement: Task list sorting and pagination
The task list SHALL provide sortable columns for status, priority, assignee and due date and previous/next controls driven by the response `meta`.

#### Scenario: Sorting toggles direction
- **WHEN** the user clicks the "Due date" column header twice
- **THEN** the API is called with `sortBy=dueDate&sortOrder=asc` and then `sortOrder=desc`, and the header shows `aria-sort` accordingly

#### Scenario: Next and previous page
- **WHEN** `meta.totalPages` is 3 and the user clicks Next on page 1
- **THEN** the URL contains `page=2`, the API is called with `page=2&pageSize=20` and "Page 2 of 3" is shown

#### Scenario: Edge pages disable controls
- **WHEN** the user is on page 1 of 3, or on page 3 of 3
- **THEN** Previous is disabled on page 1 and Next is disabled on page 3

### Requirement: Archived tasks toggle
Archived tasks SHALL be excluded unless "Include archived" is on, and archived tasks SHALL be marked.

#### Scenario: Toggle includes archived tasks
- **WHEN** the user turns on "Include archived"
- **THEN** the API is called with `includeArchived=true` and archived rows show an "Archived" badge

### Requirement: Task list states
The task list SHALL show loading, empty and error states, including 403 and 404.

#### Scenario: Loading state
- **WHEN** the list request is pending
- **THEN** a loading state is shown

#### Scenario: Empty project
- **WHEN** the list is empty and no filter is active
- **THEN** an empty state says there are no tasks yet

#### Scenario: Empty result with filters
- **WHEN** the list is empty and a filter is active
- **THEN** an empty state offers "Clear filters"

#### Scenario: Non-member sees not found
- **WHEN** the list API answers 404
- **THEN** a "Not found" error state is shown and no task data is rendered

#### Scenario: Forbidden
- **WHEN** the list API answers 403
- **THEN** "You do not have permission" is shown

#### Scenario: Server error offers retry
- **WHEN** the list API fails with a 500
- **THEN** an error state with Retry is shown and Retry requests the list again

### Requirement: Task detail page
The task detail page at `/projects/:projectId/tasks/:taskId` SHALL show title, description, status, priority, assignee name, due date and archived state, with loading, error, 403 and 404 states.

#### Scenario: Task fields shown
- **WHEN** the task loads
- **THEN** the title, description, status, priority, due date and the assignee's name are shown

#### Scenario: Unassigned task
- **WHEN** the task has no assignee
- **THEN** "Unassigned" is shown

#### Scenario: Task not found
- **WHEN** the task API answers 404
- **THEN** a "Not found" error state is shown

### Requirement: Task actions
On an active task in an active project the detail page SHALL offer changing status to an allowed next status, assigning to a project member or unassigning, and archiving after confirmation. API failures SHALL be shown, not swallowed.

#### Scenario: Only allowed transitions are offered
- **WHEN** the task status is TODO
- **THEN** only an action to move to IN_PROGRESS is offered

#### Scenario: Status change succeeds
- **WHEN** the user moves the task to IN_PROGRESS and the API answers 200
- **THEN** the page shows the new status

#### Scenario: Status change conflict
- **WHEN** the status API answers 409
- **THEN** an inline message is shown and the task is reloaded

#### Scenario: Assign to a member
- **WHEN** the user selects a member and the API answers 200
- **THEN** the page shows that member's name

#### Scenario: Unassign
- **WHEN** the user selects "Unassigned"
- **THEN** the API is called with `assigneeId: null`

#### Scenario: Archive requires confirmation
- **WHEN** the user clicks Archive and confirms
- **THEN** the archive API is called once and the page shows the task as archived, and if the user cancels no request is sent

#### Scenario: Action forbidden
- **WHEN** an action API answers 403
- **THEN** "You do not have permission" is shown inline and the task is unchanged

### Requirement: Impossible actions are hidden
The detail page SHALL hide all write actions when the task or its project is archived and SHALL show an "Archived" notice instead. Both OWNER and MEMBER roles see the actions on active tasks (SDS section 6).

#### Scenario: Archived task has no actions
- **WHEN** the task has `archivedAt` set
- **THEN** no status, assign or archive controls are rendered

#### Scenario: Archived project has no actions
- **WHEN** the project has `archivedAt` set
- **THEN** no status, assign or archive controls are rendered

#### Scenario: Member sees actions on active task
- **WHEN** the user is a MEMBER and the task and project are active
- **THEN** the status, assign and archive controls are rendered

### Requirement: Task list in the Lighthouse gate
The task list page SHALL be audited by `pnpm lighthouse` with the same threshold as other pages.

#### Scenario: Task list audited
- **WHEN** `pnpm lighthouse` runs
- **THEN** the pages audited include the task list and each category must score at least 95

### Requirement: Create task form
The task list page SHALL offer a "New task" dialog with title, description, priority, due date and assignee fields to the members of an active project. The input SHALL be validated with the shared create schema before any request, and a created task SHALL appear in the list.

#### Scenario: Create a task
- **WHEN** the user submits a valid title with a future due date and the API answers 201
- **THEN** the dialog closes and the new task is shown in the list

#### Scenario: Invalid input is rejected locally
- **WHEN** the user submits an empty title or a title over 200 characters
- **THEN** a field error is shown and no request is sent

#### Scenario: Past due date
- **WHEN** the user picks a due date earlier than today, or the API answers 400 for the due date
- **THEN** the due date field shows an error and the task is not created

#### Scenario: Create forbidden or conflicting
- **WHEN** the create API answers 403 or 409
- **THEN** "You do not have permission" or a project-archived message is shown in the dialog

#### Scenario: Archived project has no create action
- **WHEN** the project has `archivedAt` set
- **THEN** the "New task" action is not rendered

### Requirement: Edit task form
The task detail page SHALL offer an "Edit" dialog for title, description, priority and due date on an active task of an active project. It SHALL send only the changed fields, SHALL accept an unchanged past due date, and SHALL allow clearing the due date.

#### Scenario: Edit a task
- **WHEN** the user changes the title and priority and the API answers 200
- **THEN** the page shows the new values and the request body holds only those two fields

#### Scenario: Invalid edit is rejected locally
- **WHEN** the user clears the title and saves
- **THEN** a field error is shown and no request is sent

#### Scenario: Past due date on edit
- **WHEN** the user changes the due date to an earlier date than today, or the API answers 400
- **THEN** the due date field shows an error and the task is unchanged

#### Scenario: Unchanged past due date and clearing
- **WHEN** the stored due date has passed and the user edits only the title, and then clears the due date
- **THEN** the first request omits `dueDate` and the second sends `dueDate: null`

#### Scenario: Edit forbidden or conflicting
- **WHEN** the update API answers 403 or 409
- **THEN** "You do not have permission" or a task-archived message is shown in the dialog and the task is reloaded

#### Scenario: Archived task has no edit action
- **WHEN** the task or its project has `archivedAt` set
- **THEN** the "Edit" action is not rendered

### Requirement: Task detail in the Lighthouse gate
The task detail page SHALL be audited by `pnpm lighthouse` with the same threshold as other pages, with its comments and activity panels populated by the stub API.

#### Scenario: Task detail audited
- **WHEN** `pnpm lighthouse` runs
- **THEN** the pages audited include the task detail and each category must score at least 95
