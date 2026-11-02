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
