# independent-review Specification

## Purpose

Defines the final independent review of the product: a fresh-context review of the whole of `main` for spec compliance, security and test coverage, graph-assisted impact analysis, findings saved verbatim and classified, blocking findings fixed and non-blocking ones accepted in `docs/deviations.md`.

## Requirements

### Requirement: Fresh-context review of main
The final review SHALL be done by the `reviewer` and `security-auditor` sub-agents, each in a fresh context, over the whole of `main`. It SHALL cover specification compliance against `openspec/specs/`, security (secrets, auth and refresh tokens, project membership checks) and test coverage against the test evidence. It SHALL NOT modify any file.

#### Scenario: Review covers all three areas
- **WHEN** the review is complete
- **THEN** `docs/review/final-review.md` has a section for spec compliance, security and test coverage, each stating what was checked and the result

#### Scenario: Authorization-denied paths are reviewed
- **WHEN** the reviewer checks project-scoped routes
- **THEN** the report states, per route group (projects, tasks, comments, activity), whether a non-member gets 404, a wrong role gets 403 and an unauthenticated caller gets 401, citing the test that proves it or reporting a gap as a finding

### Requirement: Graph-assisted impact analysis
The review SHALL use Code Review Graph, rebuilt at the reviewed commit, to list the impact radius and affected tests of project access, auth/refresh and comment permissions. Each graph claim SHALL be confirmed in source and reported with a `file:line`; a claim that cannot be confirmed SHALL be dropped or marked unconfirmed.

#### Scenario: Graph claim confirmed
- **WHEN** the report names a caller or test as affected
- **THEN** it cites the `file:line` read in source that confirms it

#### Scenario: Stale graph is not used
- **WHEN** the graph was built at a different commit than `main`
- **THEN** it is rebuilt before any impact query, and the commit is stated in the report

### Requirement: Findings are saved verbatim and classified
The main session SHALL save the reviewer's findings verbatim in the change's `review-log.md`, each with severity, `file:line`, issue, fix and status. Every finding SHALL be blocking or non-blocking.

#### Scenario: Verbatim log
- **WHEN** a sub-agent returns findings
- **THEN** `review-log.md` contains them unedited in the template table, with the reviewer, date and "Context: fresh"

#### Scenario: Incomplete finding is rejected
- **WHEN** a finding has no `file:line` or no severity
- **THEN** it is sent back to the reviewer for correction and is not logged as given

### Requirement: Blocking findings are fixed, non-blocking are accepted
Every blocking finding SHALL be fixed, with a regression test written first, before the PR. Non-blocking findings SHALL NOT be fixed in this change; each SHALL be added to `docs/deviations.md` as an accepted deviation with a reason.

#### Scenario: Blocking finding fixed
- **WHEN** a blocking finding exists
- **THEN** a failing test reproduces it, the fix makes it pass, and its status in `review-log.md` is "Fixed" with the commit

#### Scenario: Non-blocking finding accepted
- **WHEN** a non-blocking finding exists
- **THEN** it has a row in `docs/deviations.md` and status "Accepted" in `review-log.md`, and no code is changed for it

### Requirement: D-019 is recorded, not implemented
The review SHALL record D-019 (the permission hook fails open on malformed input) as "Follow-up: post-submission" and SHALL NOT change the hook.

#### Scenario: Hook unchanged
- **WHEN** this change is archived
- **THEN** `docs/deviations.md` shows D-019 as "Follow-up: post-submission" and no file under `.claude/` has changed
