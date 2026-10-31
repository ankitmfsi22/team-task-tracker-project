# Assignment: Team Task Tracker — AI-Assisted Development Workflow

**Claude Code · OpenSpec · Autonomous Agents · Git Worktrees · MCP** 

## 1. Problem Statement

Build a full-stack Team Task Tracker where authenticated users can create projects, manage tasks, assign team members, track status, set priorities and deadlines, and view comments and activity history.

This is both a coding exercise and a workflow engineering exercise. You will be evaluated on the quality of the application and how you combine Spec-Driven Development (SDD), Claude Code, autonomous agents, Git worktrees, MCP, and codebase-graph tools.

Every ticket must follow the approved OpenSpec workflow before implementation. Requirements must be traceable from the issue tracker to specifications, code, tests, review, and pull request.

## 2. Fixed Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TypeScript + Vite |
| UI and state | Tailwind CSS + shadcn/ui + TanStack Query |
| Backend | Node.js 22 + Express 5 + TypeScript |
| Database | PostgreSQL 16 + Prisma ORM |
| Authentication | JWT access and refresh tokens |
| Validation / API | Zod + OpenAPI 3.1 |
| Testing | Vitest + Supertest + Playwright |
| Monorepo | pnpm workspaces |
| AI development | Claude Code |
| SDD | OpenSpec |
| Documentation | Context7 MCP |
| Issue tracker | Plane (self-hosted), or hosted Linear/Jira with a verified MCP integration |
| Parallel work | Git worktrees |
| Codebase analysis / token efficiency | Code Review Graph + Graphify |
| Version control | Git + GitHub pull requests |
| Quality | ESLint + Prettier + TypeScript |
| Local infrastructure | Docker Compose |

Pin versions and document the versions used. Do not use `@latest` or unpinned Docker images.

## 3. Issue Tracker and MCP Setup

Use a real issue tracker as the source of assignment requirements.

- Preferred: Plane Community Edition using its official Docker Compose deployment.
- Alternative: Linear or Jira Cloud, provided the candidate can access the workspace and configure a supported MCP integration.
- Create a project and tickets with descriptions, acceptance criteria, and dependencies.
- Configure the appropriate MCP integration in Claude Code and demonstrate a real ticket lookup.
- Verify available tools, permissions, and error handling. Do not assume every tracker MCP supports every operation.
- Never commit API tokens, credentials, or environment files containing secrets.
- If the live tracker or MCP is unavailable, document the failure and use an explicitly labelled fixture. Do not claim fixture data came from a live tracker.

## 4. Features to Build

### Authentication and authorization

- Register, login, and logout.
- JWT access and refresh tokens.
- Protected routes and role-based permissions.
- Secure password hashing and input validation.

### Projects

- Create, view, update, and archive projects.
- Add and remove members.
- Restrict access to authorized project members.

### Tasks

- Create, view, update, and archive tasks.
- Assign tasks to project members.
- Set status, priority, description, and due date.
- Filter, sort, and paginate by status, priority, assignee, and due date.
- Validate task transitions and project membership.

### Comments and activity

- Add, edit, and delete authorized comments.
- Record task creation, assignment, status changes, and archiving.
- Show activity history with actor, action, timestamp, and relevant change metadata.

### AI-assisted development workflow

- Use native OpenSpec commands for the SDD lifecycle.
- Configure Claude Code project instructions, skills, hooks, permissions, and specialized agents.
- Use Git worktrees for independent parallel tasks.
- Integrate the issue tracker through MCP.
- Use Code Review Graph and Graphify to understand the codebase, identify affected code, and reduce unnecessary context loading.
- Produce evidence of workflow execution, verification, review, and token-efficiency measurements.

## 5. Out of Scope

Do not build real-time collaboration, chat/video, file attachments, native mobile apps, OAuth/social login, payments, email delivery, AI-based task prioritization, a custom issue tracker, a custom MCP server, or autonomous production deployments unless explicitly approved.

## 6. Ticket Sequence

Follow this sequence. Parallel execution is allowed only where marked and after dependencies and shared contracts are approved.

| Ticket | Description |
| --- | --- |
| DEV-1001 | Project setup — monorepo, Docker Compose, Prisma, OpenSpec, project instructions and quality checks |
| DEV-1002 | Claude Code setup — skills, hooks, permissions and project instructions |
| DEV-1003 | Autonomous agents — implementation, testing, independent review and coordination |
| DEV-1004 | MCP — Context7 and issue-tracker integration, permissions and failure handling |
| DEV-1005 | OpenSpec workflow — ticket-to-change traceability, approval gates, verification and archival |
| DEV-1006 | Authentication — registration, login, logout and token handling |
| DEV-1007 | Projects — CRUD, membership and access control **[PARALLEL after approved contracts]** |
| DEV-1008 | Tasks — CRUD, assignment, status, priority and deadlines **[PARALLEL after auth and API contracts]** |
| DEV-1009 | Task filtering — pagination, sorting and filtering |
| DEV-1010 | Comments and activity history |
| DEV-1011 | Frontend — authentication and project pages **[PARALLEL after API contracts]** |
| DEV-1012 | Frontend — task list, filters and detail pages **[PARALLEL after API contracts]** |
| DEV-1013 | Frontend — comments, activity history and task editing |
| DEV-1014 | Git worktrees — parallel development, integration and conflict resolution |
| DEV-1015 | Codebase graph setup — Code Review Graph and Graphify, graph generation, queries and token-efficiency evaluation |
| DEV-1016 | Testing — unit, integration, authorization, regression and end-to-end tests |
| DEV-1017 | Independent review — specification compliance, security, graph-assisted impact analysis and test coverage |
| DEV-1018 | Final integration — end-to-end user journey, issue-to-PR traceability and workflow demonstration |

## 7. Non-Negotiable Workflow Rules

### A. OpenSpec and requirements

**Rule 1 — Retrieve the ticket first.** Use MCP to fetch the actual ticket and acceptance criteria before preparing the change. Verify the issue key and dependencies.

**Rule 2 — Use native OpenSpec commands.** Use the commands supported by the installed OpenSpec workflow, such as `/opsx:propose`, `/opsx:explore` when needed, `/opsx:apply`, `/opsx:verify`, and `/opsx:archive`. Confirm exact commands against the installed version.

**Rule 3 — Human approval is mandatory.** Review the proposal and required specification artifacts before implementation. Do not begin implementation while approval is pending.

**Rule 4 — Follow the lifecycle.** Explore when needed, propose, review and approve, implement, verify, independently review, and archive completed changes. Do not skip required stages.

**Rule 5 — Verify documentation.** Use Context7 MCP to check relevant library APIs when available. If it fails, document the limitation and consult authoritative documentation.

### B. Claude Code and autonomous agents

**Rule 6 — Use agents with defined responsibilities.** Configure agents for implementation, test writing, code review, and coordination where appropriate. Document their scope, permitted actions, expected outputs, and restrictions.

**Rule 7 — Review independently.** The review agent must compare the implementation with approved specifications and test evidence. It must not simply approve its own work or rely only on the implementer's summary.

**Rule 8 — Control risky actions.** Configure Claude Code permissions and hooks. Require approval for sensitive or destructive actions and verify changes produced by agents.

### C. Git worktrees and parallel work

**Rule 9 — Isolate parallel work.** Use separate Git worktrees and branches for independent tasks marked `[PARALLEL]`.

**Rule 10 — Agree on contracts first.** Approve shared types, API contracts, database interfaces, and integration boundaries before parallel frontend/backend implementation.

**Rule 11 — Demonstrate integration.** Show branch integration, conflict resolution, and verification. Worktrees isolate files; they do not automatically resolve conflicts.

### D. Code Review Graph, Graphify, and token optimisation

**Rule 12 — Set up both graph tools.** Install and configure Code Review Graph and Graphify according to their official documentation. Record versions and setup steps. If a tool is incompatible or unavailable, document the issue and obtain approval for an alternative.

**Rule 13 — Build and query the codebase graph.** Generate the graph for the repository. Use targeted graph queries to understand relevant files, dependencies, call relationships, and affected tests before reading broad areas of the codebase.

**Rule 14 — Use graph-assisted code review.** Use Code Review Graph to inspect the change's impact radius, dependent code, and relevant tests. Use its delta or PR review capabilities where supported. Use Graphify to query code relationships and trace relevant paths rather than repeatedly scanning the whole repository.

**Rule 15 — Measure token efficiency.** For at least one representative task and one code review, record a baseline workflow and a graph-assisted workflow. Compare the available token/context usage, number of files examined, time taken, and findings. Explain the measurement method and trade-offs; do not claim a reduction without evidence.

**Rule 16 — Do not trust graph output blindly.** Confirm important findings against source code and tests. Graphs guide investigation; they do not replace reading critical code, running tests, or independent review.

### E. MCP, quality, and security

**Rule 17 — Verify MCP permissions.** Demonstrate real issue retrieval and document which operations are supported. Obtain explicit approval before creating or updating external tickets.

**Rule 18 — Handle failures safely.** Handle unavailable MCP servers, authentication failures, missing tickets, malformed responses, and unsupported operations. Never fabricate live results.

**Rule 19 — Protect secrets.** Keep API tokens and credentials out of source control and logs.

**Rule 20 — Enforce shared contracts.** Keep reusable TypeScript types and Zod schemas in a shared package.

**Rule 21 — Run quality gates.** At integration checkpoints, run:

```
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

All required checks must pass before proceeding.

**Rule 22 — Use conventional commits.** Reference the relevant issue key and follow the repository's commit convention.

### F. Before raising a pull request

**Rule 23 — Fresh-context review.** Run the independent review in a fresh Claude Code session or isolated reviewer context. Include the approved specification and relevant source code.

**Rule 24 — Resolve blocking findings.** Do not leave critical security issues, missing requirements, or mandatory test failures unresolved. Document accepted non-blocking findings.

**Rule 25 — Verify and archive.** Run OpenSpec verification and the appropriate archive command only after the change has passed its required checks and review.

**Rule 26 — Provide traceability.** The PR must link the issue, OpenSpec change, requirements covered, tests, review findings, and any deviations.

## 8. Definition of Done

A ticket is complete only when:

- [ ]  The real issue or clearly labelled fallback fixture has been verified.
- [ ]  Required OpenSpec artifacts have been reviewed and approved.
- [ ]  Implementation matches the approved change.
- [ ]  Required tests pass, including relevant error and authorization scenarios.
- [ ]  Build, lint, type-check, and test gates pass.
- [ ]  Independent review is complete and blocking findings are resolved.
- [ ]  The ticket, specification, branch, commit, tests, and PR are traceable.
- [ ]  OpenSpec verification and archival are completed at the appropriate stage.
- [ ]  Where relevant, graph-assisted impact analysis and review evidence are recorded.

The final application must also pass the Playwright user journey and full integration checks.

## 9. Final Submission Requirements

Submit:

1. Working application, database schema, migrations, seed data, and Docker configuration.
2. Issue-tracker and MCP setup instructions, supported operations, and verification evidence.
3. OpenSpec proposals, approved artifacts, verification results, and archived changes.
4. Claude Code project instructions, agent definitions, skills, hooks, and permissions.
5. Git worktree and parallel integration evidence.
6. Code Review Graph and Graphify setup, versions, queries, and review evidence.
7. Token-efficiency comparison with baseline, methodology, results, and limitations.
8. Unit, integration, security-related, and end-to-end test results.
9. Pull request with ticket/spec/test/review traceability.
10. A short workflow demonstration and retrospective covering successes, failures, human interventions, and improvements.

## 10. Evaluation Criteria

| Evaluation area | Weight |
| --- | --- |
| OpenSpec and requirement traceability | 20% |
| Claude Code setup and autonomous agents | 15% |
| Git worktrees and parallel development | 15% |
| MCP and issue-tracker integration | 15% |
| Code Review Graph, Graphify and evidence-based token optimisation | 10% |
| Application correctness, security and test quality | 20% |
| Documentation and workflow demonstration | 5% |
| **Total** | **100%** |

## Expected Outcome

Demonstrate a reliable AI-assisted development lifecycle: requirements are traceable, specifications are approved, agents work within defined boundaries, parallel changes are isolated, external tools provide real context, and the final implementation is independently verified.

**Success is measured by software quality, workflow reliability, and evidence of efficient context use—not by the number of tools installed.**