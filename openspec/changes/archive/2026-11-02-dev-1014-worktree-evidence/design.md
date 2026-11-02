# Design

## Context

Both pairs used `git worktree` folders next to the main checkout (`../ttt-1007`, `../ttt-1008`, `../ttt-1011`, `../ttt-1012`) and integrated with `git fetch && git merge origin/main` on the second branch. Existing evidence: `worktree.md` per ticket, `integration.md` for DEV-1008 and DEV-1012. Facts below were read from `git log` on 2026-11-02.

| Pair | Ticket 1 Gate 1 | Contract (merge base of both branches) | Ticket 2 Gate 1 | Ticket 2 first implementation commit | Merge |
| ---- | --------------- | -------------------------------------- | --------------- | ------------------------------------ | ----- |
| 1007 / 1008 | `1a295fe` 2026-11-01 00:02:50 | `e8cbc69` 00:15:30 | `6d0ce14` 00:40:11 | `d8a54e8` 00:42:50 | `2acf891` (parents `5eea932`, `137fbb6`) |
| 1011 / 1012 | `98ad9e7` 2026-11-01 17:24:18 | `ab522dd` 18:05:45 | `6370e56` 22:57:56 | `9345807` 2026-11-02 00:13:26 | `8b952f0` (parents `9269d23`, `94eeecf`) |

## Goals / Non-Goals

**Goals:**
- One short how-to and one evidence file that a reviewer can check against git.

**Non-Goals:**
- New feature work, rewriting past evidence files, re-running past gates.

## Decisions

1. **File name `docs/WORKTREES.md`**, as the Linear acceptance criteria name it, not the lower-case name in the planning note. Alternative: `worktrees.md`. The ticket wins; recorded as a deviation.
2. **Evidence file links, never copies.** Existing `worktree.md` and `integration.md` files stay the source; `parallel-work.md` quotes only the commit table, graph excerpts and gate counts, each with its source path.
3. **Contract proof comes from `git log`**, stated the same way for both pairs: the contract is the first ticket's Gate-1-approved contract group, ending at the merge-base commit (pair 1: DEV-1007 Gate 1 → `e8cbc69`; pair 2: DEV-1011 Gate 1 → `ab522dd`; the backend API was already on `main`). The second branch is cut from that commit, and the second ticket's own Gate 1 precedes its first implementation commit. One table row per pair, commit times from `git log`.
4. **Conflict write-up** per pair uses the existing integration files: pair 1 `backend/src/app.ts` and `docs/deviations.md`; pair 2 `docs/deviations.md` plus duplicate frontend helpers replaced. The graph excerpts are the `git log --graph` view of `2acf891` and `8b952f0`.
5. **Cleanup output** (branches deleted, `git worktree list`, manual folder removal) is pasted verbatim and labelled "provided by Ankit Singh"; it was not produced by this session.
6. **No automated tests.** Per CLAUDE.md there are no tests about docs. The reviewer sub-agent checks each spec scenario against the files and `git log`; `pnpm lint`, `format:check`, `typecheck`, `test`, `build` and `openspec validate --strict` must still pass.

## Risks / Trade-offs

- [Evidence drifts from git] → every commit hash and time in the file comes from `git log`, and the reviewer re-checks them.
- [Worktree paths in older evidence are `C:/Users/kkomt/...`, the cleanup output uses another path] → shown as recorded; not edited.
- [A reader compares the pairs and assumes different rigor] → both are reported with the same four ordered facts from `git log`.
