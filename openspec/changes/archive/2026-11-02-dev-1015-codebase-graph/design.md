# Design

## Context

Commands were confirmed against Context7 (`/tirth8205/code-review-graph`, `/graphify-labs/graphify`, key fixed at Gate 1) and the official docs read on 2026-11-02 (upstream README and `docs/USAGE.md`/`COMMANDS.md`, PyPI, docs.graphify.com). Both tools need Python 3.10+; the machine has Python 3.9.6 and neither `uv` nor `pipx`.

| Tool | Package | Version (PyPI / GitHub latest) | Official install | Build | Query |
| ---- | ------- | ------------------------------ | ---------------- | ----- | ----- |
| Code Review Graph | `code-review-graph` (tirth8205) | 2.3.9, released 2026-09-18 | `pip install` or `pipx install`, then `code-review-graph install` | `code-review-graph build` | MCP tools (`query_graph_tool`, `get_impact_radius_tool`, `detect_changes_tool`); CLI has `detect-changes --brief`, `status` |
| Graphify | `graphifyy` (Graphify-Labs; not the unrelated `graphify*` packages) | 0.9.100, released 2026-11-01 | `uv tool install graphifyy`, or `pipx`/`pip` | `graphify extract . --code-only` (offline, no API key) | `graphify query`, `path`, `explain` |

Context7 confirms: `code-review-graph install --platform claude-code` writes `.mcp.json` and `.claude/settings.json`, adds rules-file instructions, and takes `--dry-run`, `--no-hooks`, `--no-skills`, `--no-instructions`; `serve` accepts `--tools <list>` or `CRG_TOOLS`. `graphify claude install` writes a `## graphify` section to `CLAUDE.md`; `graphify explain` prints callers, callees and imports.

## Goals / Non-Goals

**Goals:** pinned, reproducible install; both graphs built; real queries confirmed in source; one task and one review measured with and without the graph.

**Non-Goals:** custom graph tooling, graph-based CI, always-on hooks, adopting either tool permanently (the report informs that later decision).

## Decisions

1. **Install with `uv tool` on Python 3.12** (approved at Gate 1): `brew install uv`, then `uv tool install --python 3.12 code-review-graph==2.3.9` and `uv tool install --python 3.12 graphifyy==0.9.100`. Exact `uv` and Python versions are recorded in `docs/VERSIONS.md`; the `uv --version`, interpreter version, `uv tool list` and registry resolution output are saved in `docs/evidence/DEV-1015/install-check.md`. A plain `pip install` on 3.9 is impossible (`requires_python >=3.10`).
2. **Skip the tools' own hooks, rules-file edits and user-wide skills** (approved; deviation). CRG `install` would add a git pre-commit hook that collides with Husky and edit `CLAUDE.md`/`AGENTS.md`/`.claude/settings.json`; `graphify install` and `graphify claude install` add a user-wide skill and an always-on hook and a `CLAUDE.md` section. Run `code-review-graph install --platform claude-code --dry-run` once and record its output, then write only the `.mcp.json` entry by hand.
3. **MCP entry**: `{"command":"uvx","args":["--python","3.12","--from","code-review-graph==2.3.9","code-review-graph","serve","--tools","<read-only list>"]}`. The uv tool shim lives in `~/.local/bin`, which is not on PATH, so `command: code-review-graph` could not start (Ankit Singh chose pinned `uvx` over editing the shell profile or hard-coding a home path; `uvx` is in `/opt/homebrew/bin`). The pin keeps the entry reproducible; the upstream default `uvx code-review-graph serve` is unpinned. The list is limited to read-only tools: `get_minimal_context_tool`, `query_graph_tool`, `get_impact_radius_tool`, `get_review_context_tool`, `detect_changes_tool`; all five exist in 2.3.9 (checked in the installed package; `serve --help` documents `--tools`) and none writes files. No `env` or `headers`, so no secret.
4. **Test first** (test-writer): extend `scripts/tests/mcp-config.test.mjs` with the "Entry is present and read-only" and "Literal credential" scenarios; the existing `findLiteralCredentials` check already runs over every server, so it covers the new entry. Existing tests (https url for `linear` and `context7`, read tools allowed, write tools ask) stay unchanged. The new entry is stdio, so it is asserted separately instead of loosening the `https://` test.
5. **Graphify code-only.** `--code-only` keeps the build offline and free of any LLM call, so the build cost does not pollute the measurements. Use only the CLI (`extract`, `query`, `path`, `explain`).
6. **Generated output is git-ignored**: `.code-review-graph/` and `graphify-out/`.
7. **Real tasks**: task = "where is the comment delete permission checked and which tests cover it" (`comments.service`, `comments.edit-delete.integration.test.ts`); review = "impact of changing `projectAccess`" (`backend/src/middleware/project-access.ts`, used by the activity, projects, tasks and comments routes).
8. **Measurement**: each cell is one fresh headless run, `claude -p --output-format json` (its result reports `usage`, `duration_ms`, `num_turns`, cost), with `--strict-mcp-config` and a config that omits the graph MCP for baseline; graph runs add only the CRG MCP and allow the Graphify CLI. Files examined = distinct paths in Read/Grep/Glob tool calls from the session transcript. Findings = a list written first from source (ground truth) and scored for each run. Anything the run does not report is marked "not measured", never estimated.
9. **Claims**: no percentage or saving appears unless computed from the measured cells and stated with n=1. Vendor benchmark numbers are never quoted as results.
10. **Failure rule**: any failing step is pasted verbatim into `docs/GRAPH-TOOLS.md` with a proposed alternative marked "pending approval"; nothing is substituted silently.
11. **Restart checkpoint**: after the `.mcp.json` entry is committed, Claude Code must be restarted and the server approved by the human before any CRG MCP query; apply stops there.
12. **File names** `docs/GRAPH-TOOLS.md` and `docs/TOKEN-REPORT.md` follow the Linear acceptance criteria. The spec rules ask for authorization-denied and validation-failure scenarios; for a docs and tooling change the equivalents are "install touches no user-wide or existing hooks" and "unsupported claims are rejected" / "literal credential is rejected". Automated tests exist only for the `.mcp.json` entry (CLAUDE.md: none about docs); the reviewer checks the doc scenarios against files and `git log`.

## Risks / Trade-offs

- [One run per cell is noisy: caching, model nondeterminism, turn count] → state n=1, show raw numbers, no extrapolation.
- [Graph MCP tool schemas add input tokens, which can cancel savings] → measured and reported as is; the allowlist keeps the schema small.
- [CRG pre-commit hook collides with Husky or slows commits] → hooks skipped, deviation recorded.
- [Graph findings wrong or stale] → every key finding confirmed in source; wrong ones labelled.
- [A tool name in the allowlist differs in 2.3.9] → names verified against the installed server before the entry is written.
- [Python 3.12 install changes the machine] → approved at Gate 1; uninstall steps are in the proposal.
