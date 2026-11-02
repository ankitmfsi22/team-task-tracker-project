# Spec Delta

## ADDED Requirements

### Requirement: Compose defines the database and the app services
The Compose file SHALL define the PostgreSQL service with its data volume, a one-shot `migrate` service, and the `backend` and `frontend` services, and no others. The Playwright gate SHALL start only the `postgres` service.

#### Scenario: Expected services exist
- **WHEN** `docker compose config --services` is run with the required variables set
- **THEN** the output is exactly `postgres`, `migrate`, `backend` and `frontend` (in any order)

#### Scenario: E2E gate starts only the database
- **WHEN** `scripts/e2e.mjs` starts its throwaway stack
- **THEN** it names the `postgres` service in its `docker compose up` command

## REMOVED Requirements

### Requirement: Compose scope
**Reason**: The postgres-only scope was explicitly temporary ("backend and frontend services are added by later tickets"); DEV-1018 adds them.
**Migration**: Replaced by "Compose defines the database and the app services"; the "only postgres" test in `scripts/tests/compose.test.mjs` is replaced by the new service-list test.
