# Proposal

Ticket: DEV-1006 (Linear DEV-10). Requirements: FRS FR-AUTH-1..10, SDS sections 4, 5, 6.

## Why

Every later ticket (projects, tasks, comments, frontend auth) needs authenticated users and an Express app to hang routes on. The backend is still a stub: no app, no models, no shared contracts. Doing auth first also settles the shared Zod contracts that the frontend (DEV-1011) depends on. It also closes deviation D-008 (Compose Postgres published on all interfaces).

## What Changes

- Shared contracts in `packages/shared`: Zod schemas and inferred types for register, login, token response, user and the error shape, plus an OpenAPI 3.1 document for the auth routes generated from them.
- Prisma models `User` and `RefreshToken` with a migration; first use of `@prisma/client` (driver adapter for PostgreSQL).
- Express 5 app skeleton: routes, controllers, services, `validate` middleware, `authenticate` middleware, error handler using the SDS error shape.
- Endpoints under `/api/v1/auth`: `register`, `login`, `refresh`, `logout`, `me` (the protected endpoint that proves 401 handling), plus `GET /api/v1/openapi.json`.
- argon2id password hashing; access JWT (15 min, in the response body); refresh JWT (7 days, httpOnly Secure SameSite cookie) with rotation, reuse rejection and SHA-256 hashing in the database.
- Supertest integration tests against the Compose PostgreSQL, including validation-failure and authentication-denied cases.
- Compose publishes Postgres on `127.0.0.1` only (closes D-008).

## Capabilities

### New Capabilities
- `user-auth`: registration, login, refresh rotation, logout and access-token protection, with the shared contracts and OpenAPI document for these routes.

### Modified Capabilities
- `local-dev-environment`: Postgres is bound to loopback only; the "no models, `@prisma/client` absent" requirement changes now that the first models arrive.

## Impact

- Code: `packages/shared/src`, `backend/src`, `backend/prisma`, `docker-compose.yml`, `scripts/tests/prisma.test.mjs`.
- Docs: `docs/VERSIONS.md`, `docs/deviations.md` (D-008 Fixed; new deviations), `.env.example` (new variable names; the human edits it, see D-003).
- New packages (approved at Gate 1, see design.md): `zod`, `express`, `cookie-parser`, `jose`, `@node-rs/argon2`, `@prisma/client`, `@prisma/adapter-pg`; dev: `@types/express`, `@types/cookie-parser`, `supertest`, `@types/supertest`.
- Breaking: none for consumers (no API existed). Developers must run `docker compose up`, apply the migration and set two JWT secrets.
- Rollback: revert the branch; the migration only creates two new tables, so `prisma migrate reset` on a local database restores the previous state. Nothing is deployed.
