# Design

## Context

Greenfield repo: only docs, `.claude/` and OpenSpec exist (see proposal.md). Environment: Windows 11, Node 22.23.3, pnpm 12.11.2, Docker 29.8.0, git with `core.autocrlf=true`. The `.claude/hooks` already run `pnpm typecheck`/`pnpm test` and local Prettier when present. Registry check on 2026-10-31: `prisma` `latest` dist-tag is `8.0.0-rc.29` (a release candidate), while `@prisma/client` `latest` is `7.10.1` and `prisma` `prev` is `7.10.1`. The same check shows TypeScript `latest` is 7.0.2 and ESLint `latest` is 10.14.0.

No HTTP API or request/response schema is introduced, so the "schemas in packages/shared first" rule has nothing to define here; `packages/shared` is only a stub.

## Goals / Non-Goals

**Goals:** a reproducible, exactly pinned monorepo whose four gates pass on stubs; a Postgres 16 container; Prisma connectivity; commit-time enforcement that works on Windows; a CI workflow that runs the same gates on every pull request.

**Non-Goals:** any feature code, Prisma models/migrations, backend/frontend Compose services, deployment or release pipelines, real e2e or Lighthouse runs, Vite/Express skeletons.

## Decisions

- **Prisma 7 (7.10.1), not 8.0.0-rc.** Pin the newest stable major; the `latest` tag of the CLI is a prerelease, so use the stable `7.x` line and record the reason and check date in `docs/VERSIONS.md`. Alternative: Prisma 6 (older, `prev` of client) rejected because 7 is stable. Prisma 7 uses `prisma.config.ts` and requires `DATABASE_URL` from the environment, which matches the no-default-secret requirement. Exact patch is re-confirmed with `npm view` at apply time.
- **Exact pinning everywhere:** `.npmrc` `save-exact=true`, `packageManager` (pnpm exact), `engines.node` plus `.nvmrc` (22), committed `pnpm-lock.yaml`. Alternative: ranges plus lockfile only, rejected because NFR-9 and AC2 forbid floating specifiers.
- **Pinning check as a plain Node script** (`scripts/check-pinning.mjs`, no new dependency) scanning every `package.json` and Compose image refs for ranges, `latest`, `next` and untagged images. It runs inside `pnpm lint`. Alternative: a third-party tool, rejected (adds packages).
- **Postgres image `postgres:16.<minor>-alpine`** with exact minor chosen and verified by `docker pull` at apply time and recorded in `VERSIONS.md`. A digest is stricter but unreadable; alpine tag chosen for readability and size. Compose has only `postgres` + named volume + healthcheck. Credentials come from `.env` via `${POSTGRES_PASSWORD:?error}` so a missing value fails loudly.
- **Env files:** `.env.example` has placeholders only (`DATABASE_URL`, Postgres vars, JWT secret names left for DEV-1006). `.env` already git-ignored (verified in `.gitignore`).
- **Workspaces:** `pnpm-workspace.yaml` lists `backend`, `frontend`, `packages/*`. Each package has `package.json`, `tsconfig.json` extending a root `tsconfig.base.json` (strict), a one-file stub in `src/`, and one placeholder Vitest test so `pnpm test` is real. `build` uses `tsc` per package for the stubs (no Vite/Express yet). Root scripts delegate with `pnpm -r`.
- **Lint/format:** ESLint flat config with typescript-eslint (forbid `any`, `@ts-ignore`, `eslint-disable` without a ticket ID via a description rule) and Prettier (`endOfLine: lf`). `format` and `format:check` are real. `test:e2e` and `lighthouse` are tiny Node `-e` or script placeholders printing "not implemented — DEV-1016/DEV-1011", exit 0.
- **Husky + lint-staged** (lint-staged approved by Ankit Singh): `prepare` installs Husky; `.husky/pre-commit` runs lint-staged (eslint + prettier on staged files). Alternative: full `pnpm lint` per commit, rejected as slow.
- **Line endings:** `.gitattributes` `* text=auto eol=lf`, `.editorconfig`, Prettier `endOfLine: lf`, and one `git add --renormalize .` commit early in apply so later diffs are clean. `core.autocrlf=true` on this machine is left alone (the attribute wins for the index); not changed globally.
- **TypeScript and ESLint pinned to what typescript-eslint officially supports.** Registry check on 2026-10-31: `typescript-eslint@8.72.1` declares peers `typescript >=4.8.4 <6.1.0` and `eslint ^8.57.0 || ^9.0.0 || ^10.0.0`. The `latest` TypeScript is 7.0.2, which is outside that range, so TypeScript is pinned to the newest 6.0.x (6.0.3 at check time) and ESLint to 10.14.0 (inside `^10`). Exact versions are re-confirmed with `npm view` at apply time against the typescript-eslint version actually pinned, and the supported ranges are recorded in `docs/VERSIONS.md`. Alternative: TypeScript 7.0.2, rejected because typescript-eslint does not support it.
- **Negative fixtures are generated at test time, never committed.** Tests create invalid input (misformatted, CRLF, `any`, `@ts-ignore`, `eslint-disable`, version ranges, `latest`, floating image tags) with `fs.mkdtemp` under `os.tmpdir()` and remove it in `afterEach`/`finally`. To make this possible, the checks are callable against a directory: `scripts/check-pinning.mjs` takes a root-directory argument (default: repo root); lint tests use the ESLint Node API with the repo config and `cwd`/file paths in the temp dir; format tests call Prettier's API with the repo config (Prettier config is passed explicitly because the temp dir is outside the repo). Because no invalid file is ever tracked, no ESLint, Prettier, `tsc` or pinning ignore entries for fixtures are needed. Alternative: committed `fixtures/` folders with ignore rules, rejected because they weaken the gates and risk being committed as real code.
- **`@types/node` pinned to the newest 22.x** (exact version confirmed with `npm view` at apply time) so Node typings match the Node 22 runtime; approved by Ankit Singh. It is added in the stub-package task and recorded in `docs/VERSIONS.md`.
- **Root tooling and config tests use `node:test`** (with `node:assert`), run through `node --test`, with no extra dependency (approved by Ankit Singh). Package stubs still use Vitest. This covers the pinning, line-ending, format, lint and version-consistency checks, which test the repo's own tooling rather than package code.
- **CI workflow `.github/workflows/ci.yml`**, triggered on `pull_request` and on `push` to `main`. Steps, in order: checkout, pnpm setup (version from `packageManager`, not repeated in the workflow), Node setup (`node-version-file: .nvmrc`), `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint` (includes the pinning check), `pnpm typecheck`, `pnpm test`, `pnpm build`, `openspec validate --all --strict`, `pnpm audit --audit-level=high`. Every action is pinned to an exact version tag (no `@latest`, `@main` or floating major tags); tags are confirmed with `gh api` at apply time (checked 2026-10-31: `actions/checkout` v7.0.1, `actions/setup-node` v7.1.0, `pnpm/action-setup` v6.1.0). The pinning check also scans workflow files for floating action refs. The OpenSpec CLI used in CI must be pinned: it is installed as a root dev dependency `@fission-ai/openspec` at the exact version in use (1.16.0 at check time), which is a new package needing Ankit Singh's approval before install. Alternative: `npx` with an exact version at run time, rejected because it bypasses the lockfile. The workflow needs a pushed branch, so its first real run happens on the PR branch.
- **Verification evidence** for AC4 (a staged lint error blocks a commit) and AC1/AC2 is recorded under `docs/evidence/DEV-1001/`.

## Risks / Trade-offs

- [TypeScript/ESLint drift outside typescript-eslint's supported ranges] → pinned inside the declared peer ranges (see Decisions); a test compares the pinned versions with the typescript-eslint peer ranges, and `pnpm install` must show no peer warning.
- [Temp-dir fixtures leak or behave differently across OSes] → create with `mkdtemp`, always clean up in `finally`, build paths with `node:path`, and run the tests on Windows (apply machine) and Linux-compatible code paths.
- [Husky hook fails on Windows due to CRLF or missing `sh`] → force LF via `.gitattributes`, test the hook from PowerShell and Git Bash.
- [`pnpm` version drift between machines] → `packageManager` pin; the local pnpm (12.11.2) may differ from the pinned one, enable via Corepack or install the pinned version.
- [Renormalize creates a noisy diff] → isolate it in its own task and commit.
- [Stub placeholder tests give false confidence] → names state they are placeholders; real tests arrive with feature tickets.
- [CI action tag drift or a moved tag] → exact tags, checked by the pinning check; accepted residual risk is that a tag can be re-pointed upstream (a commit SHA is stricter but was not requested).
- [Docker tag verified only on the apply machine] → record the exact tag and pull date in `VERSIONS.md`.

## Migration Plan

Apply tasks in order on the feature branch, one commit per task; push for PR after verify and review. Rollback: revert the PR or task commits; `docker compose down -v` removes the container and volume.
