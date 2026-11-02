# Demo walkthrough

Two parts: run the application, then walk one ticket through the spec-driven (SDD) flow. Rules behind the flow: [`CLAUDE.md`](../CLAUDE.md) and [`workflow.md`](workflow.md). Submission index: [`SUBMISSION.md`](SUBMISSION.md).

## Part A: run the application

Needs Docker and a copy of `.env.example`. The variable names below go in `.env`; set your own values (never commit `.env`).

```bash
cp .env.example .env
# set POSTGRES_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, SEED_DEMO_PASSWORD in .env
docker compose up --build --wait
docker compose ps            # postgres, backend, frontend healthy; migrate exited (0)
```

- Open <http://localhost:8080> (use Chrome or Firefox: the refresh cookie is `Secure`, which Safari does not accept over `http://localhost`, D-150). If port 8080 is taken, set `FRONTEND_PORT=8081` before `docker compose up` (D-145).
- `migrate` applies the migrations and the demo seed, then exits; the backend starts after it. The API is only reachable through the frontend at `/api/v1`.
- Demo users (password: the value of `SEED_DEMO_PASSWORD`):

| User                 | Role in the demo project |
| -------------------- | ------------------------ |
| `alice@demo.example` | OWNER                    |
| `bob@demo.example`   | MEMBER                   |

- The seed is idempotent: `docker compose run --rm migrate` can be run again and changes nothing. Outside Docker: `pnpm --filter @team-task-tracker/backend build`, then `pnpm --filter @team-task-tracker/backend run db:seed` with `DATABASE_URL` and `SEED_DEMO_PASSWORD` set.
- Stop: `docker compose down` (add `-v` to delete the database volume).

Recorded run of this exact flow, including a login through the containerized app: [`evidence/DEV-1018/`](evidence/DEV-1018/).

Quality gates and the Playwright user journey (register, project, tasks, comments, activity):

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:e2e                 # throwaway PostgreSQL, built backend, vite preview, Chromium
```

## Part B: one ticket through the SDD flow

Worked example: DEV-1017 (Linear DEV-21), archived at `openspec/changes/archive/2026-11-02-dev-1017-independent-review/`. Replace `DEV-XXXX`, `dev-xxxx-name` and `{domain}`.

1. **Branch from a fresh main.** Branch name `feature/{domain}/DEV-XXXX-{short-name}`.

   ```bash
   git checkout main && git pull
   git checkout -b feature/infra/DEV-XXXX-short-name
   ```

2. **Fetch the ticket through Linear MCP** (not a copy). In Claude Code: "Fetch Linear DEV-NN" (`mcp__linear__get_issue`). The Assignment-to-Linear ID map is in [`tickets/README.md`](tickets/README.md); MCP setup in [`mcp/README.md`](mcp/README.md).
3. **Explore** when the problem is unclear: `/opsx:explore DEV-XXXX`. Library APIs are checked with Context7 MCP first.
4. **Propose**: `/opsx:propose dev-xxxx-name` writes `proposal.md`, `design.md`, `tasks.md` and `specs/<capability>/spec.md`.

   ```bash
   cp docs/templates/approvals.md  openspec/changes/dev-xxxx-name/approvals.md
   cp docs/templates/review-log.md openspec/changes/dev-xxxx-name/review-log.md
   openspec validate dev-xxxx-name --strict
   ```

   Revise with `/opsx:update dev-xxxx-name`. No production code yet.

5. **Gate 1 (human)**: add a Gate 1 entry (`Approved`) to `approvals.md` and commit it: `docs(infra): approve DEV-XXXX at Gate 1 (DEV-XXXX)`.
6. **Apply**: `/opsx:apply dev-xxxx-name`. For each task the `test-writer` sub-agent writes failing tests from the spec scenarios, then the code is written, then:

   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   git commit -m "feat(scope): description (DEV-XXXX)"   # one commit per task
   ```

7. **Verify and review**: `/opsx:verify dev-xxxx-name`, then the `reviewer` sub-agent in a fresh context. The main session saves its findings verbatim in `review-log.md`; blocking findings are fixed, non-blocking ones go to `docs/deviations.md`.
8. **Pull request** from `.github/pull_request_template.md`:

   ```bash
   git push -u origin feature/infra/DEV-XXXX-short-name
   gh pr create --title "DEV-XXXX: title" --body-file pr-body.md
   ```

9. **Gate 2 (human)**: add a Gate 2 entry to `approvals.md`. Then, on the branch before the merge (D-033):

   ```bash
   # in Claude Code
   /opsx:sync dev-xxxx-name
   /opsx:archive dev-xxxx-name
   # then append the row to docs/traceability.md and merge the PR
   ```

Every archived change must hold `proposal.md`, `design.md`, `tasks.md`, `specs/`, `approvals.md` and `review-log.md`; `scripts/check-changes.mjs` enforces this in `pnpm test` and CI.
