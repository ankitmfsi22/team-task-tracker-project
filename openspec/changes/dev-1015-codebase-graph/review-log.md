# Review log

- Change: dev-1015-codebase-graph (DEV-1015)
- Reviewer: reviewer sub-agent (read-only)
- Context: fresh
- Date: 2026-11-02

## Reviewer report (verbatim)

| Severity | file:line | Issue | Suggested fix |
| --- | --- | --- | --- |
| Non-blocking (Major) | docs/TOKEN-REPORT.md:41-52 (Results rows "Files read", "Grep / Glob calls", "Graph tool calls") | I could not verify these counts from the committed evidence. The `runs/*.result.json` files hold only the `result` event. The stream-json transcripts (`$S/*.jsonl`) that the Method says the Read/Grep/Glob counts came from are not committed, and the `result` events contain no tool-call data. The spec says all numbers MUST come from real session data, so these rows are checkable only by trusting the author. Every other number does reproduce from the result files. | Commit the four stream-json transcripts (or a small extract of the tool_use events) under docs/evidence/DEV-1015/runs/, or mark these rows "not reproducible from committed evidence". |
| Non-blocking | docs/evidence/DEV-1015/runs/run.sh:3-8 | The launcher hard-codes the session scratchpad path (`/private/tmp/claude-501/...`). The MCP config files (empty config for baseline, graph-only config) and the allowed-tools strings are not committed, so the run cannot be reproduced from the repo. The Method table in TOKEN-REPORT.md describes them in words only. | Commit the two MCP config JSONs and the exact `--allowedTools` strings, or document them in TOKEN-REPORT.md. |
| Non-blocking | docs/GRAPH-TOOLS.md:115 | Cites `comments.routes.ts:46-52` for the delete route. In source, `router.delete(` is at 47, `projectAccess` at 51, `controller.remove` at 52 and the closing `)` at 53. The cited range is off by one. Line 51 itself is right. | Change to `47-53`. |
| Non-blocking | docs/GRAPH-TOOLS.md:157 | Q4 says `task-comments-actions.test.tsx` covers delete via the "`Delete` button, line 224". Line 224 is a `findByRole('button', { name: 'Delete' })` inside the test "Others are not offered Edit" (line 217). The real delete tests are at 281, 300, 315, 331, 343, 372 and 382. | Cite `:281-315` (or the `describe('Delete comment')` at `:280`). |
| Non-blocking | docs/TOKEN-REPORT.md:78-79 | Says the results are "consistent with the schema and `ToolSearch` overhead predicted in `design.md`". design.md predicts only tool-schema token overhead and never mentions `ToolSearch`. The one-run result cannot support this attribution. | Drop "and `ToolSearch`", or say it is an observation and not a design.md prediction. |
| Non-blocking | docs/TOKEN-REPORT.md:35-37 | The "Findings" section contains a "none found" error entry for Task baseline that I did not fully re-verify. I spot-checked the cited lines from the raw answers (comments.service.ts 99-108 and 117/123/133, project-access.ts 32/39/43-44, test lines 199/213/224/236/247, comment-permissions.ts:23, and the frontend test lines). All match source. The "wrong" entries are also real: `project-access.ts:14` is a comment and the 404 is at line 32, and `comments.controller.ts:35` and `projects.controller.ts:30` do read `membership`. | No action. Optionally note that only the listed runs' citations were checked, not every cited line. |
| Non-blocking | docs/VERSIONS.md:9-60 | The whole table was re-padded, so about 45 unchanged rows show in the diff. This hides the 4 real additions (uv, Python, Code Review Graph, Graphify). | Accept as a Prettier column-width side effect, or note it in the PR. |
| Non-blocking | openspec/changes/dev-1015-codebase-graph/review-log.md | The file is still the empty template (as expected before the main session saves this review). | The main session saves this table here. There are no Blocking items. |

**Specific checks**
1. **TOKEN-REPORT numbers vs raw JSON.**
   - Verified correct: all four input totals (234,815 / 181,167 / 137,461 / 193,757, each the sum of input + cache creation + cache read), the cache read and creation values, output tokens, cost (0.1262 / 0.1259 / 0.0990 / 0.1346), turns (11 / 11 / 6 / 7), `duration_ms` and `duration_api_ms`.
   - The derived values are correct: +56,296 input tokens, +USD 0.0356, and 87 to 92 percent cache reads (91.7 / 89.2 / 87.6 / 87.4).
   - Not checkable from the committed files: the wall-clock seconds (they live in the uncommitted `.wall` files), the file/Grep/graph-call counts, and the Claude Code version.
2. **GRAPH-TOOLS Q1-Q5 file:line vs source.** All correct except the two findings above (:115 and :157).
   - Q1: the 18 route sites plus 3 test sites match exactly, with 21 in total.
   - Q2/Q3: `comments.service.ts` lines 92 / 99 / 100-105 / 107 / 108, `comments.controller.ts:36`, `app.ts:14` and `:25`, and `comments.controller.ts:9` and `:11` all match.
   - Q4: the `remove(...)` lines 202 / 218 / 229 / 240 / 250 match.
   - Q5: router line numbers 12 / 18 / 18 / 20 match, as do `project-access.ts:16` and `project-detail.test.tsx:83`.
3. **No hook, settings, CLAUDE.md or AGENTS.md change.** Confirmed: the diff touches no `.claude/`, `.husky/`, `CLAUDE.md` or `AGENTS.md`. Only `.gitignore`, `.mcp.json`, docs, the test and the change folder were modified.
4. **No claims from estimates.** TOKEN-REPORT.md explicitly claims no saving. Its figures are n=1 deltas and a percentage computed from measured values. "Not measured" is used for peak context and the wall-clock cause. It flags that the task graph run made zero graph calls. The report does not quote vendor numbers.
5. **Gate-1 amendment consistency.** Consistent. The amendment row covers `design.md` and `specs/` for the uvx launch and says "no other change". Decision 3 in design.md, the spec requirement ("uvx --from code-review-graph==2.3.9"), `.mcp.json`, the test and D-120 all agree. proposal.md and tasks.md carry no conflicting statement. Gate 2 is blank, as it should be.
6. **CLAUDE.md and AGENTS.md rules.**
   - The commit scope `infra` is allowed, and the commit format includes DEV-1015.
   - Versions are pinned and there are no new packages in any `package.json`.
   - No `any`, `@ts-ignore` or `eslint-disable`.
   - No secrets: the `.mcp.json` entry has no `env` or `headers`.
   - The test-writer was used only for 2.1 (D-121), and no existing assertion was weakened. The existing tests are unchanged and new ones were appended.
   - Deviations D-119 to D-122 are present.
   - `pnpm test` exit 0 (backend 22 files / 245 tests passed, frontend passed, root tests included).
   - I did not run lint, typecheck, build or format.
   - I did not run `openspec validate`.

**Per-scenario result**
- Versions are recorded and match the install: PASS. VERSIONS.md, install-check.md lines 167 / 170 and the GRAPH-TOOLS install commands all show 2.3.9 and 0.9.100.
- Toolchain versions and registry check are evidenced: PASS. uv 0.13.6 and Python 3.12.16 are in VERSIONS.md and install-check.md.
- Install does not touch user-wide or existing hooks: PASS. No hook, settings, CLAUDE.md or AGENTS.md change. The dry-run output is recorded, and the only project config change is the `.mcp.json` entry.
- Entry is present and read-only: PASS. Implemented and tested in `scripts/tests/mcp-config.test.mjs`. The five tools are in an allow-list and none match the write pattern.
- Literal credential is rejected: PASS. Tested through `findLiteralCredentials` on the code-review-graph server.
- Both graphs exist and are queried: PASS. Build commands and statistics are given, and Q1-Q5 cover files, dependencies, call relationships and affected tests with real output.
- Findings are confirmed in source: PASS with two minor citation slips (:115 and :157). Wrong results are labelled (Q4, the Q3 over-approximation, the Q2 INFERRED label).
- Both comparisons are reported: PASS for the tables and sources, with the caveat that the Read/Grep/graph-call counts are not reproducible from committed evidence (finding 1).
- Unsupported claims are rejected: PASS. n=1 is stated, no saving is claimed and there are no vendor numbers.
- Failure is recorded with a fallback: PASS. The `~/.local/bin` PATH warning and the MCP name and unpinned-default issue are recorded with a chosen alternative. The Gate-1 amendment approves the uvx launch. The Q4 and Graphify `.sql` limitations are recorded too.

No Blocking findings.

## Disposition (main session)

Blocking findings: none. Non-blocking findings are carried to `docs/deviations.md` and the PR as accepted deviations; before Gate 2 the human asked for three of them to be fixed (the two citations and the missing wall-clock and tool-call counts), which are marked Fixed with their commits. The lint, typecheck, build, format and `openspec validate` runs the reviewer did not do were run by the main session before review and passed.

| Severity | file:line | Issue | Fix | Status |
| -------- | --------- | ----- | --- | ------ |
| Non-blocking (Major) | docs/TOKEN-REPORT.md:41-52 | File, Grep/Glob and graph-call counts and wall-clock seconds are not reproducible from committed evidence | Commit tool_use extract and `.wall` values | Fixed (411e719) |
| Non-blocking | docs/evidence/DEV-1015/runs/run.sh:3-8 | Launcher hard-codes scratchpad path; MCP configs and tool strings not committed | Commit configs and strings | Accepted, D-123 |
| Non-blocking | docs/GRAPH-TOOLS.md:115 | `comments.routes.ts:46-52` should be `47-53` | Edit citation | Fixed (ff25dc2) |
| Non-blocking | docs/GRAPH-TOOLS.md:157 | `task-comments-actions.test.tsx` line 224 is not a delete test; real ones at 281, 300, 315, 331, 343, 372, 382 | Edit citation | Fixed (ff25dc2) |
| Non-blocking | docs/TOKEN-REPORT.md:78-79 | "`ToolSearch` overhead predicted in design.md" is not in design.md | Reword | Accepted, D-125 |
| Non-blocking | docs/TOKEN-REPORT.md:35-37 | Only the listed citations were checked, not every cited line | None | Accepted, no action |
| Non-blocking | docs/VERSIONS.md:9-60 | Prettier re-padded about 45 unchanged rows | Note in PR | Accepted, D-125 |
| Non-blocking | review-log.md | Template empty before this save | Saved here | Resolved |
