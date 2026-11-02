# Review log

- Change: dev-1013-comments-activity-ui (DEV-1013)
- Reviewer: reviewer sub-agent (read-only, fresh context)
- Context: fresh
- Date: 2026-11-02

Result: no Blocking findings. Non-blocking findings are accepted deviations (CLAUDE.md), recorded in `docs/deviations.md` as D-112 to D-115.

## Disposition

| Severity     | file:line                                                         | Issue                                                                                              | Fix                                     | Status         |
| ------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------- | -------------- |
| Non-blocking | comments-panel.tsx:258-266, :283-292                              | Page jump after add or after deleting the last item of a later page uses the cached `meta.total`   | None in this change                     | Accepted (D-112) |
| Non-blocking | task-detail.tsx:197-202                                           | A failed project query leaves `archived` false, so the add form shows; the server 409 is the guard | None in this change                     | Accepted (D-113) |
| Non-blocking | comments-panel.tsx:70-76, :108-134                                | The edit form stays open if `canEdit` turns false; the server rejects Save                         | None in this change                     | Accepted (D-112) |
| Non-blocking | task-form-dialog.tsx:107-114                                      | A due-date 400 is detected by the string "dueDate" in the server message and details               | None in this change                     | Accepted (D-113) |
| Non-blocking | task-form-dialog.tsx:70-75                                        | A stored whitespace-only description compares unequal to `''`, so Save sends `description: null`   | None in this change                     | Accepted (D-112) |
| Non-blocking | docs/deviations.md                                                | DEV-1013 deviations were not yet recorded                                                          | D-112 to D-115 appended                 | Fixed          |
| Non-blocking | task-detail-actions.test.tsx:255-257, :295-297, :310-312          | Archived-notice queries made stricter; not a weakening                                             | None                                    | No change needed |

## Reviewer report (verbatim)

Change: dev-1013-comments-activity-ui (branch feature/web/DEV-1013-comments-activity-ui, diff db978a0..HEAD)
Reviewer: independent read-only reviewer sub-agent
Date: 2026-11-02
I read the diff and the code. I did not run pnpm test.

Findings (no BLOCKING issues found)

1. NON-BLOCKING, frontend/src/components/comments-panel.tsx:258-266 (create onSuccess) and :283-292 (onDeleted)
   - Description: the page jump after adding a comment and after deleting the last item of a later page is computed from the current page's cached `meta.total`. If another user added a comment meanwhile, the jump can land one page short. No test covers either edge case: the add test only uses a single page, and no test deletes the last item of page 2. The spec scenarios do not require them, but the review brief asks about them.
   - Recommendation: accept as a deviation, or add one test for each edge case. Optionally clamp the page against the refetched `totalPages`.

2. NON-BLOCKING, frontend/src/pages/task-detail.tsx:197-202
   - Description: `archived` is `task.archivedAt !== null || (project?.archivedAt ?? null) !== null`. If the project query errors, `project` is undefined, so the add form shows on a project that may be archived. The server's 409 is then the only guard, and the UI shows a message for it. This is the same failure mode as the accepted "OWNER sees no Delete" item, but in the permissive direction.
   - Recommendation: treat a project query error as "unknown" and hide the comment form and actions, or record it as an accepted deviation.

3. NON-BLOCKING, frontend/src/components/comments-panel.tsx:70-76 and :108-134
   - Description: the edit form stays open when `canEdit` turns false. The `editing` state is local and is not cleared when `archived` or the user changes. The Save button is then not guarded, though the server would reject it with 409 or 403 and the UI shows that. The risk is low.
   - Recommendation: render the edit form only when `editing && canEdit`.

4. NON-BLOCKING, frontend/src/components/task-form-dialog.tsx:107-114
   - Description: a 400 for the due date is detected by searching for the string "dueDate" in the server message and details. When it matches, the raw server message is shown in the field. Any other 400 message is shown raw in the form alert. The behaviour is correct for the spec but depends on the backend's wording.
   - Recommendation: accept, or map the field from `details` explicitly.

5. NON-BLOCKING, frontend/src/components/task-form-dialog.tsx:70-75
   - Description: in edit mode, a stored whitespace-only description compares unequal to `''`. Saving then sends `description: null` even though the user did not edit it. This is an edge case, and the task would be updated harmlessly.
   - Recommendation: compare trimmed values.

6. NON-BLOCKING, docs/deviations.md (diff)
   - Description: the only addition is D-111, which is a DEV-1012 row. The accepted DEV-1013 deviations listed in the task brief are not yet in `docs/deviations.md`. This is not a code defect.
   - Recommendation: append the DEV-1013 rows at PR time, as CLAUDE.md requires.

7. NON-BLOCKING, frontend/src/pages/task-detail-actions.test.tsx:255-257 and :295-297, :310-312
   - Description: the assertions changed from `/Archived/` to `/Archived: this (task|project) is read-only/`. This is not a weakening. The old regex would now match several elements, because the comments panel also shows an "Archived" notice. The new regex is stricter. The added `useAuth` mocks and the comments/activity stub routes in the other test files are additive. I found no removed assertions.
   - Recommendation: none. This is noted for the log.

Checked and fine
- Comment permissions (`lib/comment-permissions.ts`):
  - Edit is author-only, even for an OWNER.
  - Delete is available to the author or an OWNER, and both are false when archived.
  - A MEMBER who is not the author gets no Edit or Delete.
  - The `userId` comes from `useAuth` and the role from the project query; there is no cached or stale role stored in state.
  - Tests cover OWNER with no Edit, MEMBER with no Delete, an OWNER deleting another user's comment, cancelling a delete with no request, a 403 on edit, delete and add, and archived task and archived project.
- Every WHEN/THEN scenario in both spec files has a named test, including these:
  - the list, pagination, empty, 404 and error-retry scenarios;
  - add, invalid body (empty, whitespace, 2001 characters) and add rejected with 403 or 409, with the typed text kept;
  - activity entries, pagination, 403, 404 and 500, plus the archived-task and archived-project cases;
  - the create-form and edit-form scenarios, including an unchanged past date being omitted, clearing the due date sending null, and a 409 on edit reloading the task;
  - the Lighthouse stub test for the task detail page.
- Security:
  - Comment bodies, author names, activity actor names and task titles are rendered as JSX text.
  - There is no `dangerouslySetInnerHTML`, and a plain-text test exists.
  - The new code has no token handling and no secrets.
  - A grep found no `any`, `@ts-ignore` or `eslint-disable` in the frontend source; the only matches were in the lint tooling tests.
- Shared-schema rule: the panels use `Create/UpdateCommentRequestSchema`, `Create/UpdateTaskRequestSchema`, `TaskPrioritySchema`, the list response schemas and the types from `@team-task-tracker/shared`. Nothing is redefined locally. The only extra schema is `z.undefined()` for the 204 response.
- Due-date logic:
  - A date-only value is sent as `T23:59:59Z`.
  - The past-date check compares the date against today in UTC, so today is accepted and the check applies only when the date changed.
  - An unchanged past date is omitted, and clearing the date sends null.
  - The behaviour matches the FRS decision added in the diff.
- Query invalidation:
  - Comments use the `['comments', pid, tid]` prefix, which covers all pages.
  - Status change, assignment, archive and edit invalidate `task`, `tasks` and `activity`.
  - Create invalidates `tasks`.
  - Activity is read-only, with no mutations.
- Lighthouse: the 95 threshold and `RUNS_PER_PAGE = 5` are unchanged. The page list and stub moved to `scripts/lib/lighthouse-pages.mjs` with a unit test. The stub serves the task, comments and activity, and CLS is added to the diagnostics only.
- Deviations from design.md: none found beyond the accepted list. The edit dialog is mounted outside the editable block so a 409 message stays visible after the task reloads, and this is documented in a code comment.
