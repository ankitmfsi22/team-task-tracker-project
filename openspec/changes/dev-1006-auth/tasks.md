# Tasks

Ticket: DEV-1006 (Linear DEV-10). One commit per task: `type(scope): description (DEV-1006)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1.

## 1. Shared contract (first, unblocks DEV-1011)

- [x] 1.1 Add `zod` 4.6.7 to `packages/shared`; define auth schemas, inferred types and the error shape; build `dist`. Verify: shared unit tests cover valid and invalid register and login input (spec: User registration, Login issues tokens).
- [x] 1.2 Generate the OpenAPI 3.1 document for the five auth routes from the schemas. Verify: unit test checks the `3.1` version, the five paths and that request schemas equal `z.toJSONSchema` output (spec: Shared contracts and OpenAPI document).

## 2. Database and Compose

- [x] 2.1 Add `@prisma/client` and `@prisma/adapter-pg`; add `User` and `RefreshToken` models and the migration; run `db-change-checker`; update `scripts/tests/prisma.test.mjs`, `docs/VERSIONS.md`. Verify: `prisma validate` and `migrate deploy` succeed against Compose; confirm `generate` works under D-002 (spec: Prisma connects to PostgreSQL).
- [x] 2.2 Bind Postgres to `127.0.0.1` in `docker-compose.yml`; mark D-008 Fixed in `docs/deviations.md`. Verify: compose test asserts the host IP and a client still connects (spec: Postgres is published on loopback only).

## 3. App skeleton

- [x] 3.1 Add `express`, `cookie-parser`, `supertest` and types; implement `createApp`, config, `AppError`, `validate`, error and 404 handlers, and serve `GET /api/v1/openapi.json`. Verify: Supertest tests for 400 `VALIDATION_ERROR`, 404, 500 without stack, missing-secret startup failure and the served document (specs: Unknown routes, Separate signing secrets, Shared contracts).

## 4. Auth endpoints

- [ ] 4.1 Add `@node-rs/argon2` and `jose`; implement register, login and `authenticate` plus `GET /auth/me`. Verify: integration tests for 201, 400, 409 (case-insensitive), argon2id stored hash, generic 401 for both wrong-credential cases, cookie flags, `me` 200 and 401 for missing, malformed, wrong-secret, expired and refresh-as-access tokens, and no secrets in output or logs (specs: registration, hashed passwords, login, protected endpoints).
- [ ] 4.2 Implement refresh rotation and logout. Verify: integration tests for rotation, reuse of a rotated token and a logged-out token (401), invalid, expired and missing cookie (401), only the hash stored, logout 204 with and without a token (specs: Refresh rotates, Refresh tokens are stored hashed, Logout revokes).

## 5. Verification

- [ ] 5.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1006-auth --strict`; run `security-auditor`; record new deviations in `docs/deviations.md`.
