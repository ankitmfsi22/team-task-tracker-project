# Final integration gates (DEV-1018)

Branch `feature/infra/DEV-1018-final-integration` at `e7510a4`, run 2026-11-02 20:17 on macOS (Node 22.23.3, pnpm 12.11.2, Docker 29.8.0). All commands exited 0.

| Gate                               | Exit | Result                                                                                                       |
| ---------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------ |
| `pnpm format:check`                | 0    | All matched files use Prettier code style!                                                                   |
| `pnpm lint`                        | 0    | Pinning check passed.                                                                                        |
| `pnpm typecheck`                   | 0    | all workspace projects                                                                                       |
| `pnpm build`                       | 0    | all workspace projects                                                                                       |
| `pnpm test`                        | 0    | # pass 279 tooling tests (node:test); Tests 110 passed (110); Tests 151 passed (151); Tests 263 passed (263) |
| `pnpm test:e2e`                    | 0    | 1 passed (4.0s) (Playwright user journey, Chromium)                                                          |
| `openspec validate --all --strict` | 0    | ✓ spec/workspace-quality-gates Totals: 21 passed, 0 failed (21 items)                                        |

## Container run

`docker compose up --build --wait`, status, non-root and idempotent re-run, and a login through the containerized app were recorded earlier in this change: [compose-up.txt](compose-up.txt), [compose-ps.txt](compose-ps.txt), [containers-nonroot-idempotent.txt](containers-nonroot-idempotent.txt), [containerized-login.txt](containerized-login.txt). The Dockerfiles and Compose file have not changed since commit `78c2dc3`.

## Raw output (last lines)

### test

```
frontend test: Environment  jsdom was created 21 times · 23.78s total, 35% of tracked time
frontend test:              create it once per worker with pool: 'vmThreads' (keeps per-file isolation) or isolate: false (shares it across files)
frontend test:              learn more: https://vitest.dev/guide/improving-performance#test-environments
frontend test:
frontend test: Done
backend test:
backend test:  Test Files  23 passed (23)
backend test:       Tests  263 passed (263)
backend test:    Start at  20:16:33
backend test:    Duration  33.01s (tests 86%, import 13%)
backend test:
backend test: Done
```

### e2e

```
frontend build: dist/assets/jsx-runtime-BzzZbQ2T.js        82.88 kB │ gzip:  27.55 kB
frontend build: dist/assets/index-B4isUc8w.js             391.95 kB │ gzip: 120.33 kB
frontend build:
frontend build: ✓ built in 313ms
frontend build: Done
[Backend] $ node dist/main.js

Running 1 test using 1 worker

  ✓  1 [chromium] › e2e/journey.spec.ts:3:1 › user journey (1.7s)

  1 passed (4.0s)
```

### validate

```
✓ spec/openspec-workflow
✓ spec/parallel-development
✓ spec/projects
✓ spec/tasks
✓ spec/user-auth
✓ spec/web-auth
✓ spec/web-comments-activity
✓ spec/web-platform
✓ spec/web-projects
✓ spec/web-tasks
✓ spec/workspace-quality-gates
Totals: 21 passed, 0 failed (21 items)
```
