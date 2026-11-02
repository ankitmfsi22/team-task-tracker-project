# Spec Delta

## Purpose
Defines the demo seed data: a repeatable, safe way to fill a freshly migrated database with realistic users, a project, tasks, comments and activity so the application can be shown without manual setup.

## ADDED Requirements

### Requirement: Seed creates demo data
The seed SHALL create at least two demo users, one project in which one user is OWNER and the other MEMBER, tasks covering every status and priority with assignees and due dates, comments on at least one task, and the activity entries those actions imply. Demo users SHALL be able to log in with the password supplied through `SEED_DEMO_PASSWORD`.

#### Scenario: Seeded database is usable
- **WHEN** the seed runs against a migrated empty database
- **THEN** the demo project has an OWNER and a MEMBER, its tasks cover every status and priority, a task has comments and activity, and a demo user logs in successfully

### Requirement: Seed is idempotent
Running the seed repeatedly SHALL NOT create duplicate users, projects, tasks, comments or activity entries and SHALL NOT fail.

#### Scenario: Second run changes nothing
- **WHEN** the seed runs twice in a row
- **THEN** the row counts of users, projects, members, tasks, comments and activity are identical after both runs

### Requirement: Seed is safe and configured from the environment
The seed SHALL NOT contain a password or secret, SHALL fail with a clear message when `SEED_DEMO_PASSWORD` is missing, and SHALL refuse to run when `NODE_ENV` is `production` unless `SEED_DEMO_DATA` is `true`.

#### Scenario: Missing password is rejected
- **WHEN** the seed runs without `SEED_DEMO_PASSWORD`
- **THEN** it exits non-zero, names the variable and writes no rows

#### Scenario: Production run is denied
- **WHEN** the seed runs with `NODE_ENV=production` and `SEED_DEMO_DATA` unset
- **THEN** it exits non-zero and writes no rows

### Requirement: Seed is documented
`docs/DEMO.md` SHALL state how to run the seed, the demo user emails and the variable that sets their password, without stating the password.

#### Scenario: Seed instructions are present
- **WHEN** `docs/DEMO.md` is read
- **THEN** it names the seed command, the demo user emails and `SEED_DEMO_PASSWORD`
