# Tasks

Per task: the test-writer sub-agent writes failing tests from the spec scenarios first, then implement, then lint, typecheck and test, then one commit `type(scope): description (DEV-1013)`.

## 1. Task create and edit forms

- [x] 1.1 Add `createTask`/`updateTask` clients and a shared `TaskFormDialog` (create on the task list, edit on the detail page) with shared-schema validation, due-date rule and 400/403/409 display; verify the "Create task form" and "Edit task form" scenarios pass in Vitest.

## 2. Comments

- [x] 2.1 Add the comments API client and `CommentsPanel` list (oldest first, pagination, loading/empty/error) and add-comment form; verify the "Comment list" and "Add comment" scenarios pass.
- [ ] 2.2 Add edit and delete with the permission helper (edit author only, delete author or OWNER, confirmation, 403, archived read-only); verify the "Edit comment", "Delete comment" and "Comments are read-only on archived items" scenarios pass.

## 3. Activity history

- [ ] 3.1 Add the activity API client and `ActivityPanel` with `describeActivity` (newest first, pagination, member names, states) and invalidate it after task mutations; verify the "Activity history" scenarios pass.

## 4. Lighthouse and docs

- [ ] 4.1 Add the task detail page and its stub routes (task, comments, activity) to `scripts/lighthouse.mjs` and update the page list in `frontend/CLAUDE.md`; verify `pnpm lighthouse` scores at least 95 in every category.

## 5. Verification

- [ ] 5.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1013-comments-activity-ui --strict`; verify all pass.

## Workflow follow-up

- Run /opsx:verify, then the reviewer sub-agent; save its findings to `review-log.md`.
- After Gate 2, run /opsx:sync and /opsx:archive on the feature branch and append the row to `docs/traceability.md`.
