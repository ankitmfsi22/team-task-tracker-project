# openspec-workflow Specification

## Purpose

Defines ticket-to-PR traceability and the gate lifecycle: archived changes are complete and approved at Gate 1 and Gate 2 with no open findings, pull requests carry traceability fields, a register links each ticket to its change, branch, PR and gate commits, and the lifecycle is documented.

## Requirements

### Requirement: Archived changes are complete and approved
Every change under `openspec/changes/archive/` MUST contain `proposal.md`, `design.md`, `tasks.md`, `specs/`, `approvals.md` and `review-log.md`, with a Gate 1 and a Gate 2 entry whose decision is `Approved` and no review finding with status `Open`. A check SHALL report each violation naming the change and the file.

#### Scenario: Complete archive passes
- **WHEN** the check runs on the repository's archived changes
- **THEN** it reports no problems

#### Scenario: Missing artifact is reported
- **WHEN** the check runs on a change folder lacking `design.md`
- **THEN** it reports a problem naming that change and `design.md`

#### Scenario: Unapproved gate is rejected
- **WHEN** the check runs on a change whose Gate 2 decision is empty or `Changes requested`
- **THEN** it reports a problem naming that change and `approvals.md`

#### Scenario: Open finding is rejected
- **WHEN** the check runs on a change whose `review-log.md` has a row with status `Open`
- **THEN** it reports a problem naming that change and `review-log.md`

### Requirement: Pull requests carry traceability fields
`.github/pull_request_template.md` SHALL ask for the Linear ticket, OpenSpec change, requirements covered (FRS IDs), a scenario-to-test map, review findings, deviations and the Gate 2 entry.

#### Scenario: Template lists every field
- **WHEN** a reviewer opens a new pull request
- **THEN** the description contains a section for each of the seven fields (verified by review, no test)

### Requirement: A traceability register links ticket to PR
`docs/traceability.md` SHALL hold one row per ticket with assignment ID, Linear key, change archive path, branch, PR, the Gate 1 commit with its date, the first implementation commit with its date, and the Gate 2 commit, for DEV-1001..1004, and each later ticket SHALL append its row. The Gate 1 commit date MUST NOT be later than the first implementation commit date, so the order required by AC3 is visible per ticket.

#### Scenario: Existing tickets are traceable
- **WHEN** a reviewer picks DEV-1001..1004
- **THEN** one row gives its Linear key, archived change, branch, PR, Gate 1 commit and date, first implementation commit and date, and Gate 2 commit (verified by review, no test)

#### Scenario: Gate 1 precedes implementation
- **WHEN** a reviewer compares the Gate 1 and first implementation columns of a row
- **THEN** the Gate 1 commit and date come first, and any exception is explained in a note on that row (verified by review, no test)

### Requirement: The lifecycle is documented
`docs/workflow.md` SHALL state the lifecycle with the exact `/opsx:*` commands, Gate 1 before any production code, Gate 2 before archive, the fast lane limit (typo, config change, dependency patch), and why verify, sync and archive run on the feature branch before merge.

#### Scenario: Gates and order are stated
- **WHEN** a contributor reads `docs/workflow.md`
- **THEN** it names each command in order, both gates, the fast lane limit and the in-branch archive reason (verified by review, no test)
