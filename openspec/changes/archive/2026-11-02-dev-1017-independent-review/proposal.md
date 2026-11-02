# Proposal

## Why

DEV-1017 (Linear DEV-21) is the independent review of the finished product. Every feature ticket was reviewed against its own diff; nobody has yet looked at the whole of `main` in a fresh context against the approved specs, the test evidence and the security rules. This change produces that review, fixes what blocks, and documents what is accepted.

## What Changes

- Run the `reviewer` and `security-auditor` sub-agents in fresh contexts over the whole of `main` (not a diff): spec compliance against `openspec/specs/`, security (secrets, auth and refresh tokens, membership checks) and test coverage against the test evidence in `docs/evidence/` and `docs/testing/`.
- Use Code Review Graph (rebuilt first, the index is stale) to get the impact radius and affected tests of the riskiest areas: project-access middleware, auth/refresh, comment permissions. Every graph claim is confirmed in source before it is reported.
- Save the reviewer findings verbatim in this change's `review-log.md`; write the consolidated report to `docs/review/final-review.md`.
- Fix every blocking finding (tests first). Non-blocking findings are not fixed; each is listed in `docs/deviations.md` as an accepted deviation.
- Record D-019 (hook fails open on malformed input) as "Follow-up: post-submission" in `docs/deviations.md` and the final review. It is not implemented here (the row currently says "DEV-1017"; that is corrected).
- Max 4 tasks. Time-boxed to the 21:00 submission.
- Out of scope: fixing non-blocking findings; fail-closed hook (D-019).

## Capabilities

### New Capabilities
- `independent-review`: what the final review must cover, how findings are recorded, and how blocking and non-blocking findings are handled.

### Modified Capabilities

## Impact

- New: `docs/review/final-review.md`, this change's `review-log.md`, `docs/evidence/DEV-1017/` (graph output, agent reports); `docs/deviations.md` rows; traceability row at archive.
- Production code and tests change only if a blocking finding requires a fix (unknown until the review runs). No schema or API change is planned; if a blocking finding needs one, stop and run `/opsx:update`.
- Rollback: revert the docs commits; any blocking fix is its own commit and is reverted separately.
