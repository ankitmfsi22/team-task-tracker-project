# Spec Delta

## Purpose

Defines the local development environment: a pinned PostgreSQL 16 started by Docker Compose, secret-free environment configuration, and a Prisma connection to that database, so later tickets can add models and services without touching infrastructure.

## ADDED Requirements

### Requirement: Compose runs pinned PostgreSQL 16
`docker compose up` SHALL start a PostgreSQL 16 service using an exact image tag of the form `16.<minor>-alpine`, and no service SHALL use a `latest` or floating tag.

#### Scenario: Database starts and becomes healthy
- **WHEN** a developer runs `docker compose up -d` with a valid `.env`
- **THEN** the `postgres` service reaches a healthy state and accepts connections on the configured port

#### Scenario: Floating tag is rejected by the check
- **WHEN** a test generates a Compose file in an OS temp directory with an image that has no exact version tag or uses `latest`, and runs the pinning check on it
- **THEN** the pinning check exits non-zero and names the offending image

### Requirement: Compose scope
The Compose file SHALL define only the PostgreSQL service and its data volume; backend and frontend services are added by later tickets.

#### Scenario: Only the database service exists
- **WHEN** `docker compose config --services` is run
- **THEN** the output is exactly `postgres`

### Requirement: Environment files hold no secrets
`.env` files SHALL be git-ignored, and `.env.example` SHALL be tracked and contain placeholder values only.

#### Scenario: .env is ignored
- **WHEN** a developer creates `.env` and runs `git status`
- **THEN** `.env` is not listed as untracked

#### Scenario: .env.example is tracked with placeholders
- **WHEN** `.env.example` is inspected
- **THEN** it is tracked by Git and every secret-like value (passwords, JWT secrets) is an obvious placeholder, not a real credential

#### Scenario: Missing required variable
- **WHEN** `docker compose up` is run without the required database password variable set
- **THEN** Compose fails with an error naming the missing variable instead of starting with a default secret

### Requirement: Prisma connects to PostgreSQL
The backend SHALL configure Prisma with a PostgreSQL datasource read from the `DATABASE_URL` environment variable and SHALL define no models in this change.

#### Scenario: Prisma validates
- **WHEN** a developer runs the Prisma validate command in `backend` with `DATABASE_URL` set
- **THEN** it reports the schema as valid

#### Scenario: Prisma reaches the database
- **WHEN** the Compose database is running and Prisma runs a connectivity check using `DATABASE_URL`
- **THEN** the connection succeeds

#### Scenario: Missing DATABASE_URL
- **WHEN** Prisma commands run without `DATABASE_URL`
- **THEN** they fail with an error naming `DATABASE_URL` and no default connection string is used
