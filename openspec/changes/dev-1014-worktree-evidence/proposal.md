# Proposal

## Why

DEV-1014 (Linear DEV-18) asks for proof that `[PARALLEL]` tickets were built in separate git worktrees and branches, from approved shared contracts, then integrated with a real conflict resolved. That work already happened for DEV-1007 / DEV-1008 and DEV-1011 / DEV-1012; the evidence is scattered across four ticket folders and git history.

## What Changes

- Add `docs/WORKTREES.md`: the commands, folder layout, conflict handling and post-integration verification we use for parallel work.
- Add `docs/evidence/DEV-1014/parallel-work.md`: the consolidated evidence for both pairs. It links the existing `docs/evidence/DEV-1007|1008|1011|1012/` files and does not copy them.
- Add git-derived proof that for each pair the first ticket's Gate 1 precedes the contract commit, the second branch was cut from that commit, and the second ticket's own Gate 1 precedes its first implementation commit, and `git log --graph` excerpts of both merges.
- Record the cleanup output supplied by the human verbatim, marked "provided by Ankit Singh".
- No code, no schema or API change, no new tests. Nothing is re-run or invented.

## Capabilities

### New Capabilities
- `parallel-development`: how parallel tickets are run and evidenced (separate worktrees and branches, contract before parallel work, documented integration conflict, gates after integration).

### Modified Capabilities

## Impact

- New docs only: `docs/WORKTREES.md`, `docs/evidence/DEV-1014/parallel-work.md`, a link in `docs/workflow.md`, deviation rows in `docs/deviations.md`, and the traceability row at archive.
- No production code, dependencies or CI changes.
