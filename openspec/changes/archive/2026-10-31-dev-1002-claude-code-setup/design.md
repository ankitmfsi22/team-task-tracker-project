## Context

DEV-1002 AC: (1) instructions, skills, hooks committed under `.claude/` and documented; (2) permissions deny `.env`/secrets reads, force-push, push to main, and sensitive actions need approval; (3) a denied attempt is blocked and evidenced. Existing: CLAUDE.md/AGENTS.md, hooks `block-dangerous`, `format`, `quality-gate`, permissions allow/ask/deny, 12 opsx commands and skills.

## Decisions

- **Skill**: one skill, `api-conventions`, distilled from AGENTS.md and SDS sections 4 and 6 (no new content). Smallest skill that is useful to later API tickets.
- **Permissions**: add `Bash(git push -f:*)`, `Bash(git push origin main:*)`, `Bash(git push origin master:*)`, `Bash(git push --force-with-lease:*)` to deny. `git push` stays under `ask`; the hook is the second layer for odd forms.
- **Tests**: `node:test` in `scripts/tests/` (existing tooling-test home) spawn the hook with JSON on stdin and parse settings and skill frontmatter. No tests of docs or evidence files.
- **Evidence (AC3)**: a real `Read` of `.env` attempted in-session (denied by permissions) plus a hook run transcript, saved in `docs/evidence/DEV-1002/`. Never print `.env` contents.
- **Docs**: single `docs/claude-code-setup.md`, short tables for hooks, permissions, skills, commands.
- **Hook failure mode**: `block-dangerous` fails closed (exit 2) on malformed input (changed from fail-open by the DEV-1002 guardrail-fixes PR); permission rules still apply.
- **Known limitation**: the hook matches command text, so it can false-positive when a command merely mentions a blocked string (seen during this proposal); acceptable, files are written via Write instead.

## Risks

- Regex-based hook can miss exotic forms; mitigated by permission deny rules and `ask` on all pushes.
