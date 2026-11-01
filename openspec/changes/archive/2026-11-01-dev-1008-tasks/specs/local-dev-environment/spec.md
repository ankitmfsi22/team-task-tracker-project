# Spec Delta

## MODIFIED Requirements

### Requirement: Prisma connects to PostgreSQL
The backend SHALL configure Prisma with a PostgreSQL datasource read from the `DATABASE_URL` environment variable. Models are added by the tickets that need them; so far they are `User`, `RefreshToken`, `Project`, `ProjectMember` and `Task`.

#### Scenario: Client package is deferred
- **WHEN** the backend dependencies are inspected
- **THEN** `@prisma/client` and `@prisma/adapter-pg` are present at exact versions only because models exist, and the schema defines only `User`, `RefreshToken`, `Project`, `ProjectMember` and `Task`

#### Scenario: Prisma validates
- **WHEN** a developer runs the Prisma validate command in `backend` with `DATABASE_URL` set
- **THEN** it reports the schema as valid

#### Scenario: Prisma reaches the database
- **WHEN** the Compose database is running and Prisma runs a connectivity check using `DATABASE_URL`
- **THEN** the connection succeeds

#### Scenario: Missing DATABASE_URL
- **WHEN** Prisma commands run without `DATABASE_URL`
- **THEN** they fail with an error naming `DATABASE_URL` and no default connection string is used
