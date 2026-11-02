# Flaky root tooling test (DEV-1016 task 2.1)

Time-boxed to one task. Command: `node --test "scripts/tests/*.test.mjs"` (the root half of `pnpm test`).

| Run set              | Conditions                                                                                                                | Result                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 4 runs               | quiet machine, before this change                                                                                         | 242/242 passed each                                                                        |
| 5th run of that loop | same, while `openspec new change dev-1016-testing` and the first draft of its delta spec were written in the working tree | 1 failure: `not ok 164 - openspec validate --all --strict passes (main specs and changes)` |
| 2 runs               | quiet machine, after Lighthouse left the suite (task 1.1)                                                                 | 243/243 passed each (about 18 s)                                                           |
| 3 runs               | 2 busy-loop processes per CPU core (about 38 s per run)                                                                   | 243/243 passed each                                                                        |

Findings:

- No failure could be reproduced from CPU load alone, so the `pnpm lighthouse` child process was the load source (see D-089, D-104), and it is gone from the suite.
- The one failure seen is explained by shared state, not by timing: `scripts/tests/openspec-validate.test.mjs` validates the real `openspec/` tree, so it fails whenever an active change is incomplete or invalid (during `/opsx:propose` or `/opsx:update`). Hook-based commits made while a change is mid-edit hit the same path. This is a hypothesis from one observation, not a confirmed cause of the reported hook failures.
- No skip or weaker assertion was added.

Follow-up: post-submission. Reproduce on the hook path (`.husky/pre-commit` and the Claude hooks) with the original failure output, and decide whether the validate test should ignore changes that are not yet at Gate 1.

## Addendum: a confirmed concurrency cause (found while adding the gate tests)

`node --test` runs the root test files in parallel. The new `scripts/tests/e2e-coverage-gates.test.mjs` creates throwaway fixtures inside the repo (`e2e/.fixture-*`, `packages/shared/.fixture-*`), and `agents-doc.test.mjs` runs `pnpm format:check` (`prettier --check .`) at the same time. Prettier listed a fixture file, the fixture was deleted, and the test failed with `ENOENT` (`pnpm format:check exit 2`). Any root test that writes into the working tree while another one scans it can fail the same way, which is an intermittent failure that no assertion explains.

Fix (no skip, no weaker assertion): `.fixture-*/` is git-ignored (Prettier honours `.gitignore`) and excluded from ESLint. `.prettierignore` has no fixture entry, because `workspace-quality-gates` forbids one. Three consecutive `pnpm test` runs passed afterwards. This is the same shape as the earlier `openspec validate` observation (shared working-tree state) and is the best-supported explanation for the reported intermittent failures; the original hook failure output was never captured, so it stays unconfirmed for that case.
