# Graph-assisted impact analysis (DEV-1017, task 2.1)

- Tool: Code Review Graph 2.3.9 (`code-review-graph build`, MCP `get_impact_radius_tool`, depth 2).
- Graph rebuilt at commit `d2f5bde` (HEAD of `feature/infra/DEV-1017-independent-review`; no source change versus `main`, only docs commits). Before the rebuild the index was stale (built at `71307ad` on the DEV-1015 branch). Build result: `208 files, 1881 nodes, 21178 edges`.
- Rule: the graph is a lead; every claim below was confirmed by reading source (`file:line`, paths relative to `backend/src/`).

## 1. Project access: `middleware/project-access.ts`

Graph: 3 nodes changed, 12 impacted, 6 files affected, 0 unresolved call sites.

| Graph claim                                                           | Confirmed in source                                                                                                                                                                                                                    |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createActivityRouter` calls `projectAccess`                          | `routes/activity.routes.ts:23` (`projectAccess(prisma)`)                                                                                                                                                                               |
| `createCommentsRouter` calls it 4 times                               | `routes/comments.routes.ts:30, 37, 44, 51` (writes use `{ write: true }`, list uses none)                                                                                                                                              |
| `createProjectsRouter` calls it 6 times                               | `routes/projects.routes.ts:29, 34, 40, 43, 48, 54` (member and archive routes use `roles: ['OWNER']`)                                                                                                                                  |
| `createTasksRouter` calls it 7 times                                  | `routes/tasks.routes.ts:32, 39, 46, 53, 60, 67, 74`                                                                                                                                                                                    |
| `createApp` is impacted (transitively)                                | `app.ts` mounts the four routers (graph edges `app.ts:39, 42, 46, 50`)                                                                                                                                                                 |
| Affected test: `middleware/project-access.integration.test.ts`        | calls it at lines 36, 45, 54 (graph); test names at `:104` (non-member = nonexistent, 404), `:121` (MEMBER on OWNER route, 403), `:133` (archived write, 409), `:148` (role before archived), `:175` (401), `:182` (malformed id, 400) |
| Every project-scoped route group is behind the middleware (no bypass) | all four route files above; `POST /projects` and `GET /projects` are not project-scoped (`routes/projects.routes.ts:26` `authenticate` only)                                                                                           |

Order of checks confirmed at `middleware/project-access.ts:31` (404), `:35` (403), `:39` (409).
Impact: any change here affects all 4 route groups (about 20 route registrations) and every integration test file that goes through `createApp`.

## 2. Auth and refresh: `services/auth.service.ts`, `services/token.service.ts`, `middleware/authenticate.ts`

Graph: 25 nodes changed, 34 impacted, 26 files affected, 4 unresolved call sites.

| Graph claim                                                                                                                                                                         | Confirmed in source                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAuthController` / `createAuthRouter` depend on `AuthService`                                                                                                                 | `controllers/auth.controller.ts:36`, `routes/auth.routes.ts:9` (type references, see note below)                                                                                                                                                                                      |
| `authenticate` is used by activity, comments, projects, tasks and auth routers                                                                                                      | `routes/activity.routes.ts:21`, `comments.routes.ts:25`, `projects.routes.ts:26` (`router.use`), `tasks.routes.ts:27`, `auth.routes.ts:16` (`/me`)                                                                                                                                    |
| Rotation and logout live in `AuthService`                                                                                                                                           | rotation `services/auth.service.ts:69-84` (conditional `updateMany` on `revokedAt: null`, `count !== 1` is 401), logout `:89-93` (idempotent)                                                                                                                                         |
| `/refresh` and `/logout` have no `authenticate` or `validate` (they read the cookie)                                                                                                | `routes/auth.routes.ts:14-15`; token checked in the service                                                                                                                                                                                                                           |
| Affected tests: `auth.refresh-logout.integration.test.ts`, `auth.register-login.integration.test.ts`, `middleware/project-access.integration.test.ts`, every test using `createApp` | refresh tests confirmed at `auth.refresh-logout.integration.test.ts:98` (rotation), `:155` (reuse 401), `:170` (after logout 401), `:191` (wrong secret), `:201` (expired), `:211` (unknown hash), `:218` (access token as refresh), `:243` (logout), `:281` (other session survives) |

Impact: `authenticate` is the 401 gate for every protected route; a change there affects all five routers. `AuthService` changes affect only `auth.controller.ts` and `auth.routes.ts` and the two auth test files.

## 3. Comment permissions: `services/comments.service.ts`

Graph: 12 nodes changed, 25 impacted, 22 files affected, 62 unresolved call sites.

| Graph claim                                                                                            | Confirmed in source                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createCommentsController` calls `create`, `list`, `update`, `remove`                                  | `controllers/comments.controller.ts:18, 25, 31, 36`                                                                                                                                                                         |
| Author check in `update`                                                                               | `services/comments.service.ts:78-80` (`authorId !== userId` is 403)                                                                                                                                                         |
| `remove`: author or OWNER                                                                              | `services/comments.service.ts:99-105` (403 otherwise)                                                                                                                                                                       |
| Writes go through `assertTaskWritable` and `findComment` (comment must belong to the task and project) | `comments.service.ts:34, 82, 107` and `:131` (`findComment` calls `findTask`)                                                                                                                                               |
| Router order: `authenticate`, `validate`, `projectAccess`, controller                                  | `routes/comments.routes.ts:26-32, 33-39, 40-46, 47-53`                                                                                                                                                                      |
| Affected tests (graph lists them only through the `app.ts` import)                                     | direct: `comments.edit-delete.integration.test.ts:124-132` (other member 403), `:147-153` (non-member 404), `:166-172` (comment of another task 404), `:187-194` (401), `:224-231`; `comments.add-list.integration.test.ts` |

## Limits of the graph (recorded, not hidden)

- For the comments service the graph has 62 unresolved call sites, so test-to-service edges are missing; affected tests came only through the `app.ts` import and were completed by reading the test files.
- For the auth query the graph's `call_site` lines point at parameter or type-reference lines (for example `routes/comments.routes.ts:21` is `secrets: TokenSecrets,`), not at the `authenticate(...)` calls. They were not used; the call lines above come from source.
- Impact via `app.ts` makes almost every integration test "affected"; that is true but coarse.
