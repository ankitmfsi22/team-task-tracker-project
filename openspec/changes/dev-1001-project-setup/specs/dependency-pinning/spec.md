# Spec Delta

## Purpose

Guarantees reproducible builds by requiring exact, documented versions for every tool, dependency and image, and by providing an automated check that rejects floating versions.

## ADDED Requirements

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
A pinning check script SHALL scan all `package.json` files and Docker image references, and SHALL run as part of `pnpm lint`.

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

### Requirement: Versions are documented
`docs/VERSIONS.md` SHALL list the exact version of every runtime, tool, library and image in the tech stack, and SHALL record the reason for the chosen Prisma major version.

#### Scenario: Prisma rationale recorded
- **WHEN** `docs/VERSIONS.md` is read
- **THEN** it states the pinned Prisma version, the date it was checked against the npm registry, and why that major was chosen

#### Scenario: Documented versions match manifests
- **WHEN** the versions in `docs/VERSIONS.md` are compared with `package.json`, `.nvmrc` and `docker-compose.yml`
- **THEN** they are identical
