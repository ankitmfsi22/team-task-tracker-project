# DEV-1001 task 6.4: CI run on the pushed branch

Run: https://github.com/ankitmfsi22/team-task-tracker-project/actions/runs/41202581814
Commit: 3782f71c99671cb8bcca7c0a1519dc12bae52071
Conclusion: success
Date: 2026-10-31

Workflow `.github/workflows/ci.yml`, triggered by the draft pull request #1 (`pull_request`), job `verify` on `ubuntu-24.04`. Every step below finished with conclusion `success`.

- Set up job: success
- Run actions/checkout@v7.0.1: success
- Run pnpm/action-setup@v6.1.0: success
- Run actions/setup-node@v7.1.0: success
- Run pnpm install --frozen-lockfile: success
- Run pnpm format:check: success
- Run pnpm lint: success
- Run pnpm typecheck: success
- Run pnpm test: success
- Run pnpm build: success
- Run pnpm exec openspec validate --all --strict: success
- Run pnpm audit --audit-level=high: success
- Post Run actions/setup-node@v7.1.0: success
- Post Run pnpm/action-setup@v6.1.0: success
- Post Run actions/checkout@v7.0.1: success
- Complete job: success

## Earlier runs on this branch

A push to a feature branch does not start the workflow (it triggers on `pull_request` and on pushes to `main`), so the first run started when the draft PR was opened. Two earlier runs were red, and each was fixed at its cause without changing a test's assertions:

1. Run 41202130967 on 61b598d: the shallow checkout hid earlier commits from a test that checks the recorded commit is an ancestor of HEAD. Fixed by `fetch-depth: 0` on the checkout step (f741bb0).
2. Run 41202341693 on f741bb0: the Prisma connectivity test used a fixed host port that was already taken on the runner. Fixed by letting the OS pick a free port at test time (3782f71).
