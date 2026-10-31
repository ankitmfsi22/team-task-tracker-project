# MCP integration

Servers (project scope, `.mcp.json`): `linear` (issue tracker) and `context7` (library docs). Full Linear tool list: [linear-tools.md](linear-tools.md). Evidence: `docs/evidence/DEV-1004/`.

## Setup

1. Open `claude` in the repo and approve the project servers when asked (once per machine).
2. Linear: authenticate through `/mcp` (OAuth in the browser). No token is stored in the repo.
3. Context7: optional API key for higher rate limits. Set the variable in your shell or profile, never in a committed file: `CONTEXT7_API_KEY=<key>`. The header references `${CONTEXT7_API_KEY}`, so the variable must exist; an empty value is expected to work (unverified).
4. Check with `claude mcp list` (expect `✔ Connected`).

## Supported operations

| Server   | Read                                                           | Write                                                                      | Tested                                                                           |
| -------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| linear   | `get_issue`, `list_issues`, `list_comments`, `list_*`, `get_*` | `save_issue`, `save_comment`, `save_*`, `create_*`, `delete_*`, share etc. | `get_issue` (real ticket, missing key)                                           |
| context7 | library lookup tools (read-only)                               | none                                                                       | tested: one Express 5 lookup, see `docs/evidence/DEV-1004/02-context7-lookup.md` |

Not supported: deleting or archiving an issue (no tool exists). Write tools were never called in this ticket. All other tools are untested; do not assume every tracker operation works.

## Permissions (`.claude/settings.json`)

- `allow`: `mcp__context7` and the Linear read tools by explicit name. No `mcp__linear` or wildcard rule.
- `ask`: every Linear write tool. Creating or updating an external ticket needs explicit human approval each time (Rule 17).
- Checked by `scripts/tests/mcp-config.test.mjs`. Secrets: only `${ENV}` references in `.mcp.json` (Rule 19).

## Failure handling (Rule 18)

In every case Claude stops the dependent step, reports the exact error, never fabricates a live result, and never retries a write tool on its own.

| Failure               | Seen as                                                        | Claude must                                                                                                                               |
| --------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Server unavailable    | `✘ Failed to connect` (observed, ECONNREFUSED)                 | Report it; use a fixture from `docs/tickets/` only if the needed MCP is down, labelled "FIXTURE, not live" with the failure reason        |
| Auth failure          | `Needs authentication` / `Pending approval`                    | Report it; ask the human to run `/mcp` or approve; never ask for tokens in chat. Reproduced for Linear with a temporary local-scope entry |
| Missing ticket        | `invalid_request … Could not find referenced Issue` (HTTP 400) | Report the key and error; invent nothing; start no change                                                                                 |
| Malformed response    | empty, non-JSON or unexpected shape (not tested)               | Treat as failure; use none of the partial content; report it                                                                              |
| Unsupported operation | no matching tool (for example delete issue)                    | Say it is unsupported, name the tools that exist, do not improvise another write                                                          |

Context7 failure: note it and use official documentation (Rule 5); see `docs/evidence/DEV-1004/02-context7-lookup.md`.
