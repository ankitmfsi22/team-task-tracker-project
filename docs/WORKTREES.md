# Parallel work with git worktrees

How we run `[PARALLEL]` tickets. Evidence from two real pairs: `docs/evidence/DEV-1014/parallel-work.md`.

## Rules

1. One worktree and one branch (`feature/{domain}/DEV-XXXX-{short-name}`) per parallel ticket.
2. The shared contract (API schemas, models, middleware the other ticket needs) is approved at Gate 1 and committed first. The second branch is cut from that commit.
3. The second ticket has its own Gate 1 before its first implementation commit.
4. Integrate with a merge, not a rebase: `git fetch && git merge origin/main` on the second branch after the first ticket's PR is merged.

## Layout

Worktrees are sibling folders of the main checkout, so each has its own `node_modules` and `.env`, which are outside git.

```
team-task-tracker-v2/     main checkout (branch main)
ttt-1007/                 feature/projects/DEV-1007-projects
ttt-1008/                 feature/tasks/DEV-1008-tasks   (cut from the DEV-1007 contract commit)
```

## Commands

```
git worktree add ../ttt-1007 -b feature/projects/DEV-1007-projects
git worktree add ../ttt-1008 -b feature/tasks/DEV-1008-tasks <contract-commit>
git worktree list
pnpm install                      # inside each new worktree
```

Cleanup after the PR is merged:

```
git worktree remove ../ttt-1007
git branch -d feature/projects/DEV-1007-projects
git worktree list
```

The folder may stay behind (`node_modules` and `.env` are untracked); delete it by hand.

## Integrating and resolving a conflict

```
git fetch
git merge origin/main             # on the second branch
git status                        # lists conflicted files
# edit each file, keep both sides' intent, then:
git add <file>
git commit
```

Typical conflicts here: the router file where both tickets mount routes (`backend/src/app.ts`), and `docs/deviations.md`, where both branches append rows with the same D-numbers. For the second, keep main's rows and renumber the branch's rows, then fix references. Also look for code both branches wrote independently (duplicate helpers) even when git reports no conflict.

Real resolutions: `docs/evidence/DEV-1008/integration.md` (merge `2acf891`) and `docs/evidence/DEV-1012/integration.md` (merge `8b952f0`).

## Verification after integration

Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` and `openspec validate --all --strict`, then have the reviewer sub-agent re-check `git diff origin/main...HEAD`. Record the results in the ticket's `integration.md`.
