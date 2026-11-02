# Token report: baseline versus graph-assisted (DEV-1015)

Measured on 2026-11-02 with four real `claude -p` runs (Claude Code 2.1.316, default model), at commit `8f1f539`. The
graph was built at `71307ad`; the commits in between change only docs. Raw per-run results (the `result` event of each
`stream-json` run) are in `docs/evidence/DEV-1015/runs/*.result.json`; prompts and the launcher are in the same folder.

## Method

| Item         | Task                                                                                                             | Review                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Prompt       | Who may delete a comment (roles, archived task), with file:line, and the tests covering it                       | Impact of changing `projectAccess`: callers, files, test files to re-run |
| Baseline run | tools `Read,Grep,Glob`; `--strict-mcp-config` with an empty MCP config                                           | same                                                                     |
| Graph run    | same tools plus `mcp__code-review-graph__*`; MCP config with only `code-review-graph`                            | same                                                                     |
| Prompt delta | graph run adds one line: "Code graph tools (mcp__code-review-graph__*) are available; use them where they help." | same                                                                     |

All runs: `--permission-mode dontAsk --no-session-persistence --output-format stream-json --verbose`, run one after
the other from the repository root, one run per cell (n=1). The project `CLAUDE.md` is loaded in every run.

Metric sources:

- **Tokens (input)**: `usage.input_tokens + cache_creation_input_tokens + cache_read_input_tokens` from the final
  `result` event (cumulative over all turns). **Output tokens**: `usage.output_tokens`. Cost: `total_cost_usd` as
  reported by the tool.
- **Files examined**: distinct file paths in `Read` tool calls, counted from the `assistant` events. Files that were only
  matched by `Grep` or `Glob`, or returned by the graph, are not counted.
- **Time**: `duration_ms` and `duration_api_ms` from the `result` event, and wall-clock time measured by the launcher.
- **Findings**: counted from the final answer, then each file:line was opened and checked in source.

## Results

| Metric (source)                    | Task, baseline | Task, graph  | Review, baseline | Review, graph                       |
| ---------------------------------- | -------------- | ------------ | ---------------- | ----------------------------------- |
| Input tokens, total (result.usage) | 234,815        | 181,167      | 137,461          | 193,757                             |
| of which cache read                | 215,307        | 161,681      | 120,383          | 169,283                             |
| of which cache creation            | 19,496         | 19,476       | 17,070           | 24,462                              |
| Output tokens (result.usage)       | 2,657          | 3,168        | 1,857            | 1,968                               |
| Cost, USD (result.total_cost_usd)  | 0.1262         | 0.1259       | 0.0990           | 0.1346                              |
| Turns (result.num_turns)           | 11             | 11           | 6                | 7                                   |
| Files read (Read calls)            | 4              | 4            | 1                | 1                                   |
| Grep / Glob calls                  | 6 / 0          | 6 / 0        | 2 / 2            | 2 / 1                               |
| Graph tool calls                   | 0              | **0**        | 0                | 1 (`query_graph_tool`, `tests_for`) |
| `duration_ms`                      | 215,012        | 221,306      | 205,910          | 208,580                             |
| `duration_api_ms`                  | 19,544         | 22,955       | 14,595           | 16,830                              |
| Wall-clock (launcher)              | 216.3 s        | 224.7 s      | 207.6 s          | 212.0 s                             |
| Peak context window                | not measured   | not measured | not measured     | not measured                        |

## Findings (each file:line checked in source)

| Run              | Reported                                                                                        | Wrong or imprecise                                                                                                                                                 | Extra correct finding versus the other run                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Task, baseline   | 7 backend checks plus the frontend rule; 5 backend and 7 frontend delete tests; 5 coverage gaps | none found                                                                                                                                                         | none                                                                                                           |
| Task, graph      | same rule and tests, plus 2 more test locations                                                 | `project-access.ts:14` cited for the 404; line 14 is a comment, the 404 is at line 32 (imprecise)                                                                  | `activity.history.integration.test.ts:269` and `packages/shared/src/openapi.test.ts:281,290` (DELETE contract) |
| Review, baseline | 18 route call sites in 4 files, 14 test files to re-run, behaviours to preserve                 | "Nothing in `backend/src` reads `res.locals.project` or `membership`" is wrong: `comments.controller.ts:35` and `projects.controller.ts:30` read `membership.role` | none                                                                                                           |
| Review, graph    | same 18 call sites and 14 test files; names the two controllers that read `membership`          | none found                                                                                                                                                         | the two `membership` readers; the OpenSpec requirement at `openspec/specs/projects/spec.md:112`                |

Both review runs gave the same call sites (verified: 18 route sites plus 3 in the middleware test, see
`docs/GRAPH-TOOLS.md` Q1) and the same list of 14 test files, which was matched by file name and not opened.

## What the data supports

- In the task comparison the graph run **did not call any graph tool** (0 calls). Its numbers are a second baseline
  sample, not a graph measurement. The spread between the two task runs (234,815 versus 181,167 input tokens, with the
  same tool use) shows the noise of a single run.
- In the review comparison the graph run made one graph call (`tests_for`, after one `ToolSearch` to load the
  deferred tool schema). It used 56,296 more input tokens (193,757 versus 137,461), one more turn and USD 0.0356 more than
  the baseline. Its answer was more correct on one point (the `membership` readers), but this sample cannot say whether
  the graph or run-to-run variation caused that.
- Files read were equal in both pairs (4 and 1).
- No saving or reduction is claimed. These four runs do not show a token saving from the graph; they are consistent
  with the schema and `ToolSearch` overhead predicted in `design.md`, but with n=1 they do not prove it.

## Limitations

- One run per cell; no repetition, no confidence interval. Model nondeterminism, prompt caching and turn count all
  move the numbers.
- Prompt caching dominates: 87 to 92 percent of input tokens in each run are cache reads, so "tokens" here are not
  billable-input equivalents; the reported cost is the better comparison of spend.
- Wall-clock time is about 205 to 225 s in every run while `duration_api_ms` is 15 to 23 s. The cause of the roughly
  190 s outside API time was not investigated (not measured); it is similar in all four runs, so it does not
  differentiate them.
- The graph was not told to prefer graph tools; the prompt only said they were available. The task run chose not to use
  them. A prompt that required them would be a different experiment and was not run.
- Peak context window, tokens per tool result and files surfaced by Grep or graph results are not reported by the
  tool output: "not measured".
- Graph quality limits found in `docs/GRAPH-TOOLS.md` (the `tests_for` name collision, the `app.ts` hub over-approximation)
  affect any graph-assisted review.
- The baseline run in the first launch attempt failed with an empty prompt, and a second attempt overlapped with leftover
  processes; both were discarded and all four reported runs come from one clean sequential chain.
