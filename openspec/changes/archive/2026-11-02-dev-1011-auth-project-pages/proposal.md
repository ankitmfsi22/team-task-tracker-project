# Proposal

Ticket: DEV-1011 (Linear DEV-15, fetched via Linear MCP). Requirements: FRS FR-FE-1, 2, 3, 8, 9, 10 and NFR-7, NFR-7a; SDS sections 5, 6 and 7. Depends on the DEV-1006 and DEV-1007 API contracts (already merged).

## Why

The backend serves auth, projects, tasks, comments and activity, but `frontend/` is a stub. Users cannot register, log in or manage projects. DEV-1012 (task pages) runs in parallel and needs the app shell, API client and test setup first, so the shell is a separately mergeable contract group. `pnpm lighthouse` is still a placeholder although the 95+ target is a team requirement.

## What Changes

- Group 1, FRONTEND CONTRACT (merged first; DEV-1012 builds on it): Vite + React 19 app, Tailwind CSS and shadcn/ui components, router with layout and protected-route guard, typed API client (shared Zod schemas, error shape, refresh once on 401), TanStack Query provider, Vitest + Testing Library setup, and a real `pnpm lighthouse`.
- Group 2, pages: register, login, logout, project list (pagination, `includeArchived`), create, edit and archive project, project detail with members (add, remove, last-owner error), loading, empty and error states (including 401, 403, 404), and actions hidden when the role cannot perform them.
- Access token in memory only; refresh through the httpOnly cookie on load and on a 401 (once). Vite dev and preview proxy `/api` to the backend, so the page and API share one origin (cookie path `/api/v1/auth`, no CORS).
- `pnpm lighthouse` builds, serves with `vite preview`, and audits login and project list (Performance, Accessibility, Best Practices, SEO each at least 95). It replaces the placeholder (MODIFIED requirement in `workspace-quality-gates`).
- New packages (see design.md for exact versions) need approval at Gate 1.

## Capabilities

### New Capabilities
- `web-platform`: app shell, API client, token handling, protected routes, state components, Lighthouse gate.
- `web-auth`: register, login and logout pages.
- `web-projects`: project list, create, edit, archive, detail and members, role-based UI.

### Modified Capabilities
- `workspace-quality-gates`: `pnpm lighthouse` is no longer a placeholder; `pnpm test:e2e` stays one.

## Impact

- Code: `frontend/` (all new source, `vite.config.ts`, `index.html`, `components.json`), `scripts/lighthouse.mjs`, root and frontend `package.json`, `pnpm-lock.yaml`, `scripts/tests/placeholders.test.mjs` (lighthouse case replaced, e2e case unchanged), `docs/VERSIONS.md`, `docs/deviations.md`, `docs/traceability.md` at archive.
- No backend, shared schema or Prisma change. Shared schemas are imported, never redefined.
- Out of scope: task pages (DEV-1012, DEV-1013), Playwright end-to-end (DEV-1016), dark mode, i18n, a task list Lighthouse run (DEV-1012 adds it to the script's page list), change password or profile pages.
- Breaking: none. `pnpm lighthouse` now needs Chrome or Edge installed and exits non-zero below 95.
- Rollback: revert the branch; the backend and shared package are untouched and the placeholder script file stays in the repo.
