# Team Task Tracker

A full-stack app where authenticated users create projects, manage tasks, assign members, track status, priority and due dates, and view comments and activity history. Access is role-based and scoped per project (OWNER, MEMBER). Built as a pnpm monorepo with the SDD (spec-driven development) guide workflow, using Claude Code and OpenSpec.

## Tech stack

Exact versions: [`docs/VERSIONS.md`](docs/VERSIONS.md).

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Node.js 22, Express 5, TypeScript
- **Database:** PostgreSQL 16 with Prisma
- **Auth:** JWT access and refresh tokens, argon2id passwords
- **Validation and API:** Zod schemas in `packages/shared`, OpenAPI 3.1, base path `/api/v1`
- **Testing:** Vitest, Supertest, Playwright, Lighthouse
- **Tooling:** pnpm workspaces, ESLint, Prettier, Husky, Docker Compose

## Quick start (Docker)

```bash
cp .env.example .env        # then set the values in .env
docker compose up --build
```

Open <http://localhost:8080>. Compose starts PostgreSQL, applies the migrations and the demo seed, then starts the backend and frontend. Demo users and the seed password variable: [`docs/DEMO.md`](docs/DEMO.md).

## Local development

```bash
pnpm install
docker compose up -d postgres                                      # needs the values in .env
pnpm --filter @team-task-tracker/backend exec prisma migrate deploy   # DATABASE_URL set
pnpm --filter @team-task-tracker/backend build
pnpm --filter @team-task-tracker/backend run db:seed               # SEED_DEMO_PASSWORD set
pnpm --filter @team-task-tracker/backend start                     # API on port 3000
pnpm --filter @team-task-tracker/frontend dev                      # proxies /api to the backend
```

## Key scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `pnpm lint`         | ESLint plus the pinning check                   |
| `pnpm typecheck`    | TypeScript in every package                     |
| `pnpm test`         | Tooling tests, then each package's Vitest       |
| `pnpm test:e2e`     | Playwright user journey (needs Docker)          |
| `pnpm coverage`     | Coverage reports                                |
| `pnpm lighthouse`   | Lighthouse on the production build (local gate) |
| `pnpm build`        | Build every package                             |
| `pnpm format:check` | Prettier check (`pnpm format` writes)           |

## How the work was done

Every ticket follows one lifecycle: fetch the ticket through Linear MCP, `/opsx:explore`, `/opsx:propose` (proposal, design, tasks, specs), Gate 1 (human approval), `/opsx:apply` with tests written first and one commit per task, `/opsx:verify`, a fresh-context review, Gate 2 (human approval), `/opsx:sync` and `/opsx:archive`, then the PR. Details: [`docs/workflow.md`](docs/workflow.md). Rules for Claude Code: [`CLAUDE.md`](CLAUDE.md) and [`AGENTS.md`](AGENTS.md).

## Docs

- [`docs/SUBMISSION.md`](docs/SUBMISSION.md): submission index with evidence
- [`docs/DEMO.md`](docs/DEMO.md): run the app and walk one ticket through the flow
- [`docs/RETROSPECTIVE.md`](docs/RETROSPECTIVE.md): successes, failures, interventions, improvements
- [`docs/traceability.md`](docs/traceability.md): ticket, change, branch, PR and gates per ticket
- [`docs/deviations.md`](docs/deviations.md): accepted deviations
- [`docs/FRS.md`](docs/FRS.md) and [`docs/SDS.md`](docs/SDS.md): requirements and design
- [`docs/mcp/`](docs/mcp/README.md): Linear and Context7 MCP setup
- [`docs/WORKTREES.md`](docs/WORKTREES.md), [`docs/GRAPH-TOOLS.md`](docs/GRAPH-TOOLS.md), [`docs/TOKEN-REPORT.md`](docs/TOKEN-REPORT.md)

## Known limitations

Full list: [`docs/deviations.md`](docs/deviations.md).

- The refresh cookie is `Secure`, so the app over `http://localhost` works in Chrome and Firefox but not in Safari (D-150).
- Lighthouse runs as a local gate, not in CI (D-088).
- Branch protection on `main` is post-submission (D-026).
