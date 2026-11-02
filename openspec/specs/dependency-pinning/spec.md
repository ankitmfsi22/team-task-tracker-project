# dependency-pinning Specification

## Purpose

Guarantees reproducible builds by requiring exact, documented versions for every tool, dependency and image, and by providing an automated check that rejects floating versions.

## Requirements

### Requirement: Toolchain versions are pinned
The repository SHALL pin the package manager (`packageManager`), the Node.js version (`engines` and `.nvmrc`) and SHALL commit `pnpm-lock.yaml`.

#### Scenario: Node version declared consistently
- **WHEN** `.nvmrc` and the `engines.node` field are compared
- **THEN** both specify Node.js 22 and are consistent

#### Scenario: Lockfile is committed
- **WHEN** `git ls-files pnpm-lock.yaml` is run
- **THEN** the file is listed

### Requirement: Dependencies use exact versions
All dependency specifiers in every `package.json` SHALL be exact versions, and `.npmrc` SHALL set `save-exact=true`. Ranges (`^`, `~`, `*`, `>`, `<`) and the tags `latest` and `next` MUST NOT be used.

#### Scenario: New dependency is saved exactly
- **WHEN** a dependency is added with `pnpm add`
- **THEN** its `package.json` entry has no range prefix

#### Scenario: Range is rejected
- **WHEN** a test generates a `package.json` in an OS temp directory containing a range such as `"zod": "^3.0.0"` and runs the pinning check on that directory
- **THEN** the check exits non-zero and names the package and file

#### Scenario: Latest tag is rejected
- **WHEN** a test generates a `package.json` or Compose file in an OS temp directory that uses `latest`, and runs the pinning check on it
- **THEN** the pinning check exits non-zero

### Requirement: Pinning check is part of the gates
A pinning check script SHALL scan all `package.json` files, Docker image references, and GitHub Actions workflow `uses:` and `runs-on:` values, and SHALL run as part of `pnpm lint`.

#### Scenario: Floating runner label is rejected
- **WHEN** a test generates a workflow in an OS temp directory with `runs-on: ubuntu-latest` (or another `*-latest` label, including list form) and runs the pinning check on that directory
- **THEN** the check exits non-zero and names the workflow file and the label, while an exact label such as `ubuntu-24.04` passes

#### Scenario: Clean repository passes
- **WHEN** `pnpm lint` is run on the finished change
- **THEN** the pinning check runs and exits 0

#### Scenario: Violation fails the check
- **WHEN** a test generates a floating version in an OS temp directory and runs the same check that `pnpm lint` invokes
- **THEN** the check exits non-zero, so `pnpm lint` would fail on the same input

### Requirement: Lint toolchain versions are mutually supported
The pinned TypeScript and ESLint versions SHALL fall within the peer-dependency ranges declared by the pinned typescript-eslint version.

#### Scenario: Pinned versions satisfy typescript-eslint peers
- **WHEN** the pinned `typescript` and `eslint` versions are compared with the peer ranges of the pinned `typescript-eslint` package
- **THEN** both versions satisfy those ranges and `pnpm install` reports no peer-dependency warning for them

### Requirement: Package-manager policy exceptions are explicit
Exceptions to pnpm's install-script and release-age policies SHALL be declared in `pnpm-workspace.yaml` and listed in `docs/VERSIONS.md`, so `pnpm install --frozen-lockfile` exits 0 without prompting.

#### Scenario: Install scripts are decided, not ignored
- **WHEN** `pnpm install --frozen-lockfile` is run on a fresh clone
- **THEN** it exits 0, with `prisma` and `@prisma/engines` set to `false` under `allowBuilds`

#### Scenario: Release-age exclusions are documented
- **WHEN** `pnpm-workspace.yaml` lists `minimumReleaseAgeExclude` entries
- **THEN** each entry is an exact `name@version` of a version approved for this ticket and appears in `docs/VERSIONS.md`

### Requirement: Versions are documented
`docs/VERSIONS.md` SHALL list the exact version of every runtime, tool, library and image in the tech stack, and SHALL record the reason for the chosen Prisma major version.

#### Scenario: Prisma rationale recorded
- **WHEN** `docs/VERSIONS.md` is read
- **THEN** it states the pinned Prisma version, the date it was checked against the npm registry, and why that major was chosen

#### Scenario: Documented versions match manifests
- **WHEN** the versions in `docs/VERSIONS.md` are compared with `package.json`, `.nvmrc` and `docker-compose.yml`
- **THEN** they are identical

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
