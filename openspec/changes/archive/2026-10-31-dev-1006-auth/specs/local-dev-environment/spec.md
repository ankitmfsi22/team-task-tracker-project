# Spec Delta

## ADDED Requirements

### Requirement: Postgres is published on loopback only
The Compose `postgres` service SHALL publish its port on `127.0.0.1` only, so the database is not reachable from other hosts.

#### Scenario: Port binding is loopback
- **WHEN** `docker compose config` is rendered with a valid `.env`
- **THEN** the published port for `postgres` has host IP `127.0.0.1`

#### Scenario: Local clients still connect
- **WHEN** a client connects to `127.0.0.1` on the configured port with the configured credentials
- **THEN** the connection succeeds

## MODIFIED Requirements

### Requirement: Prisma connects to PostgreSQL
The backend SHALL configure Prisma with a PostgreSQL datasource read from the `DATABASE_URL` environment variable. Models are added by the tickets that need them; this change adds `User` and `RefreshToken`.

#### Scenario: Client package is deferred
- **WHEN** the backend dependencies are inspected
- **THEN** `@prisma/client` and `@prisma/adapter-pg` are present at exact versions only because the first models exist, and the schema defines only `User` and `RefreshToken`

#### Scenario: Prisma validates
- **WHEN** a developer runs the Prisma validate command in `backend` with `DATABASE_URL` set
- **THEN** it reports the schema as valid

#### Scenario: Prisma reaches the database
- **WHEN** the Compose database is running and Prisma runs a connectivity check using `DATABASE_URL`
- **THEN** the connection succeeds

#### Scenario: Missing DATABASE_URL
- **WHEN** Prisma commands run without `DATABASE_URL`
- **THEN** they fail with an error naming `DATABASE_URL` and no default connection string is used
