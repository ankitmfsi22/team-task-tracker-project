# Spec Delta

## REMOVED Requirements

### Requirement: E2E placeholder script
**Reason**: DEV-1016 implements `pnpm test:e2e`; the placeholder and its "not implemented" output no longer exist. Its "Lighthouse is a real gate" scenario moves to the Lighthouse requirement below.
**Migration**: Use the "End-to-end suite" requirement.

## ADDED Requirements

### Requirement: End-to-end suite
`pnpm test:e2e` SHALL run a Playwright suite against the production build of the frontend and the backend on the Compose test PostgreSQL, and exit 0 only when the whole journey passes. It SHALL NOT be part of `pnpm test`, and it MAY run locally only.

#### Scenario: User journey passes
- **WHEN** a developer runs `pnpm test:e2e` with Docker running
- **THEN** a new user registers, creates a project, adds a member, creates a task, filters the task list, adds a comment and sees the activity entries, and the command exits 0

#### Scenario: Failure is reported
- **WHEN** a journey step fails
- **THEN** the command exits non-zero and an HTML report with the failing step is written to `playwright-report/`

#### Scenario: Placeholder is gone
- **WHEN** a developer runs `pnpm test:e2e`
- **THEN** the output does not contain "not implemented"

### Requirement: Lighthouse runs outside the unit suite
`pnpm test` SHALL NOT run the full Lighthouse audit. `pnpm lighthouse` SHALL remain its own gate with every score at least 95, run alone; only fast logic tests of the gate stay in `pnpm test`.

#### Scenario: Unit suite has no browser audit
- **WHEN** a developer runs `pnpm test`
- **THEN** no Chrome or `vite preview` process is started and the logic tests of the Lighthouse gate still run

#### Scenario: Gate still enforces 95
- **WHEN** a developer runs `pnpm lighthouse` alone
- **THEN** it exits non-zero if any category of any audited page is below 95

#### Scenario: Lighthouse is a real gate
- **WHEN** a developer runs `pnpm lighthouse`
- **THEN** the output does not contain "not implemented" and the command audits the built frontend as specified by `web-platform`

### Requirement: Every scenario maps to a test
`docs/testing/scenario-test-map.md` SHALL list every scenario of `openspec/specs/` and of the active changes with its test file and test name, and a test in `pnpm test` SHALL fail when a scenario has no row or a row points to a missing test file.

#### Scenario: Unmapped scenario fails the check
- **WHEN** a spec scenario has no row in the map
- **THEN** the scenario-map test fails and names the capability and scenario

#### Scenario: Row pointing to a missing test fails the check
- **WHEN** a row names a test file that does not exist
- **THEN** the scenario-map test fails and names the row

### Requirement: Coverage threshold on application code
Each of backend, frontend and shared SHALL have a coverage script that fails when line coverage of application code is below 80%. The threshold MUST NOT be lowered and application files MUST NOT be excluded to pass.

#### Scenario: Coverage passes
- **WHEN** a developer runs `pnpm coverage`
- **THEN** every package reports line coverage of at least 80% and the command exits 0

#### Scenario: Coverage below the threshold fails
- **WHEN** line coverage of a package is below 80%
- **THEN** the package's coverage script exits non-zero
