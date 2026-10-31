---
name: api-conventions
description: REST API conventions for this project (/api/v1, status codes, error shape, pagination, sorting, validation, authorization). Use when adding or changing backend routes, controllers, services, or shared Zod schemas.
---

# API conventions

Source of truth: `docs/SDS.md` sections 4 and 6, `AGENTS.md`. Follow them; do not invent alternatives.

## Routes and layers
- Base path `/api/v1` only. The OpenAPI 3.1 document is generated from the shared Zod schemas.
- Layers: routes → controllers → services → Prisma. Business logic lives in services only.
- A `validate` middleware using Zod schemas from `packages/shared` validates every body, param and query before handlers. Never redefine schemas or types outside `packages/shared`.

## Status codes
- 400 validation, 401 unauthenticated, 403 forbidden (member lacks permission), 404 not found (including non-members), 409 conflict.

## Error shape
`{ "error": { "code": string, "message": string, "details"?: unknown } }`

## Pagination and sorting
- `?page=1&pageSize=20` (default 20, max 100).
- Response: `{ "data": [...], "meta": { "page", "pageSize", "total", "totalPages" } }`.
- Sorting: `?sortBy=<field>&sortOrder=asc|desc`.

## Authorization (roles OWNER, MEMBER, scoped per project)
- Project-access middleware loads membership (404 for non-members) and checks the role (403).
- Resource-level ownership checks (for example comment author) happen in services.
- Update/archive project and add/remove members: OWNER only. Edit comment: author only. Delete comment: author, or OWNER.

## Every endpoint needs tests for
Validation failure (400), unauthenticated (401), authorization-denied (403/404) and the happy path.
