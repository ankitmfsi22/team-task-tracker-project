# Design

## Context

See proposal.md. The backend is a stub (`backend/src/index.ts` exports a name; `schema.prisma` has only a datasource). `packages/shared` is a stub. Prisma 7.10.1 reads `DATABASE_URL` through `prisma.config.ts`; install scripts are denied for `prisma` and `@prisma/engines` (D-002). pnpm 12 applies a release-age cooldown. Library APIs below were checked with Context7 on 2026-10-31 (Express 5.3.0, Prisma 7.10.1, Zod 4.6.5 docs, jose 6.2.13, node-argon2 and `@node-rs/argon2`).

## Goals / Non-Goals

**Goals:** a working, tested auth API; contracts in `packages/shared` first so DEV-1011 can start; an app skeleton the project, task and comment tickets reuse.

**Non-Goals:** OAuth, email, password reset, rate limiting or lockout (follow-up), frontend work, project-access middleware (DEV-1007), CORS configuration (DEV-1011 decides the origin).

## Decisions

1. **Contract first.** `packages/shared` holds Zod schemas (`RegisterRequest`, `LoginRequest`, `AuthTokenResponse`, `UserResponse`, `ErrorResponse`) and inferred types. `packages/shared` is built to `dist` so backend and tests import the package normally.
2. **OpenAPI from Zod without a new library.** Zod 4 has built-in `z.toJSONSchema`. A small function in `packages/shared` assembles an OpenAPI 3.1 object (3.1 uses JSON Schema 2020-12, which is what Zod emits) from those schemas. Alternative: `zod-openapi` or `@asteasolutions/zod-to-openapi`; rejected to avoid another package for five routes.
3. **Packages (exact, Gate 1 approval).** Dates are npm release dates.
   | Package | Version | Where | Why |
   | --- | --- | --- | --- |
   | `zod` | 4.6.7 | shared, backend | schemas, built-in JSON Schema |
   | `express` | 5.3.0 | backend | Express 5 per stack |
   | `cookie-parser` | 1.4.7 | backend | read refresh cookie |
   | `jose` | 6.2.13 (2026-10-20) | backend | HS256 sign and verify, typed errors; 6.2.14 is 2 days old |
   | `@node-rs/argon2` | 2.2.2 | backend | argon2id with prebuilt binaries and no install script, so `allowBuilds` stays untouched |
   | `@prisma/client` | 7.10.1 | backend | matches pinned `prisma` |
   | `@prisma/adapter-pg` | 7.10.1 | backend | Prisma 7 requires a driver adapter |
   | `@types/express` | 5.0.6 | backend dev | types |
   | `@types/cookie-parser` | 1.4.10 | backend dev | types |
   | `supertest` | 7.3.1 | backend dev | integration tests |
   | `@types/supertest` | 7.2.1 | backend dev | types |

   Rejected: `argon2` (needs `node-gyp-build` install script, conflicting with D-002), `jsonwebtoken` (older, callback-oriented), `dotenv` (Node 22 has `--env-file`), `pg` directly (comes with the adapter). All go into `docs/VERSIONS.md`.
4. **Data model.** `User(id uuid, email unique lowercase, name, passwordHash, createdAt)`; `RefreshToken(id uuid, userId FK cascade, tokenHash unique, expiresAt, revokedAt?, createdAt)` with an index on `userId`. Email is lowercased in the shared schema, so uniqueness is case-insensitive. The `db-change-checker` agent reviews the migration.
5. **Tokens.** Access JWT: HS256, 15 min, `sub` = user id, `typ: access`, `JWT_ACCESS_SECRET`. Refresh JWT: HS256, 7 days, `sub`, random `jti`, `typ: refresh`, `JWT_REFRESH_SECRET`. The DB stores SHA-256 of the refresh JWT (the token is high-entropy, so a fast hash is adequate and allows lookup by hash). Verification pins `algorithms: ['HS256']` and checks `typ`, so a refresh token never passes as an access token.
6. **Rotation.** In one transaction: look up the hash, require `revokedAt` null and `expiresAt` future, set `revokedAt`, insert the new row. A revoked or unknown hash gives 401. On reuse we only reject (SDS); revoking the whole token family is a follow-up.
7. **Cookie.** Name `refresh_token`, `httpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/v1/auth`, `Max-Age` 7 days. Secure is always set (browsers treat `localhost` as secure; tests only read the header).
8. **Generic login errors.** Unknown email and wrong password both return 401 `INVALID_CREDENTIALS`; for an unknown email a verify against a fixed dummy argon2id hash keeps timing similar.
9. **Logout** returns 204 whether or not a valid token is presented, so it leaks nothing and is safe to retry.
10. **Skeleton.** `createApp()` (no listen, for Supertest) and `index.ts` starts it. Layers: `routes/auth.routes.ts` → `controllers/auth.controller.ts` → `services/auth.service.ts` → Prisma. Middleware: `validate({ body, params, query })` using shared schemas; `authenticate`; `errorHandler` and a 404 handler. A small `AppError(status, code, message, details?)` maps to the SDS shape; unknown errors become 500 `INTERNAL_ERROR` with no detail. Express 5 forwards rejected promises, so handlers need no try/catch wrapper. Config (`config.ts`) reads `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` and throws naming the missing variable.
11. **Tests.** Vitest unit tests in `shared`; Supertest integration tests in `backend` against the Compose Postgres via `DATABASE_URL` (tables truncated per test file; test secrets set in the test setup, not committed as real values). Tests need `docker compose up -d` and a migrated database.
12. **Compose (D-008).** `ports` becomes `'127.0.0.1:${POSTGRES_PORT:-5432}:5432'`. The test in `scripts/tests/` asserts it, and `scripts/tests/prisma.test.mjs` is updated for the "no models" assertion that this change deliberately reverses.

## Risks / Trade-offs

- Prisma install scripts are denied (D-002); `prisma generate`/`migrate` might need the engines postinstall → verify early in task 2.1; if it fails, ask the human before changing `allowBuilds`.
- No rate limiting, so login can be brute-forced → recorded as a deviation with a follow-up ticket.
- Reuse only rejects, not family revocation → recorded as a deviation.
- Integration tests depend on a running database → documented; CI already needs a Postgres service for these (check `ci.yml` in task 2.1, a CI change is in scope only if tests fail there).
- `.env.example` is human-edited (D-003): the human adds `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` placeholders.

## Migration Plan

Developers: `docker compose up -d`, set the two JWT secrets in `.env`, run `pnpm --filter backend exec prisma migrate deploy`. Rollback: revert the branch and `prisma migrate reset` locally.

## Resolved at Gate 1

- Password length 8 to 128 and name length 1 to 100 are recorded as DECISION lines in `docs/FRS.md` (approved by Ankit Singh).
- Rate limiting is not in FRS scope: deviation D-037. Reuse of a revoked refresh token only rejects that token: D-038.
- `.env.example` already holds the `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` placeholders (added by Ankit Singh).
- No package other than the list above, and no `allowBuilds` change, without asking first.
