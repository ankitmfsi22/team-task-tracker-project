# Tasks

Ticket: DEV-1007 (Linear DEV-11). One commit per task: `type(scope): description (DEV-1007)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1. No new packages.

## 1. Contract only (merged first; DEV-1008 and DEV-1011 build on it)

- [x] 1.1 Shared schemas and types in `packages/shared`: `ProjectRole`, project create, update and response, member add and response, project id and member id params, project list query, and `PaginationQuery`/`PaginationMeta` in `common.ts`; add the eight project paths to the OpenAPI document; rebuild `dist`. Verify: shared unit tests for valid and invalid input and for the OpenAPI paths (specs: Shared contracts and OpenAPI paths).
- [x] 1.2 Prisma `ProjectRole`, `Project` and `ProjectMember` models and the migration; run `db-change-checker`; update `scripts/tests/prisma.test.mjs`. Verify: `prisma validate` and `migrate deploy` succeed against Compose (spec: modified Prisma requirement).
- [x] 1.3 `projectAccess` middleware. Verify: Supertest tests on a throwaway route for non-member 404, nonexistent project 404, MEMBER on an OWNER-only route 403, write to an archived project 409, and success setting the membership (spec: Project access rule).

## 2. Project routes (backend, behaviour)

- [x] 2.1 Create, list, get and update project with routes, controller and service. Verify: integration tests for creator becomes OWNER, list shows only own projects and hides archived by default, pagination meta, get 200 for a member and 404 for a non-member, update 200 for OWNER and 403 for MEMBER, 400 for invalid body, id or query (specs: Create, List, View, Update).
- [x] 2.2 Archive project. Verify: integration tests for OWNER 200 and MEMBER 403, hidden from the default list but listed with `includeArchived`, readable, and update or member change on it 409 (spec: Archive and read-only).
- [x] 2.3 Members: list, add and remove with the last-owner rule. Verify: integration tests for OWNER adds by email 201, MEMBER 403, non-member 404, unknown email 404, duplicate 409, invalid 400, remove 204, last owner 409, and a removed user then gets 404 (spec: Members).

## 3. Verification

- [x] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1007-projects --strict`; run `security-auditor`; record new deviations in `docs/deviations.md`.
