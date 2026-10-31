# Failing tests before implementation (DEV-1003, task 1.1)

Written by the test-writer sub-agent from the agent-roles spec scenarios; run before any agent file existed. 7 of 8 fail on missing behaviour; "Reviewer has no write tools" passes because the existing reviewer is already read-only.

```
not ok 1 - Role agents exist with all sections
  error: '.claude/agents/implementer.md is missing'
not ok 2 - Missing role is detected
  error: '.claude/agents/implementer.md is missing'
ok 3 - Reviewer has no write tools
not ok 4 - Reviewer requires spec and test evidence
  error: '.claude/agents/reviewer.md must mention the approved spec'
not ok 5 - Coordinator has no write tools
  error: '.claude/agents/coordinator.md is missing'
not ok 6 - Coordinator forbids self-approval
  error: '.claude/agents/coordinator.md is missing'
not ok 7 - Implementer cannot edit tests
  error: '.claude/agents/implementer.md is missing'
not ok 8 - Docs list all agents
  error: 'docs/agents.md is missing'
# tests 8
# pass 1
# fail 7
```
