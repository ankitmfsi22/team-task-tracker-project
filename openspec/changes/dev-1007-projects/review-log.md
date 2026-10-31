# Review log

- Change: dev-1007-projects (DEV-1007)
- Reviewer: reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-01

| Severity | file:line | Issue | Fix | Status |
| -------- | --------- | ----- | --- | ------ |
| Non-blocking | backend/src/routes/projects.routes.ts:36-42 and :55-60 | On PATCH and POST members, body validation runs before `projectAccess`. A non-member or a MEMBER sending an invalid body gets 400 instead of 404 or 403. This differs from the spec's fixed order (404, then 403), but it leaks nothing because project existence is not revealed. | Put `projectAccess` before the body `validate`, or record it as a deviation. | Accepted: recorded as D-061; no information leak, matches the validate-first pattern of DEV-1006 |
| Non-blocking | backend/src/controllers/projects.controller.ts:23 | The list handler re-parses `req.query` instead of using the validated value. This is already recorded as D-058. | Accept as recorded. | Accepted: D-058 |
| Non-blocking | backend/src/services/projects.service.ts:136-146 | `removeMember` uses a Serializable transaction with no retry, so a P2034 conflict gives 500. This is recorded as D-055 with follow-up DEV-1018. | Accept as recorded. | Accepted: D-055, follow-up DEV-1018 |
| Non-blocking | backend/src/services/projects.service.ts:60 | `get` re-queries the project that `projectAccess` already loaded, which costs an extra query. The 404 branch there is unreachable except in a race. | Optional: use `res.locals.project`. | Accepted: the middleware keeps only id and archivedAt; one extra primary-key read is cheap |
| Non-blocking | scripts/tests/prisma.test.mjs | Two DEV-1006 tests were renamed and rewritten because the models legitimately changed (User, RefreshToken, Project, ProjectMember). They were extended, not weakened, but a reviewer should confirm that. | Confirm at Gate 2. | Accepted: required by the approved MODIFIED spec; to be confirmed at Gate 2 |
| Non-blocking | openspec/changes/dev-1007-projects/review-log.md | The log is still the empty template; the main session should save this review there. | Save this table verbatim. | Done |

No Blocking findings.
