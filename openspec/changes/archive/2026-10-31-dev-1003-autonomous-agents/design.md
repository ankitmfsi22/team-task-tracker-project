## Context

DEV-1003 AC: (1) agents for implementation, test writing, review, coordination with scope, permitted actions, outputs, restrictions; (2) reviewer read-only, compares diff to approved spec and test evidence; (3) findings saved verbatim in `review-log.md`; (4) demo run shows test-writer producing failing tests before implementation. AC3 is already the workflow rule in CLAUDE.md (main session saves the reviewer table); the reviewer already returns a table for that.

## Decisions

- **Implementer**: tools `Read, Grep, Glob, Edit, Write, Bash`; one task per invocation; edits only non-test files in the task scope; runs lint, typecheck, test; returns changed files plus test output. Does not commit, add packages or touch approvals.
- **Coordinator**: read-only (`Read, Grep, Glob`). Sub-agents generally cannot spawn sub-agents, so the coordinator returns a delegation plan (task group, order, agent, inputs, done check) and the main session performs the delegation and commits. It never approves its own work, Gate 1 or Gate 2.
- **Reviewer**: tools unchanged (already read-only); add explicit inputs "approved spec" and "`pnpm test` output" and a rule to ignore implementer summaries. No Bash widening.
- **db-change-checker / security-auditor**: kept as is; listed in the docs table as specialist agents.
- **Docs**: one `docs/agents.md` table, not per-agent docs.
- **Tests**: one `scripts/tests/agents.test.mjs` parsing frontmatter, headings and tool lists (tooling-test home from DEV-1002); no tests about evidence files.
- **Evidence (AC4)**: the test-writer creates the test first; its failing output (missing implementer/coordinator) is saved before implementation, then the passing run. The coordinator plan used for this change is saved too.
- **Headings**: each role agent uses Scope, Permitted actions, Expected output, Restrictions (existing reviewer and test-writer are reshaped to these).

## Risks

- Heading-based tests are brittle to wording; mitigated by checking only the four heading names, tool lists and a few key phrases.
- The coordinator cannot truly spawn agents; documented limitation, the main session delegates.
