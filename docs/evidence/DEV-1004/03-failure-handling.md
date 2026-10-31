# Failure-handling evidence (task 2.3)

Date: 2026-10-31. All observations are from this project and session; "not tested" means not tested.

| Case                  | Status     | Evidence                                                   |
| --------------------- | ---------- | ---------------------------------------------------------- |
| Missing ticket        | Observed   | `get_issue DEV-9999`, below                                |
| Unsupported operation | Observed   | no delete-issue tool exists, below                         |
| Server unavailable    | Observed   | temporary local-scope entry with an unreachable URL, below |
| Auth failure          | Not tested | `plugin:engineering:linear` does not exist here, see below |
| Malformed response    | Not tested | cannot be induced safely; handling rule below              |

## Missing ticket

Call `mcp__linear__get_issue` with `id: "DEV-9999"`:

```
{"error":"invalid_request","message":"Could not find referenced Issue.","status":400,"requestId":"a5338ab89d1a455c"}
```

Note: a missing ticket is reported as HTTP 400 `invalid_request`, not 404. Claude must report the key and this error, invent no ticket content and start no change for it. Control: `get_issue DEV-8` returned the real ticket the same session.

## Unsupported operation

Request: "delete a Linear issue". Tool search for "linear delete issue" returned only `delete_attachment`, `delete_comment` and `delete_diff_comment` (plus label/status read tools); there is no `delete_issue` tool. Expected behaviour (spec): Claude states deleting an issue is unsupported by the Linear MCP, names the delete tools that exist, and does not improvise, for example by calling `save_issue` to cancel or archive it instead. No Linear write tool was called.

## Server unavailable

A temporary local-scope entry (stored in the user's `~/.claude.json`, never in `.mcp.json`, never committed) was added, observed and removed:

```
$ claude mcp add --scope local --transport http unreachable-test http://127.0.0.1:9/mcp
$ claude mcp list
linear: https://mcp.linear.app/mcp (HTTP) - ✔ Connected
unreachable-test: http://127.0.0.1:9/mcp (HTTP) - ✘ Failed to connect — ECONNREFUSED: Unable to connect. Is the computer able to access the url?
$ claude mcp remove unreachable-test -s local
Removed MCP server unreachable-test from local config
```

`git status` was clean of config changes afterwards. Behaviour: the failing server is reported and its tools are unavailable; other servers keep working. Claude must report the failure and use a labelled fixture from `docs/tickets/` only if the needed MCP (for example Linear) is down.

## Auth failure

The requested source, `plugin:engineering:linear`, is not configured in this environment (`claude mcp list` shows no such server). Evidence from other servers was deliberately not substituted. The project-level `context7` server shows a related real state: `⏸ Pending approval` (see `02-context7-lookup.md`). The auth-failure case is therefore **not tested**. Handling rule: when a server reports "needs authentication", Claude stops, reports it, and tells the human to authenticate through `/mcp`; Claude never asks for tokens in chat and never reads `.env` files.

## Malformed response

Not tested. Handling rule: an empty, non-JSON or schema-mismatched result is a failure; Claude reports it, uses none of the partial content, does not retry write tools, and does not present fixture data as live.
