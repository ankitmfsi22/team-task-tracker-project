# Spec Delta

## ADDED Requirements

### Requirement: E2E placeholder script
`pnpm test:e2e` SHALL exist and, until its owning ticket is done, print a "not implemented" message naming the owning ticket and exit 0.

#### Scenario: E2E placeholder
- **WHEN** a developer runs `pnpm test:e2e`
- **THEN** the output contains "not implemented — DEV-1016" and the exit code is 0

#### Scenario: Lighthouse is a real gate
- **WHEN** a developer runs `pnpm lighthouse`
- **THEN** the output does not contain "not implemented" and the command audits the built frontend as specified by `web-platform`

## REMOVED Requirements

### Requirement: Placeholder scripts
**Reason**: `pnpm lighthouse` is implemented by DEV-1011 and is no longer a placeholder, so the requirement covering both scripts is split.
**Migration**: The `pnpm test:e2e` behavior moves unchanged to "E2E placeholder script"; the Lighthouse gate is defined in `web-platform`.
