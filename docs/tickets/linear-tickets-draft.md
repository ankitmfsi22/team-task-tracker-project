# Linear tickets draft (creation approved by Kush, Rule 17)

Creation in Linear approved; see `docs/tickets/README.md` for the Assignment ID → Linear key mapping. Sources: `docs/FRS.md`, `docs/SDS.md`, `docs/reference/ASSIGNMENT.md` (AS).
Dependencies follow the AS section 6 order; `[PARALLEL]` is marked only where AS marks it.

---
## [DEV-1001] Project setup — monorepo, Docker Compose, Prisma, OpenSpec, project instructions and quality checks
- Requirement: AS §2, §3, §7 Rules 19, 21; FRS NFR-1, NFR-2, NFR-3, NFR-5, NFR-8, NFR-9
- Acceptance criteria:
  1. pnpm workspaces with `backend/`, `frontend/`, `packages/shared/`; `pnpm build|lint|typecheck|test` run and pass.
  2. `docker compose up` starts PostgreSQL 16 with pinned image tags; no `latest` tags or `@latest` deps anywhere.
  3. Prisma configured against Postgres; versions recorded in `docs/VERSIONS.md`.
  4. ESLint + Prettier + Husky pre-commit hook run; a staged lint error blocks the commit.
  5. `.env` is git-ignored; `.env.example` has placeholders only.
  6. OpenSpec initialised; CLAUDE.md/AGENTS.md present.
- Dependencies: none
- Out of scope: any feature code (auth, projects, tasks).

## [DEV-1002] Claude Code setup — skills, hooks, permissions and project instructions
- Requirement: AS §4 (AI workflow), §7 Rule 8
- Acceptance criteria:
  1. Project instructions, skills and hooks are committed under `.claude/` and documented.
  2. Permissions deny reading `.env`/secrets, force-push and push to main; sensitive/destructive actions require approval.
  3. A test attempt at a denied action (e.g. reading `.env`) is blocked and the evidence recorded.
- Dependencies: DEV-1001
- Out of scope: agent definitions (DEV-1003).

## [DEV-1003] Autonomous agents — implementation, testing, independent review and coordination
- Requirement: AS §7 Rules 6, 7, 23, 24
- Acceptance criteria:
  1. Agents defined for implementation, test writing, review and coordination, each with scope, permitted actions, expected outputs and restrictions.
  2. Reviewer agent is read-only and compares the diff to the approved spec and test evidence, not the implementer's summary.
  3. Reviewer findings are saved verbatim in the change's `review-log.md`.
  4. Demonstration run shows test-writer producing failing tests before implementation.
- Dependencies: DEV-1002
- Out of scope: production deployment automation (AS §5).

## [DEV-1004] MCP — Context7 and issue-tracker integration, permissions and failure handling
- Requirement: AS §3, §7 Rules 1, 5, 17, 18, 19
- Acceptance criteria:
  1. Context7 and Linear MCP are configured; no tokens committed.
  2. A real ticket lookup via Linear MCP is demonstrated and supported operations documented (`docs/mcp/`).
  3. Failure handling documented/tested for: server unavailable, auth failure, missing ticket, malformed response, unsupported operation.
  4. Creating/updating external tickets requires explicit approval.
  5. Fixture data is labelled and never presented as live data.
- Dependencies: DEV-1002
- Out of scope: custom MCP server (AS §5).

## [DEV-1005] OpenSpec workflow — ticket-to-change traceability, approval gates, verification and archival
- Requirement: AS §7 Rules 1–4, 25, 26; CLAUDE.md workflow
- Acceptance criteria:
  1. Each change links ticket key, branch and spec; folder contains `proposal.md`, `design.md`, `tasks.md`, `specs/`, `approvals.md`, `review-log.md`.
  2. `openspec validate <change> --strict` passes after propose.
  3. No production code is committed before a Gate 1 entry exists in `approvals.md`.
  4. Verify, sync and archive are run in order after merge; Gate 2 entry recorded.
- Dependencies: DEV-1003, DEV-1004
- Out of scope: application feature work.

## [DEV-1006] Authentication — registration, login, logout and token handling
- Requirement: FRS §1 FR-AUTH-1…10; SDS §5, §6
- Acceptance criteria:
  1. Register with unique email + name succeeds; invalid input → 400; duplicate email rejected (FR-AUTH-1/2/8).
  2. Login returns access + refresh JWTs; wrong credentials → generic error that does not reveal which field (FR-AUTH-3/4).
  3. Logout revokes the refresh token; its later use is rejected (FR-AUTH-5).
  4. Refresh issues a new access token; invalid, expired or revoked token rejected (FR-AUTH-6).
  5. Passwords stored hashed only and never returned or logged (FR-AUTH-7).
  6. Protected endpoint without/with invalid/expired access token → 401 (FR-AUTH-9).
- Dependencies: DEV-1005
- Out of scope: OAuth/social login, email delivery.

## [DEV-1007] Projects — CRUD, membership and access control [PARALLEL after approved contracts]
- Requirement: FRS §2 FR-PRJ-1…8; FR-AUTH-10; SDS §6
- Acceptance criteria:
  1. Creator becomes OWNER; list returns only caller's projects, archived hidden by default (FR-PRJ-1/7).
  2. Member can view; non-member → 404 for project and its tasks/comments/activity (FR-PRJ-2).
  3. Only OWNER can update, archive, add/remove members; MEMBER attempt → 403 (FR-PRJ-3/4/5/6).
  4. Last owner cannot be removed; archived project is read-only and rejects new tasks/comments.
  5. Nonexistent project → 404; invalid input → 400 (FR-PRJ-8).
- Dependencies: DEV-1006 [PARALLEL]
- Out of scope: tasks and comments logic.

## [DEV-1008] Tasks — CRUD, assignment, status, priority and deadlines [PARALLEL after auth and API contracts]
- Requirement: FRS §3 FR-TSK-1…6
- Acceptance criteria:
  1. Member creates task (title, optional description, status, priority, optional dueDate) in a non-archived project; non-member → 404.
  2. Assignee must be a current project member, otherwise 400 (FR-TSK-3).
  3. Allowed transitions only: TODO→IN_PROGRESS; IN_PROGRESS→TODO/IN_REVIEW; IN_REVIEW→IN_PROGRESS/DONE; DONE→IN_PROGRESS; others → 409.
  4. dueDate in the past on create/update → 400; unchanged existing dueDate accepted.
  5. Any member can archive (soft delete); archived task cannot be edited.
  6. Invalid input → 400; nonexistent task → 404.
- Dependencies: DEV-1006 + approved DEV-1007 API contract [PARALLEL]
- Out of scope: list filtering/pagination (DEV-1009), comments.

## [DEV-1009] Task filtering — pagination, sorting and filtering
- Requirement: FRS §4 FR-FLT-1…5; SDS §4
- Acceptance criteria:
  1. Filter by status, priority, assignee and due-date range.
  2. Sort by status, priority, assignee, dueDate, asc/desc.
  3. Pagination `page`/`pageSize` (default 20, max 100); response includes `meta` with page, pageSize, total, totalPages.
  4. Invalid filter, sort or pagination values → 400.
  5. Non-member project → 404; archived tasks excluded unless `includeArchived` is set.
- Dependencies: DEV-1008
- Out of scope: full-text search.

## [DEV-1010] Comments and activity history
- Requirement: FRS §5 FR-CMT-1…5, FR-ACT-1…3
- Acceptance criteria:
  1. Member adds comment; non-member → 404; empty comment → 400.
  2. Author can edit and delete own comment; other member → 403; project owner may delete any comment.
  3. Activity recorded on task creation, assignment, status change and archive, with actor, action, timestamp and old/new metadata.
  4. Activity history visible to members only; non-member → 404; entries are append-only.
  5. Comment edits/deletes are not recorded as activity.
- Dependencies: DEV-1008
- Out of scope: file attachments, real-time updates.

## [DEV-1011] Frontend — authentication and project pages [PARALLEL after API contracts]
- Requirement: FRS §6 FR-FE-1, 2, 3, 8, 9, 10
- Acceptance criteria:
  1. Register, login and logout pages work against the API; access token in memory, refresh via httpOnly cookie.
  2. Unauthenticated access to protected routes redirects to login.
  3. Pages to list, create, view, update, archive projects and manage members.
  4. Loading, empty and error states shown, including 401/403/404.
  5. Unauthorized actions are hidden or disabled; types/Zod schemas come from `packages/shared`.
- Dependencies: DEV-1006 + DEV-1007 API contract [PARALLEL]
- Out of scope: task pages.

## [DEV-1012] Frontend — task list, filters and detail pages [PARALLEL after API contracts]
- Requirement: FRS §6 FR-FE-4, 5, 8, 9, 10
- Acceptance criteria:
  1. Task list with filter, sort and pagination controls using TanStack Query.
  2. Task detail page shows status, priority, assignee, due date.
  3. Loading, empty and error states, including 401/403/404.
  4. Non-authorized actions hidden or disabled.
- Dependencies: DEV-1008 + DEV-1009 API contract [PARALLEL]
- Out of scope: task editing, comments (DEV-1013).

## [DEV-1013] Frontend — comments, activity history and task editing
- Requirement: FRS §6 FR-FE-6, 7, 8, 10
- Acceptance criteria:
  1. Create/edit tasks with assignee, status, priority and due date; invalid transition (409) and past date (400) errors shown.
  2. Add, edit, delete comments; edit/delete only offered to authorized users; 403 handled.
  3. Activity history shows actor, action, timestamp and change metadata.
- Dependencies: DEV-1010, DEV-1012
- Out of scope: real-time updates.

## [DEV-1014] Git worktrees — parallel development, integration and conflict resolution
- Requirement: AS §7 Rules 9, 10, 11
- Acceptance criteria:
  1. Separate worktrees/branches (`feature/{domain}/DEV-XXXX-{name}`) used for the `[PARALLEL]` tickets.
  2. Shared contracts approved before parallel work starts.
  3. Branch integration with at least one conflict resolved and documented, followed by passing build/lint/typecheck/test.
- Dependencies: DEV-1005 (evidence collected during DEV-1007/1008/1011/1012)
- Out of scope: new feature work.

## [DEV-1015] Codebase graph setup — Code Review Graph and Graphify, generation, queries and token-efficiency evaluation
- Requirement: AS §7 Rules 12–16
- Acceptance criteria:
  1. Both tools installed per official docs; versions and setup steps recorded.
  2. Graph generated; targeted queries for relevant files, dependencies, call relationships and affected tests demonstrated.
  3. Baseline vs graph-assisted comparison for ≥1 task and ≥1 review: tokens/context, files examined, time, findings, with method and limitations.
  4. Key graph findings confirmed against source; no unsupported reduction claims.
  5. If a tool is unavailable/incompatible, issue documented and alternative approved.
- Dependencies: DEV-1006
- Out of scope: custom graph tooling.

## [DEV-1016] Testing — unit, integration, authorization, regression and end-to-end tests
- Requirement: FRS NFR-4, NFR-5, NFR-6, NFR-7, NFR-7a; SDS §8
- Acceptance criteria:
  1. Vitest unit tests (validation, status transitions, permissions) and Supertest integration tests on a test PostgreSQL DB.
  2. Error and authorization-denied cases covered (400, 401, 403, 404, 409).
  3. Frontend component tests for forms and permission-based UI states.
  4. Playwright journey: register → project → task → comments → activity.
  5. Lighthouse ≥95 (Performance, Accessibility, Best Practices, SEO) on login, project list and task list, measured on the production build.
- Dependencies: DEV-1013
- Out of scope: load/performance testing beyond Lighthouse.

## [DEV-1017] Independent review — specification compliance, security, graph-assisted impact analysis and test coverage
- Requirement: AS §7 Rules 7, 14, 16, 23, 24
- Acceptance criteria:
  1. Review in a fresh context against the approved spec and test evidence.
  2. Covers spec compliance, security (secrets, auth/tokens, membership checks), test coverage.
  3. Impact radius and affected tests checked via Code Review Graph, confirmed against source.
  4. Findings saved verbatim in `review-log.md`; blocking findings fixed; accepted non-blocking ones documented.
- Dependencies: DEV-1016
- Out of scope: fixing non-blocking findings.

## [DEV-1018] Final integration — end-to-end user journey, issue-to-PR traceability and workflow demonstration
- Requirement: AS §8, §9, §7 Rules 21, 26; FRS NFR-5, NFR-6
- Acceptance criteria:
  1. `pnpm build`, `lint`, `typecheck`, `test` and Playwright journey all pass on the integrated branch.
  2. PR links issue, OpenSpec change, requirements, tests, review findings and deviations.
  3. Verify, sync and archive completed; Gate 2 recorded.
  4. Submission items (AS §9) assembled, including demo and retrospective.
- Dependencies: DEV-1017
- Out of scope: new features; autonomous production deployment.
