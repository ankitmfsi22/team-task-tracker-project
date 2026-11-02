# containerized-app Specification

## Purpose

Defines how the whole application runs in containers from one command: pinned multi-stage non-root images for backend and frontend, a migration step before the API starts, healthchecks, and no secrets baked into images or the Compose file.

## Requirements

### Requirement: One command starts the whole app
`docker compose up` SHALL start PostgreSQL, a one-shot `migrate` service that applies all migrations and the seed, the backend, and the frontend. The backend SHALL start only after `migrate` has completed successfully, and the application SHALL be reachable through the frontend on loopback port 8080 with the API under the same origin at `/api/v1`.

#### Scenario: App comes up healthy
- **WHEN** `docker compose up --build --wait` is run with the required variables set
- **THEN** all long-running services report healthy, `migrate` has exited with code 0, and `GET /api/v1/projects` through port 8080 returns 401 without a token

#### Scenario: Unauthenticated user is denied through the proxy
- **WHEN** a request without a token is sent to a project route through the frontend port
- **THEN** the response is 401 with the standard error shape

### Requirement: Images are pinned, multi-stage and non-root
Each Dockerfile SHALL use multi-stage builds, exact base image tags (no `latest`, no floating major-only tag), and the final stage SHALL run as a non-root user.

#### Scenario: Dockerfile properties hold
- **WHEN** the Dockerfiles are inspected
- **THEN** every `FROM` has an exact tag other than `latest`, there is more than one stage, and the final stage sets a non-root `USER`

### Requirement: Services are health-checked
The backend and frontend services SHALL define healthchecks, and dependants SHALL wait on health or successful completion rather than on start.

#### Scenario: Healthchecks are defined
- **WHEN** `docker compose config` is rendered
- **THEN** `postgres`, `backend` and `frontend` each have a healthcheck and `backend` depends on `migrate` with `service_completed_successfully`

### Requirement: No secrets in images or the Compose file
Images and `docker-compose.yml` SHALL NOT contain secret values. Required secrets SHALL come from the environment and Compose SHALL fail with a clear message when one is missing.

#### Scenario: Missing secret is rejected
- **WHEN** `docker compose config` is run without `JWT_ACCESS_SECRET`
- **THEN** it exits non-zero and names the missing variable

#### Scenario: Build context excludes secrets
- **WHEN** `.dockerignore` and the Dockerfiles are inspected
- **THEN** `.env` files are excluded from the build context and no `ENV` or `ARG` carries a secret value

### Requirement: Only the frontend and the database are published, on loopback
Compose SHALL publish only the frontend (8080) and PostgreSQL ports, both bound to `127.0.0.1`; the backend SHALL NOT be published.

#### Scenario: Published ports
- **WHEN** `docker compose config` is rendered
- **THEN** the only published ports are bound to `127.0.0.1` and belong to `frontend` and `postgres`
