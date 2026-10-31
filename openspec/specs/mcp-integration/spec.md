# mcp-integration Specification

## Purpose

Defines how the Linear and Context7 MCP servers are configured without secrets, which MCP tools Claude may call without approval, that Linear write tools require human approval, and how MCP failures are handled and reported.

## Requirements

### Requirement: Context7 is configured without secrets
`.mcp.json` SHALL define the `linear` and `context7` servers at project scope, and every header and env value SHALL be an `${ENV}` reference, never a literal credential.

#### Scenario: Both servers are configured
- **WHEN** a test parses `.mcp.json`
- **THEN** `mcpServers` contains `linear` and `context7`, each with an `https://` URL

#### Scenario: Literal credentials are rejected
- **WHEN** a test scans every header and env value of every server in `.mcp.json`
- **THEN** each value matches `${NAME}`, and the test fails naming the server and key for any literal value

### Requirement: Read-only MCP tools are allowed
`.claude/settings.json` SHALL allow Context7 and the read-only Linear tools by explicit name, and SHALL NOT allow any Linear server-wide or wildcard rule.

#### Scenario: Read tools are allowed
- **WHEN** a test parses `permissions.allow`
- **THEN** it contains `mcp__context7`, `mcp__linear__get_issue`, `mcp__linear__list_issues` and `mcp__linear__list_comments`

#### Scenario: Linear is not allowed wholesale
- **WHEN** a test parses `permissions.allow`
- **THEN** it contains no `mcp__linear` or `mcp__linear__*` entry

### Requirement: External ticket changes require approval
`.claude/settings.json` SHALL list every Linear write tool under `ask` and SHALL NOT list any of them under `allow`.

#### Scenario: Write tools ask for approval
- **WHEN** a test parses `permissions`
- **THEN** `ask` contains `mcp__linear__save_issue`, `mcp__linear__save_comment` and `mcp__linear__delete_comment`, and `allow` contains none of the Linear write tools

#### Scenario: Unapproved write is not possible
- **WHEN** a Linear write tool is called and the human has not approved it
- **THEN** the call does not run, and no ticket is created or changed

### Requirement: MCP failures are handled safely
`docs/mcp/README.md` SHALL state, for server unavailable, auth failure, missing ticket, malformed response and unsupported operation, what Claude does: stop, report the exact error, never present fixture data as live, and use a labelled fixture from `docs/tickets/` only when the MCP is down.

#### Scenario: Missing ticket stops the work
- **WHEN** `get_issue` is called with a non-existent key and returns a not-found error
- **THEN** Claude reports the error and the key, does not invent ticket content, and does not start a change for it

#### Scenario: Unavailable server uses a labelled fixture
- **WHEN** the Linear MCP is unavailable or unauthenticated
- **THEN** Claude reports the failure, and any fixture used is labelled "FIXTURE, not live" and says why the live lookup failed

#### Scenario: Unsupported operation is reported
- **WHEN** the requested operation has no MCP tool (for example deleting a Linear issue)
- **THEN** Claude states the operation is unsupported, names the tools that do exist, and does not improvise a workaround or call a different write tool
