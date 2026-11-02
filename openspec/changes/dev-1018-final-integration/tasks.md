# Tasks

## 1. Seed data (backend)

- [x] 1.1 Test-writer first, from the `demo-seed-data` scenarios (usable, idempotent, missing password, production denied), then implement `backend/src/seed.ts` and the `db:seed` script; no new package; one commit.

## 2. Docker (infra)

- [x] 2.1 Test-writer first, from the `containerized-app` and "Compose scope" scenarios (`node:test` on Dockerfiles and `docker compose config`; replace the "only postgres" test as specified); then add `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, `.dockerignore`, the Compose services, `.env.example` variable names, and `postgres` scoping in `scripts/e2e.mjs`; build the images and run `docker compose up --build --wait`; one commit.

## 3. Cleanup (infra)

- [x] 3.1 Test-writer first, from the `dependency-pinning` scenarios; then make `check-pinning` accept SHA refs and check Dockerfile `FROM`, pin the three Actions to the SHAs in design decision 7, add `timeout-minutes`, remove `minimumReleaseAgeExclude` and re-run `pnpm install --frozen-lockfile`, update `docs/VERSIONS.md`; one commit.

## 4. Submission documents (docs)

- [ ] 4.1 Write `docs/SUBMISSION.md`, `docs/DEMO.md` and `docs/RETROSPECTIVE.md` from real evidence in the repo (Linear MCP, git log, review logs, deviations); close out every "Follow-up: DEV-1016/1017/1018" row in `docs/deviations.md`; map scenarios in `docs/testing/scenario-test-map.md`; one commit. No tests for these files; they are checked in 6.1.

## 5. Integration run (infra)

- [ ] 5.1 On the integrated branch run `pnpm build`, `lint`, `typecheck`, `test`, `pnpm test:e2e` and the Compose smoke run (health, login as a demo user, 401 through the frontend port); save the outputs in `docs/evidence/DEV-1018/`; fix only what breaks; one commit.

## 6. Verification and close

- [ ] 6.1 `openspec validate dev-1018-final-integration --strict`, `/opsx:verify` (including the documentation scenarios by reading), reviewer sub-agent in a fresh context with findings saved verbatim in `review-log.md`, fix blocking findings, open the PR with links to issue, change, requirements, tests, review findings and deviations; after Gate 2, `/opsx:sync`, `/opsx:archive` and the traceability row on the branch.
