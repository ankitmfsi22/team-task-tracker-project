# Spec Delta

## ADDED Requirements

### Requirement: Actions and Dockerfile images are pinned immutably
Every `uses:` reference in `.github/workflows/` SHALL be a full 40-character commit SHA with the version it resolves to in a trailing comment, and every `FROM` in a Dockerfile SHALL use an exact version tag. The pinning check SHALL fail on a tag-only or branch Action ref and on a `latest` or floating Dockerfile tag.

#### Scenario: SHA-pinned action passes
- **WHEN** the pinning check runs on a workflow whose `uses:` refs are 40-character SHAs with version comments
- **THEN** it exits 0

#### Scenario: Floating action ref is rejected
- **WHEN** a workflow uses `actions/checkout@v7` or `actions/checkout@main`
- **THEN** the pinning check exits non-zero and names the action

#### Scenario: Floating Dockerfile tag is rejected
- **WHEN** a Dockerfile has `FROM node:latest` or `FROM node:22`
- **THEN** the pinning check exits non-zero and names the file

### Requirement: Release-age exclusions are removed when unneeded
`minimumReleaseAgeExclude` entries SHALL be kept only while `pnpm install --frozen-lockfile` fails without them; each kept entry SHALL remain documented in `docs/VERSIONS.md` with the reason.

#### Scenario: Install passes without removed entries
- **WHEN** the exclusions are removed from `pnpm-workspace.yaml`
- **THEN** `pnpm install --frozen-lockfile` exits 0
