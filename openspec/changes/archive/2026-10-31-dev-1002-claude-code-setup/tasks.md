# Tasks

Ticket: DEV-1002 (Linear DEV-6). One commit per task: `type(scope): description (DEV-1002)`. Per task: test-writer first, then implement, then lint, typecheck, test.

## 1. Guardrails

- [x] 1.1 Write failing tests for the settings deny/ask lists, then extend `permissions.deny` in `.claude/settings.json` (spec: Permissions deny secrets, force-push and push to main).
- [x] 1.2 Write `node:test` tests for the `block-dangerous` hook scenarios (blocked, allowed, malformed input); fix the hook only if a scenario fails (spec: Dangerous commands are blocked by hook).

## 2. Skill and documentation

- [x] 2.1 Write a failing frontmatter test, then add `.claude/skills/api-conventions/SKILL.md` (spec: Project skill for API conventions).
- [x] 2.2 Add `docs/claude-code-setup.md` describing each hook, permission group, skill and command set.

## 3. Evidence and verification

- [x] 3.1 Attempt a denied action live (read `.env`, force-push) and save the blocked transcript plus a hook run in `docs/evidence/DEV-1002/` (AC3).
- [x] 3.2 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1002-claude-code-setup --strict`.
