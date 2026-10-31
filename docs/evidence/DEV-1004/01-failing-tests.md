# DEV-1004 task 1.1: failing tests (real run output)

Date: 2026-10-31

This is the real output of `node --test scripts/tests/mcp-config.test.mjs` before implementation.
Failures are for missing behaviour: no `context7` server, no `mcp__context7` allow rule, no Linear write tools under `ask`.
Tests 2 and 4 pass already: no literal credentials exist and Linear is not allowed wholesale today; they guard against regressions.

```
TAP version 13
# Subtest: Both servers are configured
not ok 1 - Both servers are configured
  ---
  duration_ms: 3.6608
  type: 'test'
  location: 'C:\\Users\\kkomt\\Downloads\\team-task-tracker-v2\\scripts\\tests\\mcp-config.test.mjs:69:1'
  failureType: 'testCodeFailure'
  error: 'mcpServers contains context7'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  operator: '=='
  stack: |-

  ...
# Subtest: Literal credentials are rejected
ok 2 - Literal credentials are rejected
  ---
  duration_ms: 5.08
  type: 'test'
  ...
# Subtest: Read tools are allowed
not ok 3 - Read tools are allowed
  ---
  duration_ms: 0.6893
  type: 'test'
  location: 'C:\\Users\\kkomt\\Downloads\\team-task-tracker-v2\\scripts\\tests\\mcp-config.test.mjs:91:1'
  failureType: 'testCodeFailure'
  error: 'allow contains mcp__context7'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-

  ...
# Subtest: Linear is not allowed wholesale
ok 4 - Linear is not allowed wholesale
  ---
  duration_ms: 0.7464
  type: 'test'
  ...
# Subtest: Write tools ask for approval
not ok 5 - Write tools ask for approval
  ---
  duration_ms: 0.8194
  type: 'test'
  location: 'C:\\Users\\kkomt\\Downloads\\team-task-tracker-v2\\scripts\\tests\\mcp-config.test.mjs:107:1'
  failureType: 'testCodeFailure'
  error: 'ask contains mcp__linear__create_attachment'
  code: 'ERR_ASSERTION'
  name: 'AssertionError'
  expected: true
  actual: false
  operator: '=='
  stack: |-

  ...
1..5
# tests 5
# suites 0
# pass 2
# fail 3
# cancelled 0
# skipped 0
# todo 0
# duration_ms 307.7621
```
