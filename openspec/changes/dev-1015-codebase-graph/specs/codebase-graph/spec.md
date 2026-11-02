# Spec Delta

## Purpose

Defines how the codebase-graph tools (Code Review Graph and Graphify) are installed, pinned, queried and evaluated, and that evaluation claims rest on measured data.

## ADDED Requirements

### Requirement: Pinned installation from official docs
Both tools SHALL be installed by the method in their official documentation at exact versions recorded in `docs/VERSIONS.md` and `docs/GRAPH-TOOLS.md`. The install MUST NOT use `@latest` or an unpinned version, MUST NOT write secrets, and MUST keep configuration project-scoped.

#### Scenario: Versions are recorded and match the install
- **WHEN** a reader compares `docs/VERSIONS.md` with `uv tool list`
- **THEN** Code Review Graph 2.3.9 and `graphifyy` 0.9.100 appear in both, and the install commands in `docs/GRAPH-TOOLS.md` name those exact versions

#### Scenario: Toolchain versions and registry check are evidenced
- **WHEN** a reader opens `docs/VERSIONS.md` and `docs/evidence/DEV-1015/`
- **THEN** the exact `uv` and Python versions are listed, and the saved output of the version and registry check shows the two pinned tool versions resolved

#### Scenario: Install does not touch user-wide or existing hooks
- **WHEN** the install commands in `docs/GRAPH-TOOLS.md` are run
- **THEN** no git hook, `~/.claude` file, `CLAUDE.md`, `AGENTS.md` or `.claude/settings.json` is changed, and the only project config change is the `code-review-graph` entry in `.mcp.json`

### Requirement: MCP entry is project-scoped and safe
`.mcp.json` SHALL contain a `code-review-graph` stdio entry that launches the pinned version (`uvx --from code-review-graph==2.3.9`) and whose `--tools` allowlist names only read-only tools, and which holds no literal credential. `scripts/tests/mcp-config.test.mjs` MUST assert this, in addition to every assertion it already has.

#### Scenario: Entry is present and read-only
- **WHEN** `scripts/tests/mcp-config.test.mjs` runs
- **THEN** it finds a `code-review-graph` server with `command` `uvx`, `--from code-review-graph==2.3.9` and `serve` in `args`, and a `--tools` list that contains no build, embed, register or other write tool

#### Scenario: Literal credential is rejected
- **WHEN** the `code-review-graph` entry has a literal `env` or `headers` value
- **THEN** `findLiteralCredentials` reports it and the test fails

### Requirement: Graph generation and targeted queries
A graph SHALL be generated for each tool, and `docs/GRAPH-TOOLS.md` SHALL show, with real output, queries for relevant files, dependencies, call relationships and affected tests. Each key finding MUST be confirmed against source, with the file and line checked.

#### Scenario: Both graphs exist and are queried
- **WHEN** a reader follows `docs/GRAPH-TOOLS.md`
- **THEN** it shows the build command and statistics for each graph and at least one query per category (files, dependencies, call relationships, affected tests) with its output

#### Scenario: Findings are confirmed in source
- **WHEN** a reader checks each key finding listed as confirmed
- **THEN** the cited file and line in the repository support it, and any finding that is wrong or unconfirmed is labelled as such

### Requirement: Measured baseline versus graph-assisted comparison
`docs/TOKEN-REPORT.md` SHALL compare one real task and one real review, each run once without and once with the graph, reporting tokens or context used, files examined, time and findings. All numbers MUST come from real session data, and the method and limitations MUST be stated.

#### Scenario: Both comparisons are reported
- **WHEN** a reader opens `docs/TOKEN-REPORT.md`
- **THEN** a table gives, for the task (comment-delete permission and its tests) and the review (impact of changing `projectAccess`), baseline and graph-assisted values for tokens, files examined, time and findings, each with its data source

#### Scenario: Unsupported claims are rejected
- **WHEN** the report states a reduction or saving
- **THEN** it cites the measured values behind it, says the sample is one run per cell, and makes no percentage or saving claim from vendor benchmarks or estimates

### Requirement: Unavailable or incompatible tools are documented
If a tool cannot be installed, built or queried, `docs/GRAPH-TOOLS.md` SHALL record the real error text and the step that failed, and SHALL propose an alternative that the human approves before it is used.

#### Scenario: Failure is recorded with a fallback
- **WHEN** an install, build or query step fails
- **THEN** the failing command and its error output appear verbatim, and an alternative is proposed and marked pending or approved by the human
