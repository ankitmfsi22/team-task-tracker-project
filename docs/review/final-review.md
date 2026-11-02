# Final independent review (DEV-1017)

- Ticket: DEV-1017 (Linear DEV-21). Change: `openspec/changes/dev-1017-independent-review`.
- Scope: the whole of `main` (backend, `packages/shared`, frontend, `e2e`, `scripts`, docs), reviewed at commit `d2f5bde` (source identical to `main` at `c8b5535`).
- Reviewers: `reviewer` and `security-auditor` sub-agents, read-only, fresh contexts, run in parallel. Findings verbatim: `review-log.md` (reviewer) and `docs/evidence/DEV-1017/security-audit.md` (security).
- Result: 17 findings (13 from the first review, 4 from a second fresh-context review of this change itself), 1 blocking (fixed), 16 non-blocking (accepted in `docs/deviations.md` D-134 to D-142, or fixed in documentation).

## 1. Spec compliance

The reviewer read the projects, tasks, comments and activity specs in full and the three web specs by requirement title, and checked each scenario against source and a named test. No spec requirement was found violated. Checked with no issue: layering (routes, controllers, services, Prisma), 404 then 403 then 409 order in `projectAccess`, cross-project lookups scoped by `{ id, projectId }`, strict Zod schemas from `packages/shared`, task change and activity entry written in one transaction, last-owner rule in a serializable transaction, no `any` or `@ts-ignore`, the single `eslint-disable` carries DEV-1006.
Limit: the three web specs were reviewed by title and the scenario map, not test by test (the map script confirms every mapped scenario resolves to an existing test, 10/10 passing).

## 2. Security

No blocking security finding. `pnpm audit --prod`: no known vulnerabilities.

| Area                    | Result                                                                                                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Secrets                 | `.env` ignored, only `.env.example` tracked, secrets read only in `backend/src/config.ts:19-21`, no token or hash logged, CI has `permissions: contents: read`. Not scanned: git history and docs fixtures                                                                     |
| Auth and tokens         | HS256 pinned, 15 min access and 7 d refresh with separate secrets, refresh stored as SHA-256 hash, atomic rotation (`auth.service.ts:74-86`), logout revokes, cookie httpOnly, secure, sameSite strict, generic login 401. Not confirmed against the library: argon2id default |
| Membership              | every project-scoped route runs `authenticate`, `validate`, `projectAccess` (confirmed in graph evidence and source); comment edit is author-only, delete is author or OWNER; assignee must be a member; no IDOR found                                                         |
| Non-blocking, follow-up | no rate limiting or security headers (D-136), secret strength not validated (D-137), no refresh token family revoke (D-139)                                                                                                                                                    |
| Non-blocking, accepted  | email enumeration on register and add-member (D-138), query re-parse convention (D-140)                                                                                                                                                                                        |

## 3. Test coverage

- Gates at the reviewed state, run on this branch: `pnpm lint`, `pnpm typecheck`, `pnpm build` pass; `pnpm test` passes: root 256, shared 110, frontend 151, backend 247 (includes the 2 tests added by this change).
- Coverage (DEV-1016 evidence, `docs/evidence/DEV-1016/coverage.md`): backend 97.62% lines, frontend 92.08%, shared 100%, threshold 80%. Not re-measured in this change.
- Gaps found: 401 tests missing on comments GET list and DELETE (blocking, fixed in `f871252`); on tasks get, patch, status, assignee, archive and projects member routes (accepted, D-067 and D-134); 409 on archived project for task patch, status, assignee and comment delete (accepted, D-134).

### Authorization-denied matrix (from the reviewer, spot-checked)

| Route group | 401                                                                              | 403                                                     | 404                                                            |
| ----------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| projects    | POST and GET tested; other routes share the router-level guard                   | PATCH, archive, add and remove member tested            | get, archive, members list, add, remove tested                 |
| tasks       | create and list tested; get, patch, status, assignee, archive not (D-067, D-134) | none by design (any member writes tasks)                | create, get, list, update, assign, status, archive tested      |
| comments    | POST and PATCH tested; GET and DELETE added by this change                       | non-author edit and non-author, non-OWNER delete tested | add, list, edit, delete tested                                 |
| activity    | tested                                                                           | none (read-only, any member)                            | non-member, other project, nonexistent task and project tested |

## 4. Graph-assisted impact

Code Review Graph 2.3.9 rebuilt at `d2f5bde` (the earlier index was stale). Details with `file:line` confirmations: `docs/evidence/DEV-1017/graph.md`.

- `projectAccess`: 12 impacted nodes, 6 files; called from 4 routers (about 20 registrations), confirmed in source. Any change reaches every project-scoped route and about 20 integration test files via `createApp`.
- Auth and refresh: 34 impacted nodes, 26 files; `authenticate` gates all five routers; `AuthService` reaches only the auth controller, router and two auth test files.
- Comment permissions: 25 impacted nodes, 22 files; owner and author rules at `comments.service.ts:78-80` and `:99-105`.
- Graph limits: 62 unresolved call sites for the comments service (tests found by reading files), and the graph's call-site lines for the auth query pointed at parameter lines, so source lines were used.
- Finding found while confirming impact: the per-route `auth` on comments and tasks is redundant with the router-level `authenticate` in `projects.routes.ts:26` (D-069), which is why the blocking gap was a missing test and not a live hole (D-141).

## 5. Blocking finding

R2: no 401 test for comments GET list and DELETE. Fixed by two tests (`comments.add-list.integration.test.ts`, `comments.edit-delete.integration.test.ts`), commit `f871252`. They pass at once because the code was already correct; the test-writer's mutation check shows they fail when both authentication guards are removed (this mutation result is the test-writer's report; the second reviewer did not re-run it).

## 6. Accepted and follow-up

See `docs/deviations.md` D-134 to D-141. Follow-up after submission: D-136, D-137, D-139, and D-019 (the `.claude` permission hook fails open on malformed input). D-019 is recorded as "Follow-up: post-submission" and not implemented here; no file under `.claude/` changed.
