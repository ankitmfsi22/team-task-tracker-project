## Why

Ticket DEV-1004 (Linear DEV-8, AS §3, §7 Rules 1, 5, 17, 18, 19) requires Context7 and the issue-tracker MCP configured without committed tokens, a real ticket lookup, documented permissions and failure handling. Fetched from Linear via MCP (real ticket, not the fixture). Existing: Linear MCP in `.mcp.json` and `docs/mcp/linear-tools.md`. Gaps: no Context7 server, no MCP entries in `.claude/settings.json` (every MCP call currently prompts, read or write alike), no `docs/mcp/README.md`, no failure-handling evidence.

## What Changes

- Add the official remote Context7 server to `.mcp.json` (project scope); the optional API key is only a `${CONTEXT7_API_KEY}` reference.
- `.claude/settings.json`: allow read-only Context7 and Linear tools by explicit name; put Linear write tools on `ask`.
- Add a `node:test` test for the MCP config and permissions (written first by test-writer).
- Add `docs/mcp/README.md` (setup, supported operations read/write and tested/not tested, permissions, failure handling); mark tested operations in `docs/mcp/linear-tools.md`.
- Record real evidence from this project in `docs/evidence/DEV-1004/`: one Context7 lookup, the missing-ticket lookup, unsupported operation, server unavailable (temporary uncommitted local-scope entry) and auth failure. Cases that cannot be reproduced safely are marked "not tested".
- Add one `CLAUDE.md` line: check library APIs with Context7 first; on failure note it and use official docs (Rule 5).
- Out of scope: custom MCP server (AS §5), new packages, production code, workflow traceability (DEV-1005).

## Capabilities

### New Capabilities
- `mcp-integration`: Context7 and Linear MCP configuration, least-privilege permissions and safe failure handling.

### Modified Capabilities
None.

## Impact

`.mcp.json`, `.claude/settings.json`, `docs/mcp/`, `docs/evidence/`, `scripts/tests/`. No production code, no packages, no API or schema change. Ticket: DEV-1004 (Linear DEV-8), blocked by DEV-1002 (done).

## Rollback

Revert the branch commits; only MCP config, permissions, docs, a test and evidence change.
