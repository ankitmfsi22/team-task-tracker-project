# claude-code-guardrails Specification

## Purpose

Defines the committed Claude Code guardrails: the block-dangerous hook, the permission deny/ask lists and the api-conventions project skill, so secret reads, force-push and push to main are blocked and sensitive actions need approval.

## Requirements

### Requirement: Dangerous commands are blocked by hook
The `block-dangerous` PreToolUse hook SHALL exit 2 with a reason on stderr for recursive forced deletes, force-push, push to `main`/`master`, hard resets, commands touching `.env` files other than `.env.example`, `curl`/`wget` and the skip-permissions flag, and SHALL exit 0 for ordinary commands.

#### Scenario: Reading .env is blocked
- **WHEN** the hook receives a Bash command `cat .env`
- **THEN** it exits 2 and stderr names the `.env` rule

#### Scenario: Force push is blocked
- **WHEN** the hook receives `git push --force origin feature/x` or `git push -f origin feature/x`
- **THEN** it exits 2 and stderr names the force-push rule

#### Scenario: Push to main is blocked
- **WHEN** the hook receives `git push origin main`
- **THEN** it exits 2 and stderr names the push-to-main rule

#### Scenario: Allowed commands pass
- **WHEN** the hook receives `pnpm test`, `cat .env.example` or `git push origin feature/infra/DEV-1002-claude-code-setup`
- **THEN** it exits 0

### Requirement: Hook resists command-form bypasses and fails closed
The hook SHALL detect force-push (long, short, `+refspec`), push to `main`/`master` (`HEAD:main`, `+main`, `refs/heads/` forms) and hard resets when git global options (`-C`, `-c`) precede the subcommand, SHALL detect recursive forced deletes given as combined or separate, short or long flags, and SHALL exit 2 on malformed input.

#### Scenario: Git global options do not bypass the hook
- **WHEN** the hook receives `git -C . push --force origin feature/x` or `git -c k=v push -f origin feature/x`
- **THEN** it exits 2 and stderr names the force-push rule

#### Scenario: Alternative main and delete forms are blocked
- **WHEN** the hook receives `git push origin HEAD:main`, `git push origin +main`, a delete command with separate recursive and force flags, `git reset --hard`, `curl`, `wget` or `--dangerously-skip-permissions`
- **THEN** it exits 2

#### Scenario: Malformed hook input fails closed
- **WHEN** the hook receives non-JSON stdin, empty stdin, or JSON without a string command
- **THEN** it exits 2 and stderr names the malformed input

### Requirement: Permissions deny secrets, force-push and push to main
`.claude/settings.json` SHALL deny reading, editing and writing `.env*` and `secrets/**`, force-push and push to `main` in all supported command forms, and SHALL place `git push`, dependency installs, Prisma migrations and `docker compose` under `ask`.

#### Scenario: Deny list covers secrets and risky pushes
- **WHEN** a test parses `.claude/settings.json`
- **THEN** `deny` contains `Read`, `Edit` and `Write` rules for `./.env*` and `./secrets/**`, `Bash(git push --force:*)`, `Bash(git push -f:*)` and `Bash(git push origin main:*)`

#### Scenario: Sensitive actions require approval
- **WHEN** a test parses `.claude/settings.json`
- **THEN** `ask` contains `Bash(git push:*)`, `Bash(pnpm install:*)` and `Bash(docker compose:*)`, and `allow` contains none of them

### Requirement: Project skill for API conventions
The repository SHALL contain `.claude/skills/api-conventions/SKILL.md` with valid frontmatter (`name` equal to the directory name, non-empty `description`) summarising the `/api/v1` conventions from SDS sections 4 and 6.

#### Scenario: Skill frontmatter is valid
- **WHEN** a test reads `.claude/skills/api-conventions/SKILL.md`
- **THEN** `name` is `api-conventions` and `description` is non-empty
