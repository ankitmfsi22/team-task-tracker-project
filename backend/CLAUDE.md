# backend/CLAUDE.md

Node.js 22 + Express 5 + TypeScript, Prisma, PostgreSQL 16. Base path `/api/v1`.

## Patterns
- Layers: routes → controllers → services → Prisma. Each layer calls only the next one.
- Business logic lives in services. Controllers only translate HTTP to service calls and back.
- A `validate` middleware validates body, params and query with Zod schemas from `packages/shared`.
- A project-access middleware loads membership (404 non-member) and checks role (403).
- Resource-level ownership checks (for example comment author) happen in services.
- Errors use `{ "error": { "code", "message", "details"? } }` with status codes 400, 401, 403, 404, 409.
- Lists use `?page&pageSize` (default 20, max 100) and `?sortBy&sortOrder`; response `{ data, meta }`.
- Passwords use argon2id. Refresh tokens are stored hashed and rotated on every refresh.
- JWT signing secrets come from environment variables only.
- Projects and tasks are soft-deleted via `archivedAt`; comments are hard-deleted.
- Record an Activity entry on task creation, assignment, status change and archiving.

## Anti-patterns
- Business logic or Prisma calls in routes or controllers.
- Validating inline or skipping the `validate` middleware.
- Defining Zod schemas or types in `backend/` that belong in `packages/shared`.
- Project-scoped queries without a membership check.
- Returning 403 to a non-member (MUST be 404).
- Logging or returning password hashes, tokens or secrets.

## Tests
- Unit (Vitest): validation, status transitions, permission checks.
- Integration (Vitest + Supertest) against a test PostgreSQL database, including authorization-denied and validation-failure cases.
