# 0001. Bootstrap setup and issue tracker

Status: Accepted (2026-10-31)

## Context

The AI development infrastructure has to exist before any ticket can flow through OpenSpec.
The assignment names Plane as the tracker but allows an alternative, and time is limited.

## Decision

- **One-time bootstrap before the ticket flow**, as the SDD guide prescribes: `openspec init` with the
  expanded profile, FRS and SDS, AGENTS.md, CLAUDE.md with layer files, `config.yaml`, 4 agents,
  3 hooks, permissions and templates. DEV-1001 onward follows the full `/opsx:*` flow.
- **Tracker: Linear** (the assignment's allowed alternative) instead of Plane, due to the time constraint.
  Linear MCP is connected now (read verified with `get_issue` on DEV-5). DEV-1004 formalizes
  permissions, failure handling, Context7 and docs.
- **ID mapping:** assignment IDs (DEV-10XX) are used in branches and commits; Linear keys
  (DEV-5 to DEV-22) are the tracker IDs. The mapping lives in `docs/tickets/README.md`.
- **Initial commit goes directly to main** as the repository-initialization exception.
  All later work uses feature branches and PRs.
- **Approvals recorded:** FRS, SDS, AGENTS.md, CLAUDE.md and ticket creation, approved by
  Ankit Singh on 2026-10-31.

## Consequences

- Branches and commits carry assignment IDs, so the tracker key must be looked up in the mapping table.
- The Linear MCP is not yet formally permissioned or failure-tested until DEV-1004.
- The direct-to-main commit is a one-time exception and must not be repeated.
- Switching to Plane later would need a new mapping table.
