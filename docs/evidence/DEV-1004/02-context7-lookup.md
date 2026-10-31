# Context7 lookup (task 2.2)

Date: 2026-10-31. Real observations; nothing below is fabricated.

## Result: Context7 lookup NOT performed (server pending approval)

`claude mcp list` / `claude mcp get context7` after task 1.2:

```
context7: https://mcp.context7.com/mcp (HTTP) - ⏸ Pending approval (run `claude` to approve)
 └ [Warning] [context7] mcpServers.context7: Missing environment variables: CONTEXT7_API_KEY
```

- A project-scoped server in `.mcp.json` must be approved by the human in an interactive `claude` session. The agent session was non-interactive and its tool list contained no `mcp__context7__*` tools (ToolSearch for "context7" returned none).
- `CONTEXT7_API_KEY` was not set, so Claude Code warned about the missing variable. The key is optional for Context7, but the `${CONTEXT7_API_KEY}` reference needs the variable to exist (it may be empty). Documented in `docs/mcp/README.md`.

No Context7 result is shown. Per Rule 5 the limitation is documented and authoritative documentation was consulted instead.

## Fallback: official documentation lookup (not Context7)

Source: https://expressjs.com/en/guide/migrating-5.html (fetched live 2026-10-31 via the web-fetch sub-agent; HTTP 200).

- Wildcards must be named: "use `/*splat` instead of `/*`"; `/{*splat}` also matches `/`. Optional params with `?` are "no longer supported, use braces instead" (`/:file.:ext?` becomes `/:file{.:ext}`).
- Rejected promises from handlers and middleware are forwarded "as an `Error` to the error handling middleware", as if `next(err)` were called, so manual `.catch(next)` is not needed.
- `req.query` is "no longer a writable property and is instead a getter"; the default query parser changed from `extended` to `simple`.

## To produce the real Context7 lookup

The human approves the `context7` server once in an interactive `claude` session (and optionally sets `CONTEXT7_API_KEY`), then runs a lookup such as Express 5 route syntax and saves the output here. Until then this stays "not performed".
