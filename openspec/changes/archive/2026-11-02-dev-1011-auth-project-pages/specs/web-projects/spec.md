# Spec Delta

## ADDED Requirements

### Requirement: Project list
The `/projects` page SHALL list the caller's projects with pagination (`page`, `pageSize` 20) and an "include archived" toggle, and SHALL show loading, empty and error states.

#### Scenario: Projects are listed with pagination
- **WHEN** the API returns two pages of projects
- **THEN** the first page is shown with next enabled and previous disabled, and choosing next requests page 2

#### Scenario: Include archived toggle
- **WHEN** the user turns on "Include archived"
- **THEN** the list is requested with `includeArchived=true` and archived projects are marked as archived

#### Scenario: Empty list
- **WHEN** the API returns no projects
- **THEN** an empty state with a "Create project" action is shown

#### Scenario: List request fails
- **WHEN** the list request fails with a server or network error
- **THEN** an error state with a retry action is shown

### Requirement: Create project
Any signed-in user SHALL be able to create a project with a name and optional description, validated with `CreateProjectRequestSchema`.

#### Scenario: Project is created
- **WHEN** the user submits a valid name
- **THEN** `POST /api/v1/projects` is called and the new project appears in the list

#### Scenario: Invalid project is rejected before submit
- **WHEN** the user submits an empty name or a name over 100 characters
- **THEN** a field error is shown and no request is sent

### Requirement: Project detail, edit and archive
`/projects/:projectId` SHALL show the project name, description, the caller's role and archived state. An OWNER of a non-archived project SHALL be able to edit name and description (`UpdateProjectRequestSchema`) and archive the project after a confirmation.

#### Scenario: Owner edits the project
- **WHEN** an OWNER saves a new name
- **THEN** `PATCH /api/v1/projects/:projectId` is called and the new name is shown

#### Scenario: Owner archives the project
- **WHEN** an OWNER confirms archiving
- **THEN** the archive call is made and the project is shown as archived with all write actions hidden

#### Scenario: Non-member or unknown project
- **WHEN** the detail request returns 404
- **THEN** a "Not found" state is shown

#### Scenario: Forbidden action
- **WHEN** an update or archive call returns 403
- **THEN** a "You do not have permission" message is shown and the project is unchanged

### Requirement: Members management
The project detail page SHALL list members with their role to every member. An OWNER of a non-archived project SHALL be able to add a member by email and role (`AddMemberRequestSchema`) and remove a member. Removing the last owner SHALL show an error and leave the list unchanged.

#### Scenario: Owner adds a member
- **WHEN** an OWNER submits a registered email with role MEMBER
- **THEN** the member list shows the new member

#### Scenario: Unknown email or duplicate member
- **WHEN** the API answers 404 for an unknown email or 409 for an existing member
- **THEN** an inline message names the problem and the list is unchanged

#### Scenario: Owner removes a member
- **WHEN** an OWNER confirms removing a member
- **THEN** the delete call is made and the member disappears from the list

#### Scenario: Last owner cannot be removed
- **WHEN** the API answers 409 `LAST_OWNER`
- **THEN** the page shows "A project needs at least one owner" and the member stays listed

#### Scenario: Invalid member email
- **WHEN** an OWNER submits an invalid email
- **THEN** a field error is shown and no request is sent

### Requirement: Role-based actions are hidden
Actions the caller's role cannot perform SHALL be hidden, not only rejected by the API. A MEMBER SHALL NOT see edit, archive, add-member or remove-member controls, and no role SHALL see write actions on an archived project.

#### Scenario: Member sees a read-only project
- **WHEN** a MEMBER opens a non-archived project
- **THEN** the name, description and member list are shown and no edit, archive, add-member or remove-member control exists

#### Scenario: Owner sees all actions
- **WHEN** an OWNER opens a non-archived project
- **THEN** edit, archive, add-member and remove-member controls are shown

#### Scenario: Archived project has no write actions
- **WHEN** an OWNER opens an archived project
- **THEN** no edit, archive, add-member or remove-member control is shown
