# agent-roles Specification

## Purpose

Defines the Claude Code agents for implementation, test writing, review and coordination: each has scope, permitted actions, expected output and restrictions; the reviewer and coordinator are read-only; and all agents are documented in one table.

## Requirements

### Requirement: Every agent defines its boundaries
Each role agent in `.claude/agents/` (`implementer`, `test-writer`, `reviewer`, `coordinator`) SHALL have frontmatter `name`, `description` and `tools`, and body headings Scope, Permitted actions, Expected output and Restrictions.

#### Scenario: Role agents exist with all sections
- **WHEN** a test reads `implementer.md`, `test-writer.md`, `reviewer.md` and `coordinator.md`
- **THEN** each has `name`, `description`, `tools` and headings for Scope, Permitted actions, Expected output and Restrictions

#### Scenario: Missing role is detected
- **WHEN** a role file is absent or lacks a required heading
- **THEN** the test fails naming the file and the missing item

### Requirement: Reviewer is read-only and evidence-based
The `reviewer` agent SHALL NOT have `Write`, `Edit` or unrestricted `Bash` tools, and SHALL compare the diff to the approved spec and to `pnpm test` output rather than the implementer's summary.

#### Scenario: Reviewer has no write tools
- **WHEN** a test parses the `reviewer` tools list
- **THEN** it contains none of `Write`, `Edit`, `NotebookEdit` or bare `Bash`

#### Scenario: Reviewer requires spec and test evidence
- **WHEN** a test reads the reviewer body
- **THEN** it names the approved spec, the test output and the instruction not to trust the implementer's summary

### Requirement: Coordinator delegates but cannot approve
The `coordinator` agent SHALL be read-only, SHALL split a change's tasks.md groups into a delegation plan (test-writer, then implementer, then reviewer), and SHALL state it never approves its own work or gates.

#### Scenario: Coordinator has no write tools
- **WHEN** a test parses the `coordinator` tools list
- **THEN** it contains none of `Write`, `Edit` or bare `Bash`

#### Scenario: Coordinator forbids self-approval
- **WHEN** a test reads the coordinator Restrictions section
- **THEN** it states that it never approves its own work, Gate 1 or Gate 2

### Requirement: Implementer and test-writer are separated
The `implementer` SHALL NOT edit test files and SHALL start only after failing tests exist; the `test-writer` SHALL NOT edit implementation files.

#### Scenario: Implementer cannot edit tests
- **WHEN** a test reads the implementer Restrictions section
- **THEN** it forbids editing `*.test.*`, `*.spec.*` and `e2e/` files and requires failing tests first

### Requirement: Agents are documented in one table
`docs/agents.md` SHALL list every agent in `.claude/agents/` with scope, permitted actions, expected output and restrictions.

#### Scenario: Docs list all agents
- **WHEN** a test lists `.claude/agents/*.md` and reads `docs/agents.md`
- **THEN** every agent name appears in the document
