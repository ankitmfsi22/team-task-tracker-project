# Proposal

## Why

DEV-1015 (Linear DEV-19) asks whether a code graph helps agents work on this repository: Code Review Graph and Graphify are to be installed from their official docs, a graph built, and the effect on tokens, files read, time and findings measured honestly against a no-graph baseline. The repository now has enough backend code (routes, services, middleware, ~25 integration test files) for impact and call-relationship questions to be real.

## What Changes

- Install both tools at exact pinned versions (Code Review Graph 2.3.9, Graphify `graphifyy` 0.9.100) and record them in `docs/VERSIONS.md`. Both need Python 3.10+; this machine has 3.9.6, so the plan uses `uv` (`brew install uv`) with Python 3.12; the install plan was approved by Ankit Singh at Gate 1.
- Generate both graphs locally (`graphify extract . --code-only`, `code-review-graph build`); outputs are git-ignored.
- Add the project-scoped `code-review-graph` MCP entry to `.mcp.json` (stdio, no secrets, `--tools` allowlist of read-only tools only). The existing `scripts/tests/mcp-config.test.mjs` is extended first (test-writer) to expect it; no existing assertion is weakened.
- Skip the tools' own git hooks, rules-file edits and user-wide skills (Husky collision, no user-wide changes); recorded as a deviation.
- Record exact `uv` and Python versions in `docs/VERSIONS.md` and save the version/registry check output in `docs/evidence/DEV-1015/`.
- Add `docs/GRAPH-TOOLS.md`: install method, versions, commands, real errors with fallback, and targeted queries (relevant files, dependencies, call relationships, affected tests) with key findings confirmed against source.
- Add `docs/TOKEN-REPORT.md`: one task and one review, each run once without and once with the graph, measured from real session data, with method and limitations.
- No production code, API, schema or new tests. Custom graph tooling is out of scope.

## Capabilities

### New Capabilities
- `codebase-graph`: how the codebase-graph tools are installed, pinned, queried and evaluated, and what the evaluation may claim.

### Modified Capabilities

## Impact

- New docs: `docs/GRAPH-TOOLS.md`, `docs/TOKEN-REPORT.md`; edits to `docs/VERSIONS.md`, `docs/deviations.md`, `docs/workflow.md` (link), `.mcp.json`, `.gitignore`, `scripts/tests/mcp-config.test.mjs`, `docs/evidence/DEV-1015/`; traceability row at archive.
- New machine-level tooling (`uv`, two `uv tool` installs) outside the repo; no package added to any `package.json`, so the pnpm "no new packages" rule is untouched but the user must still approve the Python toolchain.
- Rollback: `uv tool uninstall` both tools, revert the `.mcp.json` and `.gitignore` entries, delete the generated graph folders.
