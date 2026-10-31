# frontend/CLAUDE.md

React 19 + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Query.

## Patterns
- Server state goes through TanStack Query; do not copy server data into other global state.
- Types and Zod schemas come from `packages/shared`; MUST NOT be redefined here.
- The access token lives in memory only; the refresh token is an httpOnly cookie handled by the backend.
- Unauthenticated users on protected routes are redirected to login.
- Show clear loading, empty and error states, including 401, 403 and 404 responses.
- Hide or disable actions the current user is not authorized to perform (SDS section 6 permission table).
- Task list supports filter, sort and pagination using the API query parameters.
- Lighthouse 95+ on login, project list and task list, measured on the production build (`vite build` + `vite preview`).

## Anti-patterns
- Storing tokens in localStorage or sessionStorage.
- Duplicating API types or Zod schemas instead of importing from `packages/shared`.
- Showing actions the user is not allowed to perform and relying only on the backend 403.
- Fetching in components without TanStack Query.
- Weakening a test to make it pass.

## Tests
- Component (Vitest): forms and permission-based UI states.
- End-to-end (Playwright): register to comments and activity history.
