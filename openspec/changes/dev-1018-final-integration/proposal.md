# Proposal

## Why

DEV-1018 (Linear DEV-22) is the final integration. Checked against ASSIGNMENT.md §9, the repo lacks seed data and Docker configuration for the app itself (item 1) and the submission index, demo and retrospective (items 1 and 10). It also carries cleanup debts that earlier tickets deferred to this one (D-001, D-009). Without them the submission is incomplete, and `docker compose up` does not run the application.

## What Changes

- **Seed data**: an idempotent, pinned-dependency-free seed (compiled with the existing `tsc`, run with `node`) that creates demo users, one project with both roles, tasks, comments and activity. It is documented and refuses to run in production unless explicitly enabled.
- **Dockerized app**: multi-stage, non-root Dockerfiles for backend and frontend (exact base image tags), plus Compose services `migrate` (applies migrations and seeds, then exits), `backend` and `frontend` next to the existing `postgres`. `docker compose up` starts the whole app with healthchecks; no secrets in images or in the Compose file (required from `.env`).
- **Submission package**: `docs/SUBMISSION.md` (§9 items 1-10 as a checklist linking real evidence), `docs/DEMO.md` (command walkthrough of the SDD flow for one ticket and of running the app), `docs/RETROSPECTIVE.md`.
- **Cleanup**: GitHub Actions pinned to commit SHAs with the version in a comment (D-009; `timeout-minutes` added); `check-pinning` accepts SHA refs and also checks Dockerfile `FROM` lines; `minimumReleaseAgeExclude` entries removed if install still passes (D-001); every deviation row with "Follow-up: DEV-1016/1017/1018" becomes Fixed (commit) or "Follow-up: post-submission" with a reason.
- **Integration evidence**: `pnpm build`, `lint`, `typecheck`, `test`, the Playwright journey and a `docker compose up` smoke run on the integrated branch, saved under `docs/evidence/DEV-1018/`.
- **Existing-test impact**: the "only the postgres service exists" Compose test and its spec requirement are replaced by the new service list (a spec-approved change, not a weakened test); `scripts/e2e.mjs` starts only `postgres`.
- Max 6 tasks. Time-boxed to the 21:00 submission.
- Out of scope: new features; production deployment; branch protection (post-submission, needs the repo owner's verified email, D-026); rate limiting, token-family revocation, secret-strength checks and security headers (D-037, D-038, D-048, D-137, D-138, D-140: post-submission); the task-list link on the project page (D-130).

## Capabilities

### New Capabilities
- `demo-seed-data`: what the seed creates, that it is idempotent and safe, and how it is run.
- `containerized-app`: the whole app runs from `docker compose up` with pinned, multi-stage, non-root images, healthchecks and no baked-in secrets.
- `submission-package`: the submission index, demo walkthrough and retrospective, each item backed by evidence in the repo.

### Modified Capabilities
- `local-dev-environment`: "Compose scope" now covers the app services as well as PostgreSQL.
- `dependency-pinning`: GitHub Actions are pinned to commit SHAs and Dockerfile base images are pinned to exact tags.

## Impact

- New: `backend/src/seed.ts`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `.dockerignore`, `docs/SUBMISSION.md`, `docs/DEMO.md`, `docs/RETROSPECTIVE.md`, `docs/evidence/DEV-1018/`.
- Changed: `docker-compose.yml`, `.env.example` (variable names only, no values of secrets), `.github/workflows/ci.yml`, `scripts/check-pinning.mjs`, `scripts/e2e.mjs`, `scripts/tests/compose.test.mjs`, `pnpm-workspace.yaml`, `docs/VERSIONS.md`, `docs/deviations.md`, `backend/package.json` (a script only, no new package), `docs/testing/scenario-test-map.md`, `docs/traceability.md` at archive.
- No new npm packages. New images (exact tags): `node:22.23.3-slim` and `nginxinc/nginx-unprivileged:1.30.6-alpine`; `postgres:16.15-alpine` is unchanged.
- No API or schema change; no production request-path code changes.
- Rollback: revert the task commits; the Compose file returns to the postgres-only form and the seed and images disappear with no data migration involved.
