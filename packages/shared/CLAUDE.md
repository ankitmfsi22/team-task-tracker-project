# packages/shared/CLAUDE.md

Single home for Zod schemas and TypeScript types used by more than one package.

## Patterns
- All Zod schemas and TypeScript types used by more than one package MUST live here.
- Backend and frontend import from this package and MUST NOT redefine them.
- Define request/response schemas here first, before backend or frontend work starts.
- Contracts MUST be approved before parallel frontend and backend work starts.
- The OpenAPI 3.1 document is generated from these Zod schemas.
- Types are inferred from the Zod schemas rather than written twice.
- Cover the shared shapes: error response `{ error: { code, message, details? } }`, pagination `{ data, meta }`, status, priority and role enums.

## Anti-patterns
- A schema or type duplicated in `backend/` or `frontend/`.
- A hand-written type that can drift from its Zod schema.
- Changing a schema without updating the OpenSpec change and the dependent code.
- Weakening a schema to make a test pass.

## Tests
- Unit (Vitest): schema validation, including invalid-input cases.
