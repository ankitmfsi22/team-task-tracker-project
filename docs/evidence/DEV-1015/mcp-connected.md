# MCP connection evidence (DEV-1015)

Date: 2026-11-02. Source: the tool list of the Claude Code session after restart and server approval by the human
(the `/mcp` panel itself is interactive and was not captured; the tool list below is what the session exposes).

Server `code-review-graph` (launch: pinned `uvx --python 3.12 --from code-review-graph==2.3.9 code-review-graph serve --tools ...`).
Tools exposed (5, matching the `--tools` allow-list in `.mcp.json`):

- mcp__code-review-graph__detect_changes_tool
- mcp__code-review-graph__get_impact_radius_tool
- mcp__code-review-graph__get_minimal_context_tool
- mcp__code-review-graph__get_review_context_tool
- mcp__code-review-graph__query_graph_tool

Live call (`get_minimal_context_tool`, before the graph was built) returned real server output:

```json
{
  "status": "not_ready",
  "reason": "missing_graph",
  "summary": "No graph database found. Build the graph before requesting context.",
  "next_tool_suggestions": ["build_or_update_graph"]
}
```

No `build_or_update_graph` tool is exposed (read-only allow-list), so the graph is built with the CLI (task 3.1).
