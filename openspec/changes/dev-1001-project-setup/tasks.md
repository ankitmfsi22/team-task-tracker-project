# Tasks

Ticket: DEV-1001 (Linear DEV-5). One commit per task: `type(scope): description (DEV-1001)`. Per task: test-writer first, then implement, then lint, typecheck, test. Task-level checks use scripts/tests that fail before the work exists.

## 1. Line endings and repo hygiene

- [x] 1.1 Add `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, and run `git add --renormalize .` in its own commit; verify `git ls-files --eol` shows no `i/crlf` text files and `git add --renormalize .` stages nothing further.

## 2. Pinned toolchain and workspace skeleton

- [x] 2.1 Confirm current stable versions with `npm view` (Prisma stable line, not the rc; TypeScript and ESLint within the pinned typescript-eslint's peer ranges, which excludes TypeScript 7), then create root `package.json` (`packageManager`, `engines`), `.nvmrc`, `.npmrc` (`save-exact=true`), `pnpm-workspace.yaml`; verify `pnpm install` succeeds and no specifier in any `package.json` is a range.
- [x] 2.2 Write the failing pinning-check tests first with `node:test` (range, `latest`, `next`, unpinned image, floating workflow action ref, clean pass), generating every invalid input in an OS temp directory at test time (never committed) and cleaning it up, then implement `scripts/check-pinning.mjs` with a root-directory argument; verify the tests pass, the script exits 0 on the repo and non-zero on each generated violation, and `git ls-files` contains no fixture files.
- [x] 2.3 Create stub packages `backend`, `frontend`, `packages/shared` (`package.json`, `tsconfig.json` extending a strict `tsconfig.base.json`, one-file `src/`, one placeholder Vitest test each, per-package `build`/`typecheck`/`test`, `@types/node` pinned to the newest 22.x); verify `pnpm -r list --depth -1` lists all three and `pnpm build`, `pnpm typecheck`, `pnpm test` exit 0.

## 3. Lint, format and commit enforcement

- [ ] 3.1 Add Prettier (`endOfLine: lf`), `format` and `format:check` scripts; write tests first that generate a misformatted file and a CRLF file in an OS temp directory (never committed, cleaned up); verify the check fails on both, `pnpm format` fixes the repo, and `pnpm format:check` passes.
- [ ] 3.2 Add ESLint flat config (forbid `any`, `@ts-ignore`, `eslint-disable` without a ticket ID) and root `lint` that also runs the pinning check; write tests first that generate each forbidden construct in an OS temp directory (never committed, cleaned up) and lint it; verify each fails, `pnpm lint` exits 0 on the repo, and no ignore entries exist for fixtures.
- [ ] 3.3 Add Husky and lint-staged (`prepare` script, `.husky/pre-commit`); verify from both PowerShell and Git Bash that a staged file with a lint error aborts `git commit` and a clean staged file commits. Save the transcript in `docs/evidence/DEV-1001/`.
- [ ] 3.4 Add `test:e2e` and `lighthouse` placeholder scripts; verify output contains "not implemented — DEV-1016" and "not implemented — DEV-1011" and both exit 0.

- [ ] 3.5 Write a failing `node:test` first that parses `.github/workflows/ci.yml` (triggers, ordered gate commands, `node-version-file: .nvmrc`, no hard-coded Node/pnpm version, exact action tags), then add the workflow and the pinned `@fission-ai/openspec` dev dependency (ask before install); confirm action tags with `gh api` and record them in `docs/VERSIONS.md` later; verify the test passes, the pinning check passes on the workflow, and each gate command in the workflow runs locally.

## 4. Local database and Prisma

- [ ] 4.1 Add `docker-compose.yml` (postgres only, exact `16.<minor>-alpine` tag verified with `docker pull`, named volume, healthcheck, `${POSTGRES_PASSWORD:?}`) and `.env.example` with placeholders only; verify `docker compose config --services` prints only `postgres`, `docker compose up -d` reaches healthy, `docker compose up` without the password var fails naming it, and `git check-ignore .env` matches.
- [ ] 4.2 Add Prisma to `backend` (pinned stable 7.x, `prisma.config.ts`, `schema.prisma` with datasource and no models, `DATABASE_URL` from env only); verify Prisma validate passes with `DATABASE_URL` set, a connectivity check succeeds against the Compose database, and it fails naming `DATABASE_URL` when unset.

## 5. Documentation

- [ ] 5.1 Create `docs/VERSIONS.md` with every exact version (Node, pnpm, TypeScript, ESLint, typescript-eslint, Prettier, Husky, lint-staged, Vitest, Prisma, Postgres image tag), the Prisma rationale, the typescript-eslint supported TypeScript/ESLint ranges and the npm check date; verify `scripts/check-pinning.mjs` (extended) or a test confirms the documented versions (including `@types/node` and the CI action tags) match `package.json`, `.nvmrc`, `docker-compose.yml` and `.github/workflows/ci.yml`, and that the pinned TypeScript and ESLint satisfy the typescript-eslint peer ranges.
- [ ] 5.2 Update AGENTS.md "Repo structure (planned, not yet created)" and key-command notes to the real state; verify the commands listed in AGENTS.md all run.

## 6. Verification

- [ ] 6.1 Run `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format:check` from a fresh `pnpm install --frozen-lockfile`; verify all exit 0 and save output in `docs/evidence/DEV-1001/`.
- [ ] 6.2 Map each Linear DEV-5 acceptance criterion (1-6) to evidence in `docs/evidence/DEV-1001/ac-checklist.md`; verify every criterion has a command or file reference and no `latest` or range exists (pinning check passes).
- [ ] 6.3 Run `openspec validate dev-1001-project-setup --strict`; verify it passes.

- [ ] 6.4 Push the branch and verify the CI workflow passes (all steps green, including `openspec validate --all --strict` and `pnpm audit --audit-level=high`); save the run link and result in `docs/evidence/DEV-1001/ci-run.md`.

## Workflow follow-up

- Run /opsx:verify, then the reviewer sub-agent in a fresh context; save findings verbatim to `review-log.md` and fix blocking findings.
- Gate 2: human approves the PR and adds a Gate 2 entry to `approvals.md`.
- After merge run /opsx:sync, then /opsx:archive.
