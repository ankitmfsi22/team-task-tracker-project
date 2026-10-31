# Agents

Sub-agent definitions live in `.claude/agents/`. The main session delegates, saves results and commits; no agent approves its own work, and gates are approved by the human in `approvals.md`.

| Agent               | Scope                                                  | Permitted actions                                              | Expected output                                                  | Restrictions                                                                                   |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `coordinator`       | Active change: tasks, specs, design, approvals         | Read; check Gate 1; group and order tasks                      | Delegation plan table (group, order, agent, inputs, done check)  | Read-only; never approves its own work, Gate 1 or Gate 2; no scope beyond `tasks.md`           |
| `test-writer`       | Test files for one task's spec scenarios               | Write and run tests                                            | Test files, scenarios covered, failing output with the right reason | Tests only; never edits implementation or weakens tests; one test per scenario                 |
| `implementer`       | One task of the change, non-test files                 | Edit task-scope files; run lint, typecheck, test, build        | Changed files and gate results                                   | Needs failing tests first; never edits tests; no commits, packages or approvals                |
| `reviewer`          | Branch diff against the approved spec, in fresh context | Read; `git diff`; `pnpm test`                                  | Findings table (saved verbatim to `review-log.md` by the main session) | Read-only; never approves; ignores the implementer's summary; verdict from its own test output |
| `db-change-checker` | Prisma schema and migrations                           | Read, search                                                   | Findings table                                                   | Read-only; use whenever `prisma/` changes                                                      |
| `security-auditor`  | Dependencies, secrets, sensitive data, auth and tokens | Read; `pnpm audit` and read-only inspection                    | Findings table                                                   | No source edits; use before a PR and at integration checkpoints                                |

## Flow per task

coordinator plan → test-writer (failing tests) → implementer (passing, gates green) → main session commits → after all tasks: `/opsx:verify` → reviewer (fresh context) → findings saved to `review-log.md`.

Limitation: sub-agents cannot spawn sub-agents, so the coordinator only plans; the main session does the delegation.

Evidence of a run: `docs/evidence/DEV-1003/`.
