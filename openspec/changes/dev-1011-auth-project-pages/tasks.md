# Tasks

Ticket: DEV-1011 (Linear DEV-15). One commit per task: `type(scope): description (DEV-1011)`. Per task: test-writer first, then implement, then lint, typecheck, test. No production code before Gate 1. New packages only as listed in design.md decision 2, after Gate 1 approval.

## 1. FRONTEND CONTRACT (merged first; DEV-1012 builds on it)

- [x] 1.1 Scaffold: Vite 8 + React 19 + TypeScript app in `frontend/` (`index.html`, `main.tsx`, `vite.config.ts` with `/api` proxy for dev and preview, `@/` alias, scripts), Tailwind v4, copied shadcn components and `components.json`, Vitest + jsdom + Testing Library setup with a render helper, `docs/VERSIONS.md` rows. Verify: `pnpm build`, `pnpm typecheck` and a config test for the `server.proxy` and `preview.proxy` `/api` entries (spec: Same-origin proxy).
- [x] 1.2 API client and session: `apiFetch` with shared-schema parsing and `ApiError`, in-memory token, refresh once on 401 with shared in-flight promise, `AuthProvider` with load-time restore and the `ttt.session` hint, TanStack Query provider. Verify: unit tests with mocked `fetch` for the success, error-shape, malformed, 401-refresh-retry, refresh-failure, no-loop, concurrent-401 and no-storage scenarios, and session restore with and without a cookie (specs: Typed API client, Access token in memory, Session restore).
- [x] 1.3 Router, `AppLayout` (nav, logout button slot), `ProtectedRoute`, not-found page, and `LoadingState` / `EmptyState` / `ErrorState` with 403, 404 and retry handling. Verify: component tests for redirect when anonymous, loading before redirect, authenticated skip of `/login`, and state messages (specs: Protected routes, Loading, empty and error states).
- [x] 1.4 Real `pnpm lighthouse`: `scripts/lighthouse.mjs` (build, stub API, `vite preview`, Chrome via `chrome-launcher`, threshold 95 per category, page list array), replace the root `lighthouse` script and the lighthouse case in `scripts/tests/placeholders.test.mjs`; fix whatever the first run reports on `/login` and `/projects` (these pages exist after Group 2, so a minimal login page is used until then and the final run is repeated in 3.1). Verify: `node:test` for threshold logic and missing-browser message; manual run recorded in `docs/evidence/DEV-1011/` (specs: Lighthouse gate, Lighthouse is a real gate).

## 2. Pages (after Group 1)

- [x] 2.1 Register, login and logout pages and API functions in `src/lib/api/auth.ts`. Verify: component tests for valid submit, schema errors without a request, 409 duplicate email, 401 wrong credentials with cleared password, logout success and logout network failure (spec: web-auth).
- [x] 2.2 Project list with pagination and `includeArchived`, create project dialog, `src/lib/api/projects.ts`. Verify: component tests for two pages, archived toggle, empty state, error with retry, create success and invalid name (spec: Project list, Create project).
- [x] 2.3 Project detail with edit, archive confirmation and members (list, add, remove, last-owner error), role-based hiding. Verify: component tests for OWNER, MEMBER and archived views, edit and archive success, 404 and 403 states, add member (success, 404, 409, invalid email), remove member, 409 `LAST_OWNER` (specs: Project detail, Members management, Role-based actions are hidden).

## 3. Verification

- [ ] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm lighthouse` (scores in `docs/evidence/DEV-1011/`) and `openspec validate dev-1011-auth-project-pages --strict`; append deviations to `docs/deviations.md`.
