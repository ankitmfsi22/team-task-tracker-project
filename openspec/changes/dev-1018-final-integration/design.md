# Design

## Context

See proposal.md for motivation. Observed state: the backend runs with `node dist/main.js` after `tsc` and a Prisma client generated into `src/generated`; `packages/shared` is consumed through its `dist`; Prisma 7.10.1 reads `DATABASE_URL` from `prisma.config.ts`; the frontend is a Vite SPA whose dev and preview servers proxy `/api` to the backend so that page and API share one origin (the refresh cookie has path `/api/v1/auth`, `Secure`, `SameSite=Strict`). Compose holds only `postgres` and `scripts/tests/compose.test.mjs` asserts that. `scripts/e2e.mjs` runs `docker compose up -d --wait` without a service name. There is no health endpoint. `scripts/check-pinning.mjs` accepts only version-tag Action refs.

## Goals / Non-Goals

**Goals:**
- `cp .env.example .env` (set secrets) then `docker compose up --build` gives a working app at `http://localhost:8080` with demo data.
- Pinned, reproducible images; non-root runtime; no secrets in images.
- Every deferred DEV-1018 deviation is closed or explicitly moved to post-submission.

**Non-Goals:**
- Production hardening, TLS termination, image digests, registry publishing, CI image builds.
- New npm packages, API or schema changes.

## Decisions

1. **Seed is compiled TypeScript run with `node`, not `tsx`.** Prisma's documented seed hook (`migrations.seed`, checked in Context7) uses `tsx`, which would be a new package. Instead `backend/src/seed.ts` is built by the existing `tsc` to `dist/seed.js`; `backend/package.json` gets `db:seed` (`node dist/seed.js`). It reuses the existing Prisma client and `@node-rs/argon2`. Idempotent through fixed UUIDs and `upsert`; activity rows are written only when their task or comment is newly created. The demo password comes from `SEED_DEMO_PASSWORD` (required, never in code). The seed exits non-zero if `NODE_ENV=production` and `SEED_DEMO_DATA` is not `true`.
2. **Migrations run in a one-shot `migrate` service**, not in the backend entrypoint. The Prisma CLI is a dev dependency, so the `migrate` image target is the build stage (full dependencies) and runs `prisma migrate deploy` then `node dist/seed.js`; the `backend` target contains production dependencies only. `backend` waits for `migrate` with `service_completed_successfully`; `migrate` waits for `postgres` healthy. Alternative (prisma in the runtime image) rejected: bigger image, CLI available at runtime.
3. **Backend image**: `node:22.23.3-slim` (matches `.nvmrc`; glibc avoids musl problems with the native argon2 binding), pnpm from `packageManager` via Corepack, `pnpm install --frozen-lockfile`, `USER node`. Stages: `build` (also the `migrate` target) and `runtime`.
4. **Frontend image**: build stage on the same Node image runs `vite build`; runtime is `nginxinc/nginx-unprivileged:1.30.6-alpine` (non-root, port 8080). `nginx.conf` serves the SPA with a `try_files` fallback and proxies `/api/` to `backend:3000`, keeping one origin so the cookie path matches. Only the frontend is published (`127.0.0.1:8080`); the backend is not published.
5. **Healthchecks without a new endpoint**: backend probes `GET /api/v1/projects` with Node's built-in `fetch` and treats any status below 500 (401 expected) as healthy; frontend uses `wget --spider`; postgres unchanged.
6. **Secrets**: Compose uses `${VAR:?message}` for `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SEED_DEMO_PASSWORD`; `.env.example` lists names with empty or placeholder values; Dockerfiles have no `ENV` or `ARG` for secrets; `.dockerignore` excludes `.env*`, `node_modules`, `dist`, evidence and test output.
7. **Pinning**: `check-pinning` accepts a 40-hex SHA for `uses:` (the version tag stays in a trailing comment) and rejects floating tags; it also fails a Dockerfile `FROM` without an exact tag or using `latest`. SHAs (resolved with `gh api`, annotated tag dereferenced): `actions/checkout` v7.0.1 `3d3c42e5aac5ba805825da76410c181273ba90b1`, `pnpm/action-setup` v6.1.0 `ea17c68df8912ef543352723c149a84f56e3d413`, `actions/setup-node` v7.1.0 `949feb2413d6458794dcd2491c4babbbce0c15c1`. CI gets `timeout-minutes`.
8. **E2E isolation**: `scripts/e2e.mjs` runs `docker compose up -d --wait postgres` so the app services are not started by the Playwright gate.
9. **Release-age exclusions** are removed, then `pnpm install --frozen-lockfile` is run; if it fails, only the failing entry is kept and recorded in `docs/VERSIONS.md` with the reason.
10. **Tests**: seed gets integration tests against the test database; the container and pinning requirements get dependency-free `node:test` checks on file contents and `docker compose config` (no containers started). The full `docker compose up --build` smoke run is manual evidence in `docs/evidence/DEV-1018/`. No tests about docs or evidence files; the documentation scenarios are checked in `/opsx:verify`.

## Risks / Trade-offs

- `Secure` cookie over `http://localhost`: Chrome and Firefox store it for localhost, Safari does not. DEMO.md says to use Chrome or Firefox; no cookie change here.
- Docker build needs network (Corepack, registry) and is slower than the 21:00 margin allows if it fails late: build the images in task 2 first.
- Corepack downloading pnpm 12.11.2 at build time depends on its availability; fallback is `npm install -g pnpm@12.11.2` (exact pin).
- The seed's demo password lives in a local `.env`, not in the repo; DEMO.md names the variable only.
- Retrospective content about human interventions (senior feedback, Linear workspace correction) is reconstructed from git history, `docs/deviations.md` and review logs; anything not in the repo needs the human's input before Gate 2.

## Open Questions

None blocking Gate 1.
