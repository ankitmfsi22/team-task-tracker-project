# Proposal

Ticket: DEV-1001 (Linear DEV-5). Branch: `feature/infra/DEV-1001-project-setup`. Requirements: FRS NFR-1, NFR-2, NFR-3, NFR-5, NFR-8, NFR-9; SDS sections 1, 2, 8.
Change folder is `dev-1001-project-setup` because the OpenSpec CLI only accepts lowercase kebab-case names.

## Why

The repository holds only AI-workflow infrastructure and docs: there is no `package.json`, workspace, database service, linting or commit hook. Every later ticket (DEV-1002 onward) needs a working pnpm monorepo, a local PostgreSQL 16, and passing quality gates to build on. `docs/VERSIONS.md` is referenced by SDS, AGENTS.md and `openspec/config.yaml` but does not exist yet.

## What Changes

- Add a pnpm workspaces monorepo (`backend/`, `frontend/`, `packages/shared/`) with minimal stub packages that pass every gate. No feature code.
- Add root scripts: `build`, `lint`, `typecheck`, `test`, `format`, `format:check` (real), plus `test:e2e` and `lighthouse` placeholders that print "not implemented — DEV-1016" / "DEV-1011" and exit 0.
- Add ESLint, Prettier, TypeScript strict configs; Husky pre-commit with lint-staged so a staged lint error blocks the commit.
- Add `docker-compose.yml` with PostgreSQL 16 only, pinned to an exact `16.x-alpine` tag, plus `.env.example` (placeholders only).
- Configure Prisma against Postgres (datasource and connection only, no models) in `backend/`.
- Pin everything exactly: `packageManager`, `engines`, `.nvmrc`, `.npmrc` `save-exact=true`, committed lockfile, and a pinning check script. Create `docs/VERSIONS.md` with all versions and the Prisma major rationale.
- Add `.gitattributes` (`* text=auto eol=lf`), `.editorconfig`, Prettier `endOfLine: lf`, and renormalize the working tree once.
- Add a GitHub Actions workflow `.github/workflows/ci.yml` (on `pull_request` and push to `main`) running the install, format, lint, typecheck, test, build, `openspec validate --all --strict` and `pnpm audit --audit-level=high` gates, with every action pinned to an exact version tag.
- Root tooling tests use `node:test` (no extra dependency); `@types/node` is pinned to the newest 22.x.
- New dev dependencies are approved by Ankit Singh for this ticket (lint-staged explicitly; the rest are the tech stack's quality tools).

## Capabilities

### New Capabilities
- `workspace-quality-gates`: monorepo layout, root scripts, lint/format/typecheck/test gates, pre-commit enforcement and line-ending normalization.
- `local-dev-environment`: Docker Compose PostgreSQL, environment-variable handling and Prisma datasource connectivity.
- `dependency-pinning`: exact version pinning, `docs/VERSIONS.md` and an automated check that rejects `latest` and version ranges.

### Modified Capabilities
None. `openspec/specs/` is empty.

## Impact

- New root files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc`, `.nvmrc`, `.gitattributes`, `.editorconfig`, `.prettierrc`, `eslint.config.js`, `tsconfig.base.json`, `docker-compose.yml`, `.env.example`, `.husky/`, `scripts/check-pinning.mjs`, `.github/workflows/ci.yml`.
- New in `backend/`, `frontend/`, `packages/shared/`: `package.json`, `tsconfig.json`, stub source and a placeholder test each; `backend/prisma/schema.prisma` and Prisma config.
- New `docs/VERSIONS.md`. No API, schema or runtime behaviour changes; no feature code.
- Existing hooks in `.claude/hooks` start running real `pnpm typecheck` and `pnpm test` at Stop.
- Renormalization touches line endings of existing tracked files in one dedicated commit.

## Rollback plan

All work lands on `feature/infra/DEV-1001-project-setup` as one commit per task. Roll back by reverting the PR (or the individual task commits); nothing outside the repo is modified. The Docker volume holds no data to preserve; `docker compose down -v` removes it. The renormalize commit is isolated so it can be reverted separately.
