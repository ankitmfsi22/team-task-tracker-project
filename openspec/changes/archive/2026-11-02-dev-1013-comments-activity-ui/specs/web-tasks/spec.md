# Spec Delta

## ADDED Requirements

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
