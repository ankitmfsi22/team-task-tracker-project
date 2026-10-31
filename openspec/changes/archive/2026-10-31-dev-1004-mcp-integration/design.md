## Context

DEV-1004 AC: (1) Context7 and Linear configured, no tokens committed; (2) real Linear lookup shown and supported operations documented; (3) failure handling for server unavailable, auth failure, missing ticket, malformed response, unsupported operation; (4) creating/updating external tickets needs explicit approval; (5) fixtures labelled, never shown as live.

Observed 2026-10-31 (real): `get_issue DEV-8` returned the ticket; `get_issue DEV-9999` returned `{"error":"invalid_request","message":"Could not find referenced Issue.","status":400}` (a missing ticket is a 400, not a 404).
## Decisions

- **Context7 transport**: official remote HTTP `https://mcp.context7.com/mcp`, no package install (avoids "add packages"; the URL is the pin, there is no version to pin). Optional header `CONTEXT7_API_KEY: ${CONTEXT7_API_KEY}`; never a literal value. Context7 works without a key at lower rate limits.
- **Allow list**: Context7 tools are read-only, so allow `mcp__context7`. Linear is allowed by explicit tool name only (the read tools in `docs/mcp/linear-tools.md`), never `mcp__linear` or a `mcp__linear__*` wildcard, which would include writes.
- **Ask list**: every Linear write tool (`save_*`, `create_*`, `delete_*`, `share/unshare_issue`, `mark_notification`, `prepare_*_upload`, diff actions, label retire/restore) is listed under `ask` by name. Nothing is added to `deny`: writes stay possible with explicit approval (AC4).
- **Test**: one `scripts/tests/mcp-config.test.mjs` parsing `.mcp.json` and `settings.json`: Context7 present, every header/env value is a `${VAR}` reference, read tools allowed, write tools in `ask` and not in `allow`. No tests about docs or evidence.
- **Failure handling (docs)**: on any MCP failure Claude stops, reports the exact error, does not retry write tools, and uses a fixture from `docs/tickets/` only if the MCP is down, labelling it "FIXTURE, not live" in every artifact that cites it. Malformed or empty responses are treated as failure. Auth failures are fixed by the human (`/mcp`), never by asking for tokens in chat.
- **Evidence honesty (this project only)**: server unavailable is produced with a temporary local-scope MCP entry (`claude mcp add --scope local`) pointing to an unreachable URL, observed, then removed; it is never written to `.mcp.json` or committed. Auth failure is recorded from the `plugin:engineering:linear` "needs authentication" state; if that state is not observable, it is recorded as "not tested", not substituted. Evidence from other servers (for example `plugin:data:definite`) is not used. Malformed response is "not tested" because it cannot be induced safely; Claude must treat an empty, non-JSON or schema-mismatched result as a failure, report it, and not use any partial content.
- **Unsupported operation**: Linear MCP has no delete-issue tool; the evidence is the tool list plus Claude stating it is unsupported and not improvising (for example not calling `save_issue` to archive instead).
- **Library docs rule**: one line in `CLAUDE.md` tells Claude to check library APIs with Context7 before using them and, if it fails, note it and use official docs (Rule 5).
- **Context7 lookup**: needs the new server connected, so it is done after Gate 1 in a session that loaded `.mcp.json`. If it cannot connect, record the failure and consult official docs (Rule 5).

## Risks

- Tool names change upstream (Context7 renamed tools before); the allow entry uses the server name, and Linear names are re-checked against the live tool list in docs.
- The `${CONTEXT7_API_KEY}` reference fails to expand if the variable is unset; Claude Code then reports a config error, documented as a failure case.
