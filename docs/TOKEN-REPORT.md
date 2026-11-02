# Token report: baseline versus graph-assisted (DEV-1015)

Measured on 2026-11-02 with five real `claude -p` runs (the original four, then one extra run added before Gate 2) (Claude Code 2.1.316, default model), at commit `8f1f539`. The
graph was built at `71307ad`; the commits in between change only docs. Raw per-run results (the `result` event of each
`stream-json` run) are in `docs/evidence/DEV-1015/runs/*.result.json`; prompts, the launcher, the wall-clock seconds and the tool-call lists
(`*.metrics.json`, made by `extract-metrics.py`) are in the same folder.

## Method

| Item         | Task                                                                                                             | Review                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Prompt       | Who may delete a comment (roles, archived task), with file:line, and the tests covering it                       | Impact of changing `projectAccess`: callers, files, test files to re-run |
| Baseline run | tools `Read,Grep,Glob`; `--strict-mcp-config` with an empty MCP config                                           | same                                                                     |
| Graph run    | same tools plus `mcp__code-review-graph__*`; MCP config with only `code-review-graph`                            | same                                                                     |
| Prompt delta | graph run adds one line: "Code graph tools (mcp__code-review-graph__*) are available; use them where they help." | same                                                                     |

Fifth run, "Task, graph required" (`task-graph-required`): same settings and prompt as "Task, graph", with one more line that requires
the graph first: "Start with mcp__code-review-graph__ tools to locate the files and tests (for example query_graph_tool), then confirm each
finding with Read. Use the graph tools before any Grep or Glob." (`docs/evidence/DEV-1015/runs/prompt-task-graph-required.txt`). It
was added because the "Task, graph" run called no graph tool; the original four runs are unchanged.

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

| Metric (source)                    | Task, baseline | Task, graph  | Task, graph required                       | Review, baseline | Review, graph                       |
| ---------------------------------- | -------------- | ------------ | ------------------------------------------ | ---------------- | ----------------------------------- |
| Input tokens, total (result.usage) | 234,815        | 181,167      | 449,528                                    | 137,461          | 193,757                             |
| of which cache read                | 215,307        | 161,681      | 420,258                                    | 120,383          | 169,283                             |
| of which cache creation            | 19,496         | 19,476       | 29,248                                     | 17,070           | 24,462                              |
| Output tokens (result.usage)       | 2,657          | 3,168        | 3,316                                      | 1,857            | 1,968                               |
| Cost, USD (result.total_cost_usd)  | 0.1262         | 0.1259       | 0.1924                                     | 0.0990           | 0.1346                              |
| Turns (result.num_turns)           | 11             | 11           | 16                                         | 6                | 7                                   |
| Files read (Read calls)            | 4              | 4            | 3                                          | 1                | 1                                   |
| Grep / Glob calls                  | 6 / 0          | 6 / 0        | 4 / 0                                      | 2 / 2            | 2 / 1                               |
| Graph tool calls                   | 0              | **0**        | 7 (`query_graph_tool`) plus 1 `ToolSearch` | 0                | 1 (`query_graph_tool`, `tests_for`) |
| `duration_ms`                      | 215,012        | 221,306      | 238,243                                    | 205,910          | 208,580                             |
| `duration_api_ms`                  | 19,544         | 22,955       | 25,909                                     | 14,595           | 16,830                              |
| Wall-clock (launcher)              | 216.3 s        | 224.7 s      | 241.6 s                                    | 207.6 s          | 212.0 s                             |
| Peak context window                | not measured   | not measured | not measured                               | not measured     | not measured                        |

## Findings (each file:line checked in source)

| Run                  | Reported                                                                                                                                                                                                                                          | Wrong or imprecise                                                                                                                                                 | Extra correct finding versus the other run                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Task, baseline       | 7 backend checks plus the frontend rule; 5 backend and 7 frontend delete tests; 5 coverage gaps                                                                                                                                                   | none found                                                                                                                                                         | none                                                                                                                            |
| Task, graph          | same rule and tests, plus 2 more test locations                                                                                                                                                                                                   | `project-access.ts:14` cited for the 404; line 14 is a comment, the 404 is at line 32 (imprecise)                                                                  | `activity.history.integration.test.ts:269` and `packages/shared/src/openapi.test.ts:281,290` (DELETE contract)                  |
| Task, graph required | same backend checks (routes 47-53, `project-access.ts` 31-34 and 39-42, service 99-108, archived task 409 after the 403); 5 backend and 7 frontend delete tests; frontend gating at `comments-panel.tsx:254-258`, `:153`, `:299`; 3 coverage gaps | none found (every cited line re-opened in source); it did not open `comment-permissions.ts`                                                                        | `comments-panel.tsx` gating lines; the explicit note that the graph's `tests_for` returned only unrelated `client.test.ts` hits |
| Review, baseline     | 18 route call sites in 4 files, 14 test files to re-run, behaviours to preserve                                                                                                                                                                   | "Nothing in `backend/src` reads `res.locals.project` or `membership`" is wrong: `comments.controller.ts:35` and `projects.controller.ts:30` read `membership.role` | none                                                                                                                            |
| Review, graph        | same 18 call sites and 14 test files; names the two controllers that read `membership`                                                                                                                                                            | none found                                                                                                                                                         | the two `membership` readers; the OpenSpec requirement at `openspec/specs/projects/spec.md:112`                                 |

Both review runs gave the same call sites (verified: 18 route sites plus 3 in the middleware test, see
`docs/GRAPH-TOOLS.md` Q1) and the same list of 14 test files, which was matched by file name and not opened.

## What the data supports

- In the task comparison the graph run **did not call any graph tool** (0 calls). Its numbers are a second baseline
  sample, not a graph measurement. The spread between the two task runs (234,815 versus 181,167 input tokens, with the
  same tool use) shows the noise of a single run.
- With the graph required ("Task, graph required"), the run made 7 graph calls and 1 `ToolSearch`, read 3 files and ran 4 Greps. It used
  449,528 input tokens against 234,815 for the baseline (214,713 more), 16 turns against 11, and USD 0.1924 against 0.1262 (USD 0.0661
  more). It read one file fewer than the baseline (3 versus 4). Its findings were correct and complete for the question, but the graph's
  `tests_for` did not return the delete tests, so they were found by Grep, as in the baseline.
- In the review comparison the graph run made one graph call (`tests_for`, after one `ToolSearch` to load the
  deferred tool schema). It used 56,296 more input tokens (193,757 versus 137,461), one more turn and USD 0.0356 more than
  the baseline. Its answer was more correct on one point (the `membership` readers), but this sample cannot say whether
  the graph or run-to-run variation caused that.
- Files read were equal in both pairs (4 and 1).
- No saving or reduction is claimed. These five runs do not show a token saving from the graph; in both runs that used a graph tool, input
  tokens and cost were higher than the matching baseline; they are consistent
  with the schema and `ToolSearch` overhead predicted in `design.md`, but with n=1 they do not prove it.

## Limitations

- One run per cell; no repetition, no confidence interval. Model nondeterminism, prompt caching and turn count all
  move the numbers.
- Prompt caching dominates: 87 to 94 percent of input tokens in each run are cache reads, so "tokens" here are not
  billable-input equivalents; the reported cost is the better comparison of spend.
- Wall-clock time is about 205 to 242 s in every run while `duration_api_ms` is 15 to 26 s. The cause of the roughly
  190 to 215 s outside API time was not investigated (not measured); it is similar in all five runs, so it does not
  differentiate them.
- In the first four runs the graph was only said to be available; the task run chose not to use it. The fifth run required it. The two
  prompts are different experiments, so "Task, graph" and "Task, graph required" are reported side by side, not averaged.
- Peak context window, tokens per tool result and files surfaced by Grep or graph results are not reported by the
  tool output: "not measured".
- Graph quality limits found in `docs/GRAPH-TOOLS.md` (the `tests_for` name collision, the `app.ts` hub over-approximation)
  affect any graph-assisted review.
- The baseline run in the first launch attempt failed with an empty prompt, and a second attempt overlapped with leftover
  processes; both were discarded and the four original runs come from one clean sequential chain and the fifth run from a separate single launch.
