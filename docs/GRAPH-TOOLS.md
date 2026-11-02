# Graph tools: Code Review Graph and Graphify (DEV-1015)

Two codebase-graph tools were evaluated for this repository. Pinned versions: `docs/VERSIONS.md`. Raw install and
registry output: `docs/evidence/DEV-1015/install-check.md`. Measured comparison: `docs/TOKEN-REPORT.md`.

## Install

Commands were checked against Context7 (`/tirth8205/code-review-graph`, `/graphify-labs/graphify`) and the official
docs (upstream README, `docs/USAGE.md`, PyPI, docs.graphify.com). Both tools need Python 3.10+; the system Python is
3.9.6, so `uv` supplies Python 3.12.

```bash
brew install uv                                                  # uv 0.13.6
uv tool install --python 3.12 code-review-graph==2.3.9           # Code Review Graph 2.3.9
uv tool install --python 3.12 graphifyy==0.9.100                 # Graphify 0.9.100 (PyPI name has two y's)
```

Result: both installs exited 0 (Python 3.12.16 in each tool environment).

### Real warning: `~/.local/bin` is not on PATH

`uv` printed `warning: /Users/ankitsingh/.local/bin is not on your PATH`. The tool shims live there. This project does
not edit shell profiles (no user-wide change), so commands in this guide run with
`export PATH="$HOME/.local/bin:$PATH"` set for that shell only.

### What was deliberately not installed

The tools can also install their own git hooks, rules-file edits and user-wide skills. These steps were skipped
(approved at Gate 1; deviation in `docs/deviations.md`):

- `code-review-graph install` (git pre-commit hook collides with Husky; edits `CLAUDE.md`, `AGENTS.md`,
  `.claude/settings.json`). Only a hand-written `.mcp.json` entry is used.
- `graphify install` and `graphify claude install` (user-wide skill, always-on hook, `CLAUDE.md` section). Only the
  `graphify` CLI is used.

### Uninstall

```bash
uv tool uninstall code-review-graph
uv tool uninstall graphifyy
```

## MCP entry (project scope)

`code-review-graph install --platform claude-code --dry-run` was run once to see what the installer would write
(real output, nothing was modified):

```text
Installing MCP server config...
  [dry-run] Claude Code: would write /Users/ankitsingh/team-task-tracker-project/.mcp.json

Configured 1 platform(s): Claude Code

Graph instructions will be injected into:
  CLAUDE.md (append)

[dry-run] Would ensure .gitignore ignores .code-review-graph/.
[dry-run] No files were modified.
```

Only the `.mcp.json` entry is used; the `CLAUDE.md` injection was skipped. The installer's own default entry is the unpinned
`uvx code-review-graph serve`, and a `code-review-graph` shim command cannot start because `~/.local/bin` is not on PATH.
The committed entry therefore launches the pinned version through `uvx` (in `/opt/homebrew/bin`) and exposes five
read-only tools with `--tools` (all five exist in 2.3.9):

```json
"code-review-graph": {
  "type": "stdio",
  "command": "uvx",
  "args": ["--python", "3.12", "--from", "code-review-graph==2.3.9", "code-review-graph", "serve",
           "--tools", "get_minimal_context_tool,query_graph_tool,get_impact_radius_tool,get_review_context_tool,detect_changes_tool"]
}
```

No `env` or `headers`, so no secret. `scripts/tests/mcp-config.test.mjs` checks the entry. A Claude Code restart and the
human's approval of the server are needed before any MCP query.

## Build graphs (task 3.1)

`.code-review-graph/` and `graphify-out/` are git-ignored (`.gitignore`). Both graphs were built on 2026-11-02 at commit
`71307ad` with `export PATH="$HOME/.local/bin:$PATH"`.

| Tool              | Command                          | Wall time | Reported result                                                               | On disk |
| ----------------- | -------------------------------- | --------- | ----------------------------------------------------------------------------- | ------- |
| Code Review Graph | `code-review-graph build`        | 5.7 s     | `Full build: 197 files, 1845 nodes, 20599 edges (postprocess=full)`           | 29 MB   |
| Graphify          | `graphify extract . --code-only` | 5.9 s     | `1494 nodes, 3584 edges, 86 communities` (209 code files, no LLM, no network) | 1.8 MB  |

Real notes from the output:

- `code-review-graph status` afterwards reports `Nodes: 1830, Edges: 20453, Files: 177`, which differs from the build
  line above (`1845 / 20599 / 197`). Both numbers are the tool's own; the difference is not explained in its output.
- Graphify warned: `5 .sql file(s) contributed nothing ... tree_sitter_sql not installed`, and `11 code file(s) yielded
no symbols` (for example `backend/src/main.ts`, `backend/vitest.config.ts`). It skipped `.npmrc` as potentially
  sensitive. The `[sql]` extra was not installed (it would add a package).
- Code Review Graph used file-based community detection (`igraph not available`).
- `git status` after both builds shows only `.gitignore` and the new evidence file: no git hook, `.claude/settings*`,
  `CLAUDE.md` or `AGENTS.md` change. `.git/hooks` holds only `*.sample` files and `core.hooksPath` is still Husky.

MCP connection evidence: `docs/evidence/DEV-1015/mcp-connected.md`. The server exposes no build tool (read-only
allow-list), which is why the graph is built with the CLI.

## Targeted queries (task 4.1)

Subject: "delete a comment" and `projectAccess`. Code Review Graph queries ran through its MCP tools; Graphify through
its CLI. Outputs below are real, shortened only where marked. Each key finding was then checked in source.

### Q1. Who uses `projectAccess`? (Code Review Graph `query_graph_tool`, `callers_of`)

Result summary: `Found 21 call site(s) across 5 node(s)`, all `EXTRACTED`, confidence 1. Distinct callers:
`createActivityRouter` (1 site, line 23), `createCommentsRouter` (4: 30, 37, 44, 51), `createProjectsRouter`
(6: 29, 34, 40, 43, 48, 54), `createTasksRouter` (7: 32, 39, 46, 53, 60, 67, 74) and the test `beforeAll@L23` of
`project-access.integration.test.ts` (3: 36, 45, 54).

Confirmed in source (`grep -n projectAccess backend/src/routes/*.ts`): 18 route call sites at exactly those lines
plus 3 in the test = 21. The graph is correct. Delete route: `backend/src/routes/comments.routes.ts:47-53` uses
`projectAccess(prisma, { write: true })` (line 51).

### Q2. Call chain for comment delete (Graphify `explain` and `path`)

```text
Node: .remove()
  Source:    backend/src/services/comments.service.ts L92
Connections (6):
  --> AppError [calls] [EXTRACTED] backend/src/services/comments.service.ts:L101
  <-- createCommentsController() [calls] [INFERRED 0.85] backend/src/controllers/comments.controller.ts:L36
  --> .assertTaskWritable() [calls] [EXTRACTED] backend/src/services/comments.service.ts:L107
  --> .findComment() [calls] [EXTRACTED] backend/src/services/comments.service.ts:L99
Shortest path (2 hops):
  createCommentsRouter() <--contains [EXTRACTED]-- comments.routes.ts --imports [EXTRACTED]--> CommentsService
```

Confirmed in source: `comments.controller.ts:36` calls `service.remove(...)` and answers 204;
`comments.service.ts:99` `findComment`, `:100-105` throws 403 `FORBIDDEN` unless the caller is the author or an
`OWNER`, `:107` `assertTaskWritable`, `:108` `prisma.comment.delete`. The `INFERRED 0.85` controller edge is correct
(the tool labels it inferred although it is a direct call).

### Q3. Blast radius of `comments.service.ts` (Code Review Graph `get_impact_radius_tool`)

Result summary: `12 nodes directly changed, 25 nodes impacted (within 2 hops), 22 additional files affected`.
Non-test impact: `createCommentsController` (controller.ts:11), `createCommentsRouter` (routes.ts:18), `createApp`
(`app.ts:25`), `server.ts`. Test files listed: 18 backend integration tests, among them
`comments.add-list.integration.test.ts` and `comments.edit-delete.integration.test.ts`.

Confirmed in source: `app.ts:14` imports the service and `comments.controller.ts:9` imports it. Limitation found: 16 of
the 18 tests (for example `auth.register-login.integration.test.ts`, `tasks.sort.integration.test.ts`) are listed only
because they import `app.ts`; they do not exercise comments. The tool over-approximates through the `createApp` hub, so
"affected tests" must be narrowed by hand to the two comment files.

### Q4. Tests for comment delete (Code Review Graph `query_graph_tool`, `tests_for`, target `deleteComment`)

Result: `Found 8 result(s)`, all `indirect: true`, all in `frontend/src/lib/api/client.test.ts` (for example
`it:returns the parsed value when a 200 body matches the schema@L44`).

**This result is wrong for the question.** The name `deleteComment` resolved to the frontend function
`frontend/src/lib/api/comments.ts:54`, and the tool returned the generic API-client tests. The tests that really cover
delete are `backend/src/comments.edit-delete.integration.test.ts` (calls to `remove(...)` at lines 202, 218, 229, 240,
250: author, owner, other member, outsider, unknown id) and `frontend/src/pages/task-comments-actions.test.tsx`
(delete tests at lines 281, 300, 315, 331, 343, 372 and 382). A reviewer who trusted the graph would have missed both. Recorded as a limitation in
`docs/TOKEN-REPORT.md`.

### Q5. Context for `projectAccess` (Graphify `query "who calls projectAccess"`)

Result: 39 nodes, 68 edges. Relevant nodes: `projectAccess()` (`project-access.ts` L16), the four routers
(`createActivityRouter` L12, `createCommentsRouter` L18, `createProjectsRouter` L18, `createTasksRouter` L20),
`createApp()` (`app.ts` L25). Noise: a node `calls()` from `frontend/src/pages/project-detail.test.tsx` L83 (a test
helper whose name matches the word "calls") and `authenticate()` / `validate()` pulled in by neighbourhood.

Confirmed in source: `project-access.ts:16` is `export function projectAccess(`; router line numbers match Q1;
`project-detail.test.tsx:83` is a test helper unrelated to the middleware. Graphify gives no call-site count per
router, so it answers "which functions", not "how many routes".

### Summary of what was learned

| Question                   | Code Review Graph                | Graphify                          |
| -------------------------- | -------------------------------- | --------------------------------- |
| Callers of `projectAccess` | Exact, with every call-site line | Correct callers, no site lines    |
| Delete call chain          | Not queried (impact radius only) | Correct, controller edge inferred |
| Affected tests             | Over-approximates via `app.ts`   | Not queried                       |
| Tests for a named function | Wrong (name collision, frontend) | Not queried                       |
