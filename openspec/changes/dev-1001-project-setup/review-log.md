# Review log

- Change: dev-1001-project-setup (DEV-1001)
- Reviewer: reviewer sub-agent (read-only, fresh context)
- Context: fresh
- Date: 2026-10-31

| Severity | file:line | Issue | Fix | Status |
| --- | --- | --- | --- | --- |
| | | | | |

## Reviewer report (verbatim)

```text
Reviewed range: main...HEAD on feature/infra/DEV-1001-project-setup (25 commits, d59ee39 at tip), change dev-1001-project-setup.

`pnpm test` result: 159 of 160 root node:test tests pass. 1 fails: "Prisma reaches the database (throwaway Compose project)" at scripts/tests/prisma.test.mjs:81. The cause is `container ttt-prisma-test-postgres-1 exited (137)` during `docker compose up --wait`. Exit 137 is a SIGKILL or OOM, so this looks like the reviewer machine's Docker, not a code defect. The package-level Vitest step (`pnpm -r run test`) never ran because the root `node --test` command failed first. I did not re-run it, so I have no Vitest verdict.

| # | Severity | File:line | Finding | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | Blocking (process, not code) | scripts/tests/prisma.test.mjs:81-109 | `pnpm test` is red on this machine. The test needs a live Docker daemon, a pullable postgres image and a working container, and on a Docker failure it fails instead of skipping. Local `pnpm test` is also a gate in the Definition of Done. Until the run is green, the "tests pass" requirement cannot be confirmed. Prior CI evidence (docs/evidence/DEV-1001/ci-run.md) was recorded on a different environment. | Re-run `pnpm test` with a healthy Docker (check memory limits and stale `ttt-prisma-test` containers or volumes), then record a green run. Also include the container logs in the assertion message on failure so exit 137 is diagnosable. |
| 2 | Non-blocking | scripts/tests/prisma.test.mjs:81-109 | The connectivity test depends on external Docker and network state: it pulls an image, and the project name `ttt-prisma-test` is fixed. A leftover project from an aborted run, or two concurrent runs, collide. The `down -v` in `finally` is good, but its status is ignored. | Add a per-run suffix to the project name. Optionally skip, with an explicit message, when `docker info` fails, and check the `down` status. |
| 3 | Non-blocking | docker-compose.yml:8-9 | Postgres publishes `${POSTGRES_PORT:-5432}:5432` on all host interfaces, and the default user is `tasktracker`. A password is required (`:?`), so there is no default credential, which is good. But binding to all interfaces exposes the DB on shared networks. | Bind to loopback: `127.0.0.1:${POSTGRES_PORT:-5432}:5432`. Update compose.test.mjs and the spec if they assert the port string. |
| 4 | Non-blocking | pnpm-workspace.yaml:9-11 | `minimumReleaseAgeExclude` bypasses the supply-chain cooldown for eslint@10.14.0 and @fission-ai/openspec@1.16.0. The exclusions are exact-version and documented in design.md:33 and VERSIONS.md, and approved at Gate 1, so they are acceptable. They stay in force permanently. | Add a follow-up to remove them once the versions age past the default cooldown. |
| 5 | Non-blocking | .github/workflows/ci.yml:16-30 | Permissions are least-privilege (`contents: read`), the runner is pinned (ubuntu-24.04) and actions use exact tags. But `pnpm/action-setup@v6.1.0` has no `version:`, so it relies on `packageManager` (fine). Actions are pinned by tag, not by commit SHA, so a moved tag is still a supply-chain risk. No `timeout-minutes` is set. `pnpm audit` is network-dependent and can fail CI on new advisories unrelated to the PR. | Optionally pin to SHAs and add `timeout-minutes`. Accept the audit flake or make it a separate job. |
| 6 | Non-blocking | scripts/check-pinning.mjs:9-11, 28-32, 62-66 | Line-regex YAML parsing is brittle. Multi-line `image:` values, anchors, `uses:` with trailing comments inside quotes, `runs-on:` given as a block list, and `matrix` runner values (`${{ matrix.os }}`) are not handled. A `runs-on` value that is not floating but is not `-latest` (for example `ubuntu-slim` or an expression) passes silently. package.json checks do not cover `overrides`, `pnpm.overrides` or `resolutions`. `workspace:`, `npm:` and `file:` specs are rejected by EXACT_VERSION, which is strict but safe. EXACT_ACTION_REF accepts `v1.2.3` only, so SHA pins would be rejected. | Document these limits. Consider also checking `overrides` and `catalog` entries, and permit 40-char SHA refs. |
| 7 | Non-blocking | eslint.config.js:4-5, 20 | The ticket-ID rule matches only comments whose text starts with `eslint-disable`, so block comments with a leading `*` are missed. `/* eslint-disable */` is covered. The `ban-ts-comment` option sets only ts-ignore: true, so the other directives use their defaults. No `any`, `@ts-ignore` or un-ticketed `eslint-disable` was found in the diff. | Minor. Add a test case for the block-comment form if one is not already present. |
| 8 | Non-blocking | .husky/pre-commit; package.json:30-38 | The hook runs lint-staged with `prettier --check`, which only verifies and never fixes. That is deliberate and consistent with the spec. Hook scripts execute only repo-controlled commands, and nothing untrusted is executed. Secrets: .env.example is tracked, and I did not read any .env file. The project's own hook blocked my attempt to inspect .env paths with git, so I could not independently confirm that `.env` is git-ignored. | Confirm with `git check-ignore .env` locally. No other action needed. |
| 9 | Non-blocking | git log main..HEAD | All 25 commits reference DEV-1001 and use allowed scopes (infra, docs), with types build, chore, ci, feat, test and docs. One commit per task is plausible (some tasks have extra fix-up commits such as 3782f71, f741bb0, 6d02c9a, which is acceptable). Gate 1 entries (initial plus two amendments) exist in approvals.md. Gate 2 is empty, as expected before the PR. | None. |
| 10 | Non-blocking | openspec/changes/dev-1001-project-setup/review-log.md | The file is 10 lines and still the template. This is expected before saving this review. | Save this report verbatim into review-log.md. |

Verdict: REQUEST CHANGES, with 1 blocking finding. The blocking item (#1) is about the test run, not the implementation. Once `pnpm test` is green with a working Docker (or the Docker-dependent test is made to skip cleanly and the run is recorded), I found nothing else that blocks. I saw no secrets, no unpinned versions, no `any` or `@ts-ignore`, no packages outside the approved set, and no deleted or weakened tests. I did not exhaustively verify every spec scenario against a test.
```
