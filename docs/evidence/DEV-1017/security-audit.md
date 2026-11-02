# Security audit of main (verbatim sub-agent report)

- Agent: `security-auditor` (read-only, fresh context), DEV-1017 task 1.1
- Reviewed commit: `d2f5bde` (code identical to `main`)

Security audit of main: no blocking findings. `pnpm audit --prod` ran and reported "No known vulnerabilities found". I read only source files and by-name checks. I did not read `.env.example` content or any `.env` file.

| Severity | file:line                                                                                      | Issue                                                                                                                                                                                                                                                                                                            | Fix                                                                                                                                                        | Blocking |
| -------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Medium   | backend/src/routes/auth.routes.ts:12-15 and backend/src/app.ts:25-58                           | There is no rate limiting or brute-force throttling on `/auth/login`, `/register` or `/refresh`. No security-header middleware (such as helmet) is present either; only `x-powered-by` is disabled at app.ts:27.                                                                                                 | Add per-IP and per-account rate limiting on the auth routes, and set security headers. Adding a package needs approval, so raise it as a follow-up ticket. | no       |
| Low      | backend/src/config.ts:17-22                                                                    | JWT secrets are checked only for presence. There is no minimum length, and nothing stops the access and refresh secrets being identical. If they were equal, `typ` is the only thing separating the token types.                                                                                                 | Require at least 32 characters and reject equal access and refresh secrets in `loadConfig`.                                                                | no       |
| Low      | backend/src/services/auth.service.ts:49                                                        | `/register` returns 409 "Email is already registered", so it confirms which emails have accounts. Login itself does not leak this (see the checked bullets).                                                                                                                                                     | Accept as a known trade-off, or return a generic response.                                                                                                 | no       |
| Low      | backend/src/services/projects.service.ts:113-114                                               | OWNER-only add-member returns 404 "No registered user with that email". An owner can use it to test whether an email is registered.                                                                                                                                                                              | Accept, or add the member silently.                                                                                                                        | no       |
| Low      | backend/src/services/auth.service.ts:71-86                                                     | Presenting a revoked refresh token returns 401 (reuse is rejected), but the user's other live refresh tokens are not revoked. A stolen token that was already rotated does not trigger a family revoke.                                                                                                          | Optionally revoke all of the user's refresh tokens when a revoked token is presented.                                                                      | no       |
| Low      | backend/src/middleware/validate.ts:22-24 and backend/src/controllers/projects.controller.ts:26 | `validate` checks `req.query` but does not replace it. Controllers re-parse it with `Schema.parse` (projects.controller.ts:26, comments.controller.ts:23, tasks.controller.ts:30, activity.controller.ts:9). Validation currently holds, but a new route that forgets the re-parse would read raw query strings. | Add a lint or test convention, or store the parsed query in `res.locals`.                                                                                  | no       |
| Low      | backend/src/app.ts:28                                                                          | `express.json()` uses default options (100kb body limit), and there is no trust-proxy setting. Both are acceptable now.                                                                                                                                                                                          | Revisit trust-proxy when rate limiting is added behind a proxy.                                                                                            | no       |
| Info     | backend/src/services/tasks.service.ts:190-203                                                  | Any project member, not only an OWNER, can edit, assign or archive any task. This is a design choice, and I did not check it against FRS or SDS.                                                                                                                                                                 | Confirm it against docs/FRS.md.                                                                                                                            | no       |

**Checked, no issue**

1. Secrets
   - `.gitignore:6-8` ignores `.env` and `.env.*` and keeps `.env.example`. The only env-named tracked file is `.env.example` (plus OpenSpec spec paths that merely contain the words).
   - docker-compose.yml:6 requires `POSTGRES_PASSWORD` from the environment with no default.
   - ci.yml has no secrets and sets `permissions: contents: read`.
   - The only secret reads are in `backend/src/config.ts:19-21` (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`).
   - The only console calls in backend `src`, outside tests, are the two in main.ts:7 and main.ts:9 (listening port and startup error message). Nothing logs tokens or hashes.
   - I did not scan docs, test fixtures or git history for secrets.

2. Auth and tokens
   - Hashing uses `@node-rs/argon2` `hash` and `verify` (auth.service.ts:1,41). The code comment at auth.service.ts:14 says the library default is argon2id; I did not confirm that against the library.
   - Access tokens last 15m and refresh tokens 7d (token.service.ts:5-6), signed with separate secrets (token.service.ts:21,31).
   - The algorithm is pinned: HS256 on sign and `algorithms: ['HS256']` on `jwtVerify` (token.service.ts:41). The `typ` claim is checked on both token types (token.service.ts:42).
   - Refresh tokens are stored as a SHA-256 hash (token.service.ts:55, auth.service.ts:106).
   - Refresh rotation is atomic. The revoke is a conditional `updateMany` on `revokedAt: null` and an unexpired token inside a transaction, and a count other than 1 gives 401 (auth.service.ts:74-86).
   - Logout revokes the presented token and clears the cookie (auth.service.ts:90-95, auth.controller.ts:57-62).
   - The cookie is `httpOnly`, `secure: true`, `sameSite: 'strict'`, with `path` `/api/v1/auth` and `maxAge` of 7 days (auth.controller.ts:11-17).
   - Login returns one generic 401 for both unknown email and wrong password, and verifies against a dummy hash for unknown emails (auth.service.ts:15,56-59).
   - Responses never include `passwordHash` or tokens beyond the access token. `toUser` returns only id, email and name (auth.service.ts:25).
   - Frontend: the access token is a module variable (frontend/src/lib/auth/token.ts:1-10). `localStorage` holds only the session hint flag (frontend/src/lib/auth/auth-context.tsx:30-39). The API client uses `credentials: 'same-origin'` (frontend/src/lib/api/client.ts:56).

3. Membership and authorization
   - Every project-scoped route runs `authenticate`, `validate`, then `projectAccess`: projects.routes.ts:26-56, tasks.routes.ts:28-76, comments.routes.ts:26-53, activity.routes.ts:19-25.
   - `projectAccess` returns 404 for a missing project or a non-member, then 403 for the wrong role, then 409 for a write to an archived project (project-access.ts:31-42).
   - OWNER-only routes: project update, archive, add member and remove member (projects.routes.ts:34,40,48,54).
   - The last-owner check runs in a serializable transaction (projects.service.ts:130-146).
   - IDOR: tasks are always looked up with `{ id, projectId }` (tasks.service.ts:267, comments.service.ts:113, activity.service.ts:35). Comments are scoped by `{ id: commentId, taskId }` after the task check (comments.service.ts:132).
   - Comment edit is author-only, even for an OWNER (comments.service.ts:79). Delete is author or OWNER (comments.service.ts:100).
   - Archived tasks cannot be written (tasks.service.ts:261, comments.service.ts:123).
   - The assignee must be a project member on create and on assign (tasks.service.ts:37,143,272-277).
   - Mass assignment is blocked by strict schemas on task and comment bodies (tasks.ts:24,32-34,44,46; comments.ts:7,9) and by explicit field mapping in the services (tasks.service.ts:126-131, projects.service.ts:78-82).
   - Project list is limited to the caller's own memberships (projects.service.ts:46).

4. Dependencies
   - `pnpm audit --prod` reported no known vulnerabilities.
   - CI also runs `pnpm audit --audit-level=high` (ci.yml:30).
   - A grep of the root, backend, frontend and shared `package.json` files for range specifiers and `latest` found none.
   - docker-compose uses the pinned image `postgres:16.15-alpine`.

5. Input validation and error handling
   - Every route with a body, param or query is validated by shared Zod schemas before its handler: UUID params, string length caps, pagination `pageSize` max 100 (common.ts:4-5), and enum and strict schemas.
   - The `/auth/refresh` and `/auth/logout` routes take no body and read only the cookie (auth.routes.ts:14-15).
   - Validation failures return 400 with the Zod issues in `details` (validate.ts:27).
   - The error handler returns `AppError`s as-is, malformed JSON as 400, and anything else as a generic 500 "Internal server error". It leaks no stack trace or Prisma error (error-handler.ts:21-31).
   - The 404 catch-all is generic (error-handler.ts:9-11).
