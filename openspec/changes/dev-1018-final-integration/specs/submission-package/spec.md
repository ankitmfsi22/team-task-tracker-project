# Spec Delta

## Purpose
Defines the final submission package: an index of ASSIGNMENT.md §9 items with real evidence, a repeatable demo walkthrough, a retrospective, and the closed-out traceability of the last ticket and its deviations.

## ADDED Requirements

### Requirement: Submission checklist links real evidence
`docs/SUBMISSION.md` SHALL list ASSIGNMENT.md §9 items 1 to 10 as a checklist, each with at least one link to an existing file or directory in the repository, and SHALL state any item that is only partly met.

#### Scenario: Every item has evidence
- **WHEN** `docs/SUBMISSION.md` is read
- **THEN** items 1 to 10 each link to a path that exists in the repository

#### Scenario: Missing evidence is stated, not hidden
- **WHEN** an item has no complete evidence
- **THEN** the checklist marks it partial and gives the reason

### Requirement: Demo walkthrough is runnable
`docs/DEMO.md` SHALL give the exact commands for the spec-driven flow of one ticket (fetch the ticket, explore, propose, Gate 1, apply, verify, review, Gate 2, sync, archive) and for running the application with Compose and its seed data.

#### Scenario: Demo covers both parts
- **WHEN** `docs/DEMO.md` is read
- **THEN** it contains the ordered workflow commands for one ticket and the commands to start the app, log in as a demo user and run the Playwright journey

### Requirement: Retrospective is recorded
`docs/RETROSPECTIVE.md` SHALL cover successes, failures, human interventions (including the senior-feedback fixes and the Linear workspace correction) and improvements, each tied to a ticket, commit or deviation where one exists.

#### Scenario: Retrospective sections exist
- **WHEN** `docs/RETROSPECTIVE.md` is read
- **THEN** it has sections for successes, failures, human interventions and improvements

### Requirement: Deviations are closed out
Every row in `docs/deviations.md` whose status says "Follow-up: DEV-1016", "DEV-1017" or "DEV-1018" SHALL be changed to Fixed with a commit, or to "Follow-up: post-submission" with a reason.

#### Scenario: No row points at a finished ticket
- **WHEN** `docs/deviations.md` is searched for "Follow-up: DEV-1016", "DEV-1017" and "DEV-1018"
- **THEN** there is no match

### Requirement: Final integration gates pass and are recorded
`pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, the Playwright journey and a `docker compose up --build --wait` smoke run SHALL pass on the integrated branch, with their output saved under `docs/evidence/DEV-1018/`, and the final PR SHALL link the issue, the change, the requirements, the tests, the review findings and the deviations.

#### Scenario: Evidence is saved
- **WHEN** the change is verified
- **THEN** `docs/evidence/DEV-1018/` holds the output of each gate and of the Compose smoke run

#### Scenario: PR traceability
- **WHEN** the PR description is read
- **THEN** it links Linear DEV-22, the change folder, FRS/SDS requirements, the test evidence, `review-log.md` and `docs/deviations.md`
