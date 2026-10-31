# Tasks

Ticket: DEV-1003 (Linear DEV-7). One commit per task: `type(scope): description (DEV-1003)`. Per task: test-writer first, then implement, then lint, typecheck, test.

## 1. Agent definitions

- [x] 1.1 test-writer writes `scripts/tests/agents.test.mjs` from the spec scenarios; save the failing output to `docs/evidence/DEV-1003/` (AC4).
- [x] 1.2 Add `.claude/agents/implementer.md` and `coordinator.md` (spec: Every agent defines its boundaries; Coordinator delegates but cannot approve; Implementer and test-writer are separated).
- [x] 1.3 Reshape `reviewer.md` and `test-writer.md` to the four headings and add spec/test-evidence rules to the reviewer (spec: Reviewer is read-only and evidence-based).

## 2. Documentation

- [x] 2.1 Add `docs/agents.md` table for all agents and update the agents line in `docs/claude-code-setup.md` (spec: Agents are documented in one table).

## 3. Evidence and verification

- [x] 3.1 Run the coordinator on this change; save its delegation plan and the failing-then-passing test runs in `docs/evidence/DEV-1003/`.
- [x] 3.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1003-autonomous-agents --strict`.
