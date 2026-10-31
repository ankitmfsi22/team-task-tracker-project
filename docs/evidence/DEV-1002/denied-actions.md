# DEV-1002 evidence: denied actions and skill pickup

Recorded 2026-10-31 during `/opsx:apply` of `dev-1002-claude-code-setup`, on branch `feature/infra/DEV-1002-claude-code-setup`. File contents of any `.env` were never read or printed.

## AC3: live denied attempts (real tool calls in the Claude Code session)

| #   | Attempt                                | Layer                                 | Result (verbatim)                                                                          |
| --- | -------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `Read` tool on `<repo>/.env`           | permissions `deny` (`Read(./.env*)`)  | `File is in a directory that is denied by your permission settings.`                       |
| 2   | Bash: print the `.env` file            | PreToolUse hook `block-dangerous.mjs` | `Blocked by .claude/hooks/block-dangerous.mjs: reading or printing .env files is blocked.` |
| 3   | Bash: force push of the feature branch | PreToolUse hook `block-dangerous.mjs` | `Blocked by .claude/hooks/block-dangerous.mjs: force push is blocked.`                     |

Nothing was pushed or read; every attempt was stopped before execution.

## Hook block/allow and permission checks (automated)

`node --test --test-reporter=spec scripts/tests/claude-hooks.test.mjs scripts/tests/claude-permissions.test.mjs scripts/tests/claude-skill.test.mjs`

```
✔ blocks reading .env
✔ blocks git push --force
✔ blocks git push -f
✔ blocks pushing to main
✔ allows pnpm test
✔ allows cat .env.example
✔ allows pushing a feature branch
✔ non-JSON stdin exits 0 with no output
✔ Deny list covers secrets and risky pushes
✔ Sensitive actions require approval
✔ Skill frontmatter is valid
ℹ tests 11 / pass 11 / fail 0
```

## Skill pickup: `api-conventions`

1. Right after the skill file was written, Claude Code's system context listed it as available:
   `- api-conventions: REST API conventions for this project (/api/v1, status codes, error shape, pagination, sorting, validation, authorization). Use when adding or changing backend routes, controllers, services, or shared Zod schemas.`
2. Invoking it through the Skill tool (`api-conventions`) loaded the body from `.claude/skills/api-conventions` (sections: Routes and layers, Status codes, Error shape, Pagination and sorting, Authorization, Every endpoint needs tests for).

## Observed limitation

While drafting this change, the hook also blocked a harmless shell command whose text merely contained a blocked string (a false positive). Documented in `design.md` and `docs/claude-code-setup.md`; files are written with the Write tool instead.
