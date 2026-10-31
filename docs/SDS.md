# System Design Specification (SDS)

Source: docs/reference/ASSIGNMENT.md. `DECISION:` = approved, not in the assignment. `ASSUMPTION:` = not in the assignment, awaiting approval (inline tags included).

## 1. Architecture overview

pnpm workspaces monorepo:

- `backend/`: Node.js 22 + Express 5 + TypeScript REST API, Prisma ORM, PostgreSQL 16.
- `frontend/`: React 19 + TypeScript + Vite SPA (Tailwind CSS, shadcn/ui, TanStack Query).
- `packages/shared/`: Zod schemas and TypeScript types used by both backend and frontend.

Flow: Browser (frontend) calls the backend REST API, which uses Prisma to reach PostgreSQL. Docker Compose runs the local infrastructure.

- DECISION: Backend layers are routes → controllers → services → Prisma. Each layer calls only the next one; business logic lives in services.

## 2. Tech stack

| Layer | Technology | Version |
| --- | --- | --- |
| Frontend | React 19 + TypeScript + Vite | pinned in DEV-1001 (docs/VERSIONS.md) |
| UI and state | Tailwind CSS + shadcn/ui + TanStack Query | pinned in DEV-1001 (docs/VERSIONS.md) |
| Backend | Node.js 22 + Express 5 + TypeScript | pinned in DEV-1001 (docs/VERSIONS.md) |
| Database | PostgreSQL 16 + Prisma ORM | pinned in DEV-1001 (docs/VERSIONS.md) |
| Authentication | JWT access and refresh tokens | pinned in DEV-1001 (docs/VERSIONS.md) |
| Validation / API | Zod + OpenAPI 3.1 | pinned in DEV-1001 (docs/VERSIONS.md) |
| Testing | Vitest + Supertest + Playwright | pinned in DEV-1001 (docs/VERSIONS.md) |
| Monorepo | pnpm workspaces | pinned in DEV-1001 (docs/VERSIONS.md) |
| Quality | ESLint + Prettier + TypeScript | pinned in DEV-1001 (docs/VERSIONS.md) |
| Local infrastructure | Docker Compose | pinned in DEV-1001 (docs/VERSIONS.md) |

## 3. Database schema summary

Entities, key fields and relations only.

- User: id, email (unique), name, passwordHash, createdAt.
- RefreshToken: id, userId, tokenHash, expiresAt, revokedAt. Many-to-one with User.
- Project: id, name, description, archivedAt, createdAt. 
- ProjectMember: projectId, userId, role. Join of User and Project (unique pair).
- Task: id, projectId, title, description, status, priority, dueDate, assigneeId (nullable), createdById, archivedAt, createdAt, updatedAt. Belongs to Project; assignee is a User who is a ProjectMember.
- Comment: id, taskId, authorId, body, createdAt, updatedAt. Belongs to Task and User.
- Activity: id, taskId, actorId, action, metadata (JSON), createdAt. Belongs to Task and User.

Relations: Project 1..n ProjectMember n..1 User; Project 1..n Task; Task 1..n Comment; Task 1..n Activity.

- DECISION: Soft delete through `archivedAt` for projects and tasks; comments are hard-deleted.
- DECISION: IDs are UUIDs; status, priority and role are enums.
- DECISION: Refresh tokens are stored hashed in the database to support rotation and revocation.

## 4. API conventions

- DECISION: Base path and version: `/api/v1` only (no unversioned `/api` path).
- DECISION: The OpenAPI 3.1 document is generated from the shared Zod schemas.
- All request bodies, params and queries MUST be validated with Zod before reaching handlers.
- DECISION: Validation is done by a `validate` middleware that uses Zod schemas from `packages/shared`.
- DECISION: Status codes: 400 validation, 401 unauthenticated, 403 forbidden (member lacks permission), 404 not found (including non-members), 409 conflict.
- DECISION: Error response shape: `{ "error": { "code": string, "message": string, "details"?: unknown } }`.
- DECISION: Pagination request: `?page=1&pageSize=20`. Response: `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- DECISION: Sorting uses `?sortBy=<field>&sortOrder=asc|desc`.

## 5. Auth approach

- Access JWT and refresh JWT are both issued at login.
- DECISION: Password hashing SHALL use argon2id (salted).
- DECISION: Refresh rotation: each refresh MUST issue a new refresh token and revoke the old one; reuse of a revoked token MUST be rejected.
- Logout MUST revoke the current refresh token.
- Secrets (JWT signing keys) MUST come from environment variables and never be committed.
- DECISION: Access token lifetime 15 minutes; refresh token lifetime 7 days.
- DECISION: Access token is stored in frontend memory only; refresh token is stored in an httpOnly, Secure, SameSite cookie.
- DECISION: Separate signing secrets for access and refresh tokens.

## 6. Authorization model

Roles are scoped per project.

- DECISION: Roles are OWNER and MEMBER, and the table below is the permission set. Non-members get 404 for the project and its tasks, comments and activity; members lacking permission get 403.
- DECISION: A project-access middleware loads the caller's membership (404 if not a member) and checks the role (403 if not allowed). Resource-level ownership checks (for example comment author) happen in services.

| Action | Non-member | MEMBER | OWNER |
| --- | --- | --- | --- |
| Create project | allowed (any authenticated user) | n/a | n/a |
| View project | 404 | allowed | allowed |
| Update / archive project | 404 | 403 | allowed |
| Add / remove members | 404 | 403 | allowed |
| Create / update / archive task | 404 | allowed | allowed |
| Assign task (to a member only) | 404 | allowed | allowed |
| View tasks and activity | 404 | allowed | allowed |
| Add comment | 404 | allowed | allowed |
| Edit comment | 404 | own only (else 403) | own only (else 403) |
| Delete comment | 404 | own only (else 403) | own or any |

## 7. Shared contracts rule

- All Zod schemas and TypeScript types used by more than one package MUST live in `packages/shared`.
- Backend and frontend MUST import these from `packages/shared` and MUST NOT redefine them.
- Contracts MUST be approved before parallel frontend and backend work starts.

## 8. Testing approach

- Unit (Vitest): pure logic such as validation, status transitions and permission checks.
- Integration (Vitest + Supertest): API endpoints against a test PostgreSQL database, including error and authorization-denied cases.
- DECISION: Frontend component tests (Vitest) are included for forms and permission-based UI states.
- End-to-end (Playwright): full user journey from register to comment and activity history.
- Quality gates: `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` MUST pass at integration checkpoints.
