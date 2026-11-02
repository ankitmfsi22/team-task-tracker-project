# Proposal

## Why

DEV-1012 left the task detail page read-mostly: tasks cannot be created or edited in the UI, and the comments and activity APIs delivered by DEV-1010 have no frontend. DEV-1013 (Linear DEV-17) closes FRS §6 FR-FE-6, 7, 8 and 10 so a user can run the full journey from creating a task to discussing and auditing it.

## What Changes

- New task form (dialog) on the task list and an Edit dialog on the task detail page: title, description, priority, due date, and (create only) assignee. Validation reuses the shared Zod schemas; a past due date, 400, 403 and 409 are shown. Status and assignee on an existing task keep their current inline controls.
- Comments panel on the task detail page: oldest first, paginated, add, edit by the author, delete by the author or a project OWNER. Actions the user may not perform are not rendered; archived task or project is read-only; 403 and 409 are shown.
- Activity history panel on the task detail page: newest first, paginated, showing actor, action, timestamp and change metadata (member names resolved).
- Loading, empty and error states for both panels.
- The task detail page joins the Lighthouse pages (95 gate unchanged); the stub API gains the detail, comments and activity routes.
- No backend, shared-schema or dependency changes.

## Capabilities

### New Capabilities
- `web-comments-activity`: comments and activity history on the task detail page, including their permissions and states.

### Modified Capabilities
- `web-tasks`: adds the task create and edit forms and puts the task detail page in the Lighthouse gate.

## Impact

- Code: `frontend/src` (task form dialog, comments and activity panels, API clients for comments, activity, task create and update, task list and detail pages), `scripts/lighthouse.mjs`, `frontend/CLAUDE.md`.
- APIs: consumes existing DEV-1008 and DEV-1010 routes only. Dependencies: none added.
- Ticket: DEV-1013 (Linear DEV-17); depends on DEV-1010 and DEV-1012 (both merged).
- Rollback: revert the feature branch merge; no data or API changes to undo.
