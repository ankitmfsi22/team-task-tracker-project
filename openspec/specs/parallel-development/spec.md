# parallel-development Specification

## Purpose

Defines how parallel tickets are developed and evidenced: separate worktrees and branches, shared contracts approved first, a documented integration conflict, and passing gates after integration.

## Requirements

### Requirement: Worktree guide
`docs/WORKTREES.md` SHALL describe the commands to create, list and remove a worktree, the folder layout used, how to integrate with `origin/main` and resolve a conflict, and which gates to run afterwards.

#### Scenario: Guide covers the full flow
- **WHEN** a reader opens `docs/WORKTREES.md`
- **THEN** it shows the add, list and remove commands, the sibling-folder layout, the merge-and-resolve steps and the post-integration gate commands

#### Scenario: Guide points to real evidence
- **WHEN** a reader follows the guide's example links
- **THEN** they reach `docs/evidence/DEV-1014/parallel-work.md` and the per-ticket evidence files that exist in the repository

### Requirement: Separate worktrees and branches per parallel ticket
The evidence SHALL show, for DEV-1007 / DEV-1008 and DEV-1011 / DEV-1012, one worktree and one `feature/{domain}/DEV-XXXX-{name}` branch per ticket, with the recorded `git worktree list` output.

#### Scenario: Both pairs are shown
- **WHEN** a reader opens `docs/evidence/DEV-1014/parallel-work.md`
- **THEN** each of the four tickets lists its worktree folder, branch name and a link to its `worktree.md`

#### Scenario: Human-supplied cleanup is labelled
- **WHEN** a reader looks at the cleanup section for either pair
- **THEN** the deleted branches, their last commits, the final `git worktree list` and the manual folder deletion note appear verbatim and are marked "provided by Ankit Singh"

### Requirement: Shared contracts approved before parallel work
For each pair, the evidence SHALL give, with commit times from `git log`, in this order: the first ticket's Gate 1 commit, the contract commit (the merge base from which the second branch was cut), the second ticket's Gate 1 commit and its first implementation commit. Each MUST be later than the one before.

#### Scenario: Pair 1 ordering
- **WHEN** the row for DEV-1007 / DEV-1008 is compared with `git log`
- **THEN** DEV-1007 Gate 1 `1a295fe` (00:02:50) precedes contract `e8cbc69` (00:15:30), which precedes DEV-1008 Gate 1 `6d0ce14` (00:40:11) and its first implementation commit `d8a54e8` (00:42:50)

#### Scenario: Pair 2 ordering
- **WHEN** the row for DEV-1011 / DEV-1012 is compared with `git log`
- **THEN** DEV-1011 Gate 1 `98ad9e7` (17:24:18) precedes contract `ab522dd` (18:05:45), which precedes DEV-1012 Gate 1 `6370e56` (22:57:56) and its first implementation commit `9345807` (2026-11-02 00:13:26), and the file notes the backend API was already on `main`

### Requirement: Integration with a documented conflict
For each pair, the evidence SHALL include a `git log --graph` excerpt of the merge commit, the conflicting files and how each was resolved, linking the ticket's `integration.md`.

#### Scenario: Pair 1 conflict
- **WHEN** a reader opens the pair 1 section
- **THEN** merge `2acf891` is shown with conflicts in `backend/src/app.ts` and `docs/deviations.md` and their resolutions

#### Scenario: Pair 2 conflict
- **WHEN** a reader opens the pair 2 section
- **THEN** merge `8b952f0` is shown with the `docs/deviations.md` conflict and the duplicate helpers that were replaced

### Requirement: Gates pass after integration
The evidence SHALL report the gate results recorded after each merge, as stated in the ticket's `integration.md`, and SHALL NOT report a result that file does not contain.

#### Scenario: Results match the source
- **WHEN** the gate rows in `parallel-work.md` are compared with the two `integration.md` files
- **THEN** every command and count matches, including the DEV-1012 Lighthouse note, and nothing extra is claimed

### Requirement: Evidence is traceable and not fabricated
`parallel-work.md` SHALL link existing evidence files instead of copying them, and every commit hash it cites MUST exist in the repository history.

#### Scenario: Hashes resolve
- **WHEN** each cited hash is passed to `git cat-file -e`
- **THEN** it exists, except the cleanup-output hashes of deleted branches that are recorded as supplied by the human
