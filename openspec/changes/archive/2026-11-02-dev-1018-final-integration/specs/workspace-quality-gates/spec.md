# Spec Delta

## MODIFIED Requirements

### Requirement: Continuous integration runs the gates
A GitHub Actions workflow `.github/workflows/ci.yml` SHALL run the quality gates on every pull request and on every push to `main`, using Node and pnpm versions from the repository and only actions pinned to a full commit SHA, with the version tag kept as a trailing comment.

#### Scenario: Workflow triggers and steps
- **WHEN** `.github/workflows/ci.yml` is inspected
- **THEN** it triggers on `pull_request` and on `push` to `main`, and runs in order: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint` (including the pinning check), `pnpm typecheck`, `pnpm test`, `pnpm build`, `openspec validate --all --strict` and `pnpm audit --audit-level=high`

#### Scenario: Actions are pinned
- **WHEN** every `uses:` reference in the workflow is inspected
- **THEN** each is a full 40-character commit SHA with its version tag in a trailing comment, with no `latest`, `main`, floating major tag or tag-only reference

#### Scenario: Versions come from the repository
- **WHEN** the workflow's Node and pnpm setup is inspected
- **THEN** Node is read from `.nvmrc` and pnpm from `packageManager`, with no separately hard-coded version

#### Scenario: Runner and history are pinned for reproducibility
- **WHEN** the workflow's job and checkout step are inspected
- **THEN** the job runs on an exact runner label (`ubuntu-24.04`, never a `*-latest` label) and the checkout step fetches full history with `fetch-depth: 0`, because tests assert git history

#### Scenario: Floating action reference is rejected
- **WHEN** a test generates a workflow file in an OS temp directory with an action ref such as `@main`, `@latest` or a floating major tag, and runs the pinning check on that directory
- **THEN** the check exits non-zero and names the workflow file and action

#### Scenario: Workflow passes on the pushed branch
- **WHEN** the feature branch is pushed and the workflow runs
- **THEN** every step succeeds, and the run link is saved in `docs/evidence/DEV-1001/`
