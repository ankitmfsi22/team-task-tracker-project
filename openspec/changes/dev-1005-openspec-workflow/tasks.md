# Tasks

Ticket: DEV-1005 (Linear DEV-9). One commit per task: `type(scope): description (DEV-1005)`. Per task: test-writer first, then implement, then lint, typecheck, test.

## 1. Completeness check

- [x] 1.1 test-writer writes `scripts/tests/change-completeness.test.mjs` from the four "Archived changes" scenarios (temp-dir fixtures for the failure cases); save the failing output to `docs/evidence/DEV-1005/`.
- [x] 1.2 Implement `scripts/check-changes.mjs` (module and CLI) so the tests pass on the real archive (spec: Archived changes are complete and approved).

## 2. Traceability documents

- [x] 2.1 Add `.github/pull_request_template.md` with the seven fields (spec: Pull requests carry traceability fields).
- [ ] 2.2 Add `docs/traceability.md` with rows for DEV-1001..1004 (PR numbers, Gate 1 commit and date, first implementation commit and date, and Gate 2 commit, all from `git log`) and the append rule (spec: A traceability register links ticket to PR).
- [ ] 2.3 Add `docs/workflow.md`, the `CLAUDE.md` pointer line and deviation D-033 (spec: The lifecycle is documented).

## 3. Verification

- [ ] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1005-openspec-workflow --strict`.
