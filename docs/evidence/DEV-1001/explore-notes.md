# DEV-1001 explore notes (Linear DEV-5, fetched live via MCP, status Backlog)

Branch: feature/infra/DEV-1001-project-setup. No active changes, no specs yet. Not a fixture: real ticket verified.

## Acceptance criteria
1. pnpm workspaces (backend, frontend, packages/shared); build/lint/typecheck/test run and pass.
2. `docker compose up` starts PostgreSQL 16, pinned tags; no `latest` / `@latest` anywhere.
3. Prisma configured against Postgres; versions recorded in docs/VERSIONS.md.
4. ESLint + Prettier + Husky pre-commit; a staged lint error blocks the commit.
5. `.env` git-ignored; `.env.example` placeholders only.
6. OpenSpec initialised; CLAUDE.md/AGENTS.md present. Out of scope: any feature code.

## Repo state
- Done by bootstrap: AC5 (.gitignore has .env, !.env.example), AC6 (openspec/, CLAUDE.md, AGENTS.md).
- Missing: package.json, pnpm-workspace.yaml, docs/VERSIONS.md (referenced by SDS, AGENTS, config.yaml but absent), .env.example, docker-compose.yml, .gitattributes, Husky, ESLint/Prettier/TS configs, Prisma, workspace packages (only CLAUDE.md files).
- Toolchain here: Node 22.23.3, pnpm 12.11.2, Docker 29.8.0, git 2.49 with core.autocrlf=true.
- Hooks (.claude/hooks) already call root `pnpm typecheck`/`pnpm test` and local prettier; they no-op until scripts exist.

## Open questions
1. Prisma major (6 vs 7; 7 changes config/client generation): which to pin?
2. Exact pins: pnpm `packageManager` field, Node via `.nvmrc`/`engines`, Postgres image tag (16.x-alpine vs debian, or digest).
3. Compose scope: Postgres only (NFR-1 mentions app services too) or add backend/frontend services later?
4. How far to go on workspace content: minimal stubs with passing placeholder tests, or real tsconfig/Vite/Express skeleton?
5. Lint-staged for pre-commit (new package, needs your approval) vs plain `pnpm lint` in the hook.
6. `pnpm lighthouse` / `format` / `test:e2e`: placeholder scripts that exit 0 with a message, or exit non-zero until implemented?
7. Prisma schema: connection only, or include the SDS models now (probably feature scope; leaning connection-only).

## Considerations
- .gitattributes: `* text=auto eol=lf`; autocrlf=true on this machine conflicts, so also add `.editorconfig` and Prettier `endOfLine: lf`; shell scripts and Husky hooks MUST stay LF or fail on Windows.
- Husky on Windows: runs hooks via Git Bash `sh`; use `core.hooksPath` via `prepare`; verify with a staged lint error (AC4 evidence).
- Pinning: no `^`/`~` (use `.npmrc save-exact=true`), commit lockfile, verify with a grep for `latest`/ranges.
