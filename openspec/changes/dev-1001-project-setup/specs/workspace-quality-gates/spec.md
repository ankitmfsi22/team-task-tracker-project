# Spec Delta

## Purpose

Defines the monorepo layout and the quality gates (build, lint, typecheck, test, format) that every later change must keep passing, plus the pre-commit enforcement and line-ending rules that keep the repository consistent on Windows and Linux.

## ADDED Requirements

### Requirement: Workspace layout
The repository SHALL be a pnpm workspaces monorepo with the packages `backend`, `frontend` and `packages/shared`, each installable and runnable through the root.

#### Scenario: Packages are discovered
- **WHEN** a developer runs `pnpm -r list --depth -1` at the repository root
- **THEN** the output includes `backend`, `frontend` and `packages/shared`

#### Scenario: Install from clean checkout
- **WHEN** a developer runs `pnpm install --frozen-lockfile` on a fresh clone
- **THEN** the install succeeds without modifying the lockfile

### Requirement: Root quality gate scripts
The root `package.json` SHALL provide `build`, `lint`, `typecheck` and `test`, each running across all workspace packages and exiting 0 on the stub packages and non-zero when any package fails.

#### Scenario: All gates pass on the stubs
- **WHEN** a developer runs `pnpm build`, `pnpm lint`, `pnpm typecheck` and `pnpm test` on a clean checkout
- **THEN** every command exits with code 0

#### Scenario: Type error fails the gate
- **WHEN** a TypeScript type error is introduced in any package and `pnpm typecheck` is run
- **THEN** the command exits non-zero and names the offending file

#### Scenario: Failing test fails the gate
- **WHEN** a test in any package fails and `pnpm test` is run
- **THEN** the command exits non-zero

### Requirement: Format scripts
The root SHALL provide `format` (writes Prettier changes) and `format:check` (fails on unformatted files).

#### Scenario: Format check detects drift
- **WHEN** a test generates a non-Prettier-formatted file in an OS temp directory and runs the format check on it
- **THEN** the check exits non-zero and lists the file

#### Scenario: Format fixes drift
- **WHEN** `pnpm format` is run and then `pnpm format:check`
- **THEN** both exit with code 0

### Requirement: Placeholder scripts
`pnpm test:e2e` and `pnpm lighthouse` SHALL exist and, until their owning tickets are done, print a "not implemented" message naming the owning ticket and exit 0.

#### Scenario: E2E placeholder
- **WHEN** a developer runs `pnpm test:e2e`
- **THEN** the output contains "not implemented — DEV-1016" and the exit code is 0

#### Scenario: Lighthouse placeholder
- **WHEN** a developer runs `pnpm lighthouse`
- **THEN** the output contains "not implemented — DEV-1011" and the exit code is 0

### Requirement: Strict TypeScript and lint rules
All packages SHALL compile with TypeScript strict mode, and lint SHALL reject `any`, `@ts-ignore` and `eslint-disable` comments that lack a ticket ID.

#### Scenario: Explicit any is rejected
- **WHEN** a test generates a source file with an explicit `any` type in an OS temp directory and lints it with the repository lint configuration
- **THEN** linting fails and reports the rule violation

#### Scenario: ts-ignore is rejected
- **WHEN** a test generates a source file containing `@ts-ignore` in an OS temp directory and lints it
- **THEN** linting fails

#### Scenario: eslint-disable without a ticket ID is rejected
- **WHEN** a test generates a source file with an `eslint-disable` comment that has no ticket ID in an OS temp directory and lints it
- **THEN** linting fails

### Requirement: Pre-commit enforcement
A Git pre-commit hook SHALL run lint and Prettier checks on staged files and abort the commit when any check fails.

#### Scenario: Staged lint error blocks the commit
- **WHEN** a file with a lint error is staged and `git commit` is run
- **THEN** the commit is aborted, the lint error is shown, and no commit is created

#### Scenario: Clean staged files commit
- **WHEN** only lint-clean, formatted files are staged and `git commit` is run
- **THEN** the hook passes and the commit is created

#### Scenario: Hook works on Windows
- **WHEN** a commit is attempted from Git Bash or PowerShell on Windows
- **THEN** the hook executes (hook files use LF endings) and enforces the same result as on Linux

### Requirement: Line-ending normalization
The repository SHALL store text files with LF endings, enforced by `.gitattributes` (`* text=auto eol=lf`), `.editorconfig` and Prettier `endOfLine: lf`.

#### Scenario: No CRLF in the index
- **WHEN** `git add --renormalize .` is run on the finished change
- **THEN** it stages no further modifications and `git ls-files --eol` shows no `i/crlf` text files

#### Scenario: CRLF file fails format check
- **WHEN** a test generates a file with CRLF endings in an OS temp directory and runs the format check on it
- **THEN** the check exits non-zero

### Requirement: Negative fixtures are generated, never committed
Tests that need invalid input (misformatted, CRLF, `any`, `@ts-ignore`, `eslint-disable`, version ranges, `latest`, floating image tags) SHALL generate it in an OS temp directory at test time and remove it afterwards. The repository MUST NOT contain committed negative fixture files.

#### Scenario: Fixtures live in the OS temp directory
- **WHEN** a negative test runs
- **THEN** its invalid files are created under the OS temp directory and deleted when the test finishes

#### Scenario: No committed fixtures
- **WHEN** the tracked files are searched for intentionally invalid fixture content after the change is complete
- **THEN** none are found and `pnpm lint`, `pnpm typecheck` and `pnpm format:check` pass without any ignore entry for fixtures
