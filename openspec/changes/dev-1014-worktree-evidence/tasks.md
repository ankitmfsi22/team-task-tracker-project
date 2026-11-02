# Tasks

## 1. Worktree guide

- [x] 1.1 Write `docs/WORKTREES.md` (commands, layout, merge and conflict steps, post-integration gates, links to the evidence); verify with the "Worktree guide" scenarios and `pnpm format:check`.

## 2. Consolidated evidence

- [x] 2.1 Write `docs/evidence/DEV-1014/parallel-work.md` with worktrees and branches, the contract-before-parallel table from `git log`, merge graph excerpts, conflicts, gate results and the verbatim "provided by Ankit Singh" cleanup output; verify every hash with `git cat-file -e` and every figure against the two `integration.md` files.

## 3. Cross-links and deviations

- [ ] 3.1 Link `docs/WORKTREES.md` from `docs/workflow.md` and append the DEV-1014 rows to `docs/deviations.md` (file name, pair 2 contract limit); verify the links resolve and numbering continues from the last D-number.

## 4. Gates

- [ ] 4.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check` and `openspec validate dev-1014-worktree-evidence --strict`; verify all exit 0.

## Workflow follow-up

- Reviewer sub-agent checks each spec scenario against the files and `git log`; findings saved verbatim to `review-log.md`.
- After Gate 2: sync, archive and add the traceability row on the feature branch.
