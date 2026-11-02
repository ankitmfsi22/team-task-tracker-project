# Submission index (ASSIGNMENT.md §9)

Each item links evidence that exists in this repository. Status: **met** or **partial** (with the reason). Pull request for the last ticket: DEV-1018 (link in the PR list on GitHub; every ticket DEV-1001 to DEV-1018 has a row in [`traceability.md`](traceability.md)). Gate 2 for DEV-1018 is recorded in its `approvals.md` by the human approver.

- [x] **1. Working application, database schema, migrations, seed data, Docker configuration** (met)
  - Backend: [`backend/`](../backend/), schema [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma), migrations [`backend/prisma/migrations/`](../backend/prisma/migrations/), seed [`backend/src/seed.ts`](../backend/src/seed.ts).
  - Frontend: [`frontend/`](../frontend/). Shared Zod schemas and the OpenAPI document: [`packages/shared/`](../packages/shared/).
  - Docker: [`docker-compose.yml`](../docker-compose.yml), [`backend/Dockerfile`](../backend/Dockerfile), [`frontend/Dockerfile`](../frontend/Dockerfile), [`.dockerignore`](../.dockerignore). A real `docker compose up --build --wait` run and a login through the containerized app: [`evidence/DEV-1018/`](evidence/DEV-1018/).
  - Run it: [`DEMO.md`](DEMO.md) part A. Pinned versions: [`VERSIONS.md`](VERSIONS.md).
- [x] **2. Issue tracker and MCP setup, operations, verification evidence** (met)
  - Setup and supported operations: [`mcp/README.md`](mcp/README.md), [`mcp/linear-tools.md`](mcp/linear-tools.md); ticket map: [`tickets/README.md`](tickets/README.md).
  - Evidence: [`evidence/DEV-1004/`](evidence/DEV-1004/) (Context7 lookup, failure handling), change `openspec/changes/archive/2026-10-31-dev-1004-mcp-integration/`.
- [x] **3. OpenSpec proposals, approved artifacts, verification results, archived changes** (met)
  - Archived changes (each with proposal, design, tasks, specs, `approvals.md`, `review-log.md`): [`openspec/changes/archive/`](../openspec/changes/archive/). Current behaviour: [`openspec/specs/`](../openspec/specs/).
  - Per-ticket row with branch, PR and Gate commits: [`traceability.md`](traceability.md). Scenario-to-test map: [`testing/scenario-test-map.md`](testing/scenario-test-map.md). Lifecycle: [`workflow.md`](workflow.md).
- [x] **4. Claude Code project instructions, agent definitions, skills, hooks, permissions** (met)
  - Instructions: [`CLAUDE.md`](../CLAUDE.md), [`AGENTS.md`](../AGENTS.md), per-package `CLAUDE.md`.
  - Agents, commands, skills, hooks, permissions: [`.claude/agents/`](../.claude/agents/), [`.claude/commands/opsx/`](../.claude/commands/opsx/), [`.claude/skills/`](../.claude/skills/), [`.claude/hooks/`](../.claude/hooks/), [`.claude/settings.json`](../.claude/settings.json). Explained in [`claude-code-setup.md`](claude-code-setup.md) and [`agents.md`](agents.md); denied-action evidence: [`evidence/DEV-1002/denied-actions.md`](evidence/DEV-1002/denied-actions.md).
  - Known gap: the quality-gate hook fails open on malformed input (D-019, post-submission).
- [x] **5. Git worktree and parallel integration evidence** (met)
  - Guide: [`WORKTREES.md`](WORKTREES.md); evidence: [`evidence/DEV-1014/parallel-work.md`](evidence/DEV-1014/parallel-work.md) and `worktree.md` in [`evidence/DEV-1007/`](evidence/DEV-1007/), [`evidence/DEV-1008/`](evidence/DEV-1008/), [`evidence/DEV-1011/`](evidence/DEV-1011/), [`evidence/DEV-1012/`](evidence/DEV-1012/).
- [x] **6. Code Review Graph and Graphify setup, versions, queries, review evidence** (met)
  - Setup, versions, queries, limits: [`GRAPH-TOOLS.md`](GRAPH-TOOLS.md); evidence: [`evidence/DEV-1015/`](evidence/DEV-1015/) and graph-assisted review in [`evidence/DEV-1017/graph.md`](evidence/DEV-1017/graph.md).
- [x] **7. Token-efficiency comparison (baseline, method, results, limitations)** (met)
  - [`TOKEN-REPORT.md`](TOKEN-REPORT.md).
- [x] **8. Unit, integration, security-related and end-to-end test results** (met)
  - Final gate output on the integrated branch: [`evidence/DEV-1018/gates.md`](evidence/DEV-1018/gates.md).
  - Coverage and flakiness: [`evidence/DEV-1016/coverage.md`](evidence/DEV-1016/coverage.md), [`evidence/DEV-1016/flaky.md`](evidence/DEV-1016/flaky.md); Lighthouse: [`evidence/DEV-1016/lighthouse.md`](evidence/DEV-1016/lighthouse.md); Playwright journey: [`e2e/journey.spec.ts`](../e2e/journey.spec.ts) and its report in [`evidence/DEV-1016/playwright-report/`](evidence/DEV-1016/playwright-report/).
  - Security: [`evidence/DEV-1017/security-audit.md`](evidence/DEV-1017/security-audit.md), [`review/final-review.md`](review/final-review.md), earlier audits in [`evidence/DEV-1006/09-security-auditor.md`](evidence/DEV-1006/09-security-auditor.md), [`evidence/DEV-1008/security-auditor.md`](evidence/DEV-1008/security-auditor.md), [`evidence/DEV-1011/03-security-audit.md`](evidence/DEV-1011/03-security-audit.md).
- [x] **9. Pull request with ticket, spec, test and review traceability** (met, Gate 2 pending for DEV-1018)
  - PR template: [`.github/pull_request_template.md`](../.github/pull_request_template.md); every PR links its Linear ticket, change, FRS IDs, scenario-to-test map, `review-log.md` and deviations. Index of all tickets, branches and PRs: [`traceability.md`](traceability.md). DEV-1018 change: [`openspec/changes/dev-1018-final-integration/`](../openspec/changes/dev-1018-final-integration/).
  - Accepted deviations: [`deviations.md`](deviations.md).
- [x] **10. Workflow demonstration and retrospective** (met)
  - [`DEMO.md`](DEMO.md) (commands for the app and for one ticket through the SDD flow) and [`RETROSPECTIVE.md`](RETROSPECTIVE.md). The demonstration is a written command walkthrough, not a screen recording.

## Open items (not hidden)

- Branch protection on `main` is not enabled: it needs the repo owner's verified email (D-026, post-submission).
- Post-submission hardening is listed in [`deviations.md`](deviations.md) (rate limiting, token-family revocation, secret-strength checks, security headers, fail-closed hook).
