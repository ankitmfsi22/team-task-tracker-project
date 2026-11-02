# Tasks

## 1. Install and pin

- [ ] 1.1 Run `brew install uv`, `uv tool install --python 3.12 code-review-graph==2.3.9` and `uv tool install --python 3.12 graphifyy==0.9.100`; record the tool, `uv` and Python versions in `docs/VERSIONS.md`, save the version and registry check output in `docs/evidence/DEV-1015/install-check.md`, and write the install section of `docs/GRAPH-TOOLS.md` (real errors included); verify with `uv tool list` and the "Pinned installation" and "Toolchain versions" scenarios.

## 2. MCP entry

- [ ] 2.1 Test-writer first: extend `scripts/tests/mcp-config.test.mjs` with the "MCP entry is project-scoped and safe" scenarios and confirm they fail; then run `code-review-graph install --platform claude-code --dry-run`, add only the `code-review-graph` entry to `.mcp.json`, and make the tests pass without weakening any existing assertion. STOP after the commit: Claude Code restart and server approval by the human.

## 3. Build graphs

- [ ] 3.1 Git-ignore `.code-review-graph/` and `graphify-out/`, build both graphs (`code-review-graph build`, `graphify extract . --code-only`) and record their statistics in `docs/GRAPH-TOOLS.md`; verify `git status` shows no hook, settings or rules-file change.

## 4. Targeted queries

- [ ] 4.1 Run queries for relevant files, dependencies, call relationships and affected tests (comment delete, `projectAccess`) with both tools; paste real output into `docs/GRAPH-TOOLS.md` and confirm each key finding in source with file and line.

## 5. Comparison

- [ ] 5.1 Run the task and the review once without and once with the graph; record tokens, files examined, time and findings from real session data in `docs/TOKEN-REPORT.md` with method and limitations ("not measured" where unreported); verify every number against the raw output.

## 6. Deviations and gates

- [ ] 6.1 Append the DEV-1015 rows to `docs/deviations.md` (skipped tool hooks, rules edits and user-wide skills with the reason; file names), link both docs from `docs/workflow.md`, and run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm format:check` and `openspec validate dev-1015-codebase-graph --strict`.

## Workflow follow-up

- Reviewer sub-agent checks each spec scenario against the files; findings saved verbatim to `review-log.md`.
- After Gate 2: sync, archive and add the traceability row on the feature branch.
