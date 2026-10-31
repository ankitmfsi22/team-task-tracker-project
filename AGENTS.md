# AGENTS.md

## Project overview
Team Task Tracker: a full-stack app where authenticated users create projects, manage tasks, assign members,
track status, priority and due dates, and view comments and activity history.
Access is role-based and scoped per project (OWNER, MEMBER). Built as a pnpm monorepo.

## Source of truth
- Requirements: `docs/FRS.md`
- Design: `docs/SDS.md`
- Current behaviour: `openspec/specs/`
- `docs/reference/ASSIGNMENT.md` is background only.
- Accepted deviations: `docs/deviations.md` (every ticket appends its deviations).

## Repo structure
- `backend/`: Express 5 REST API, Prisma, PostgreSQL (stub package plus Prisma datasource config; no models yet)
- `frontend/`: React SPA (stub package)
- `packages/shared/`: Zod schemas and TypeScript types (stub package)
- `scripts/`: pinning check (`check-pinning.mjs`), placeholder script and `node:test` tooling tests in `scripts/tests/`
- `docs/`: FRS, SDS, VERSIONS, reference, evidence
- `openspec/`: specs and changes
- `.claude/`: Claude Code commands and skills
- `.github/workflows/`: CI workflow (`ci.yml`)
- `.husky/`: pre-commit hook (lint-staged)
- `docker-compose.yml`: local PostgreSQL 16 (copy `.env.example` to `.env`)

## Tech stack (versions: pinned in docs/VERSIONS.md)
- Frontend: React 19 + TypeScript + Vite
- UI and state: Tailwind CSS + shadcn/ui + TanStack Query
- Backend: Node.js 22 + Express 5 + TypeScript
- Database: PostgreSQL 16 + Prisma ORM
- Auth: JWT access and refresh tokens
- Validation / API: Zod + OpenAPI 3.1
- Testing: Vitest + Supertest + Playwright
- Monorepo: pnpm workspaces
- Quality: ESLint + Prettier + TypeScript + Husky
- Local infrastructure: Docker Compose

## Key commands
- `pnpm build`
- `pnpm lint` (ESLint plus the pinning check)
- `pnpm typecheck`
- `pnpm test` (root `node:test` tooling tests, then each package's Vitest)
- `pnpm test:e2e` (placeholder until DEV-1016)
- `pnpm format` / `pnpm format:check`
- `pnpm lighthouse` (placeholder until DEV-1011)
- `openspec validate --strict`
- Build, lint, typecheck and test MUST all pass at integration checkpoints.

## Architecture patterns
- Backend layers: routes → controllers → services → Prisma. Each layer calls only the next one; business logic lives in services.
- Validation: a `validate` middleware using Zod schemas from `packages/shared` validates every request body, param and query before handlers.
- Authorization: a project-access middleware loads membership (404 non-member) and checks role (403, SDS section 6). Resource-level ownership checks (for example comment author) happen in services.
- Frontend: TanStack Query for server state; reuse types and Zod schemas from `packages/shared`.

## Coding standards
- TypeScript strict mode.
- No `any`.
- No `@ts-ignore`.
- No `eslint-disable` without a ticket ID.
- Conventional commits that reference the ticket key (for example `feat(auth): add login (DEV-1006)`).
- Commit scopes: auth, projects, tasks, comments, activity, web, shared, infra, docs.
- Pin versions. Never use `@latest` or unpinned Docker images.

## Auth approach
- Access JWT and refresh JWT are issued at login.
- Passwords are hashed with argon2id.
- Access token lifetime 15 minutes; refresh token lifetime 7 days; separate signing secrets.
- Access token lives in frontend memory only; refresh token in an httpOnly, Secure, SameSite cookie.
- Each refresh issues a new refresh token and revokes the old one; reuse of a revoked token is rejected.
- Refresh tokens are stored hashed in the database. Logout revokes the current refresh token.

## API conventions
- Base path and version: `/api/v1` only.
- OpenAPI 3.1 document is generated from the shared Zod schemas.
- Status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found (including non-members), 409 conflict.
- Error shape: `{ "error": { "code", "message", "details"? } }`.
- Pagination: `?page=1&pageSize=20` (default 20, max 100); response `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- Sorting: `?sortBy=<field>&sortOrder=asc|desc`.

## DB schema summary
- User: id, email (unique), name, passwordHash.
- RefreshToken: userId, tokenHash, expiresAt, revokedAt.
- Project: name, description, archivedAt.
- ProjectMember: projectId, userId, role (unique pair).
- Task: projectId, title, description, status, priority, dueDate, assigneeId, createdById, archivedAt.
- Comment: taskId, authorId, body.
- Activity: taskId, actorId, action, metadata (JSON), createdAt.
- UUID ids; status, priority and role are enums; projects and tasks are soft-deleted via `archivedAt`.

## Testing approach
- Unit (Vitest): validation, status transitions, permission checks.
- Integration (Vitest + Supertest): API against a test PostgreSQL database, including error and authorization-denied cases.
- Frontend component (Vitest): forms and permission-based UI states.
- End-to-end (Playwright): full user journey from register to comments and activity.
- Lighthouse 95+ on main pages, measured on the production build (`vite build` + `vite preview`).

## Anti-patterns
- Inventing packages or dependencies not listed in the tech stack or `docs/VERSIONS.md`.
- Business logic in the wrong layer (for example in routes or controllers instead of services).
- Weakening or deleting tests to make them pass.
- Missing ownership or membership checks on project-scoped resources.
- Secrets in code, logs or committed `.env` files.
- Redefining Zod schemas or types outside `packages/shared`.

## Shared packages rule
All Zod schemas and TypeScript types used by more than one package MUST live in `packages/shared`.
Backend and frontend import them and MUST NOT redefine them.

## Workflow
Feature, API and schema work follows OpenSpec (/opsx:*). Claude-specific rules: CLAUDE.md.
