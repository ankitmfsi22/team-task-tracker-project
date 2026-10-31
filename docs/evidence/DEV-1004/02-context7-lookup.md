# Context7 lookup (task 2.2)

Date: 2026-10-31. Real Context7 MCP calls from this project session; output is quoted, not invented.

## Calls

1. `mcp__context7__resolve-library-id` with `libraryName: "Express"`, `query: "Express 5 route path syntax wildcard splat and async error handling"`.
   Chosen: `/expressjs/express` (High reputation, versions listed: v5.1.0, v5.2.0, v5.3.0, 4_21_2, v4.22.1). Other hits: `/websites/expressjs` (2934 snippets), `/websites/expressjs_es`.
2. `mcp__context7__query-docs` with `libraryId: "/expressjs/express/v5.2.0"`, `query: "Express 5 migration: named wildcard route syntax and rejected promises in async handlers"`.

## Result (Express v5.2.0)

- Async errors: "Express 5+ automatically catches rejected promises from async route handlers, eliminating the need for manual try-catch blocks", passing them to error middleware. Example: `app.get('/async-error', async (req, res) => { throw new Error('Async error occurred') })` reaches the 4-argument error handler.
- Wildcards: "Wildcard parameters using the asterisk syntax (e.g., `/files/*file`) capture remaining path segments as an array"; `req.params.file.join('/')` gives the path.
- Error handler: must be defined last and take four parameters `(err, req, res, next)`.

## Relevance to this project

Matches AGENTS.md (Express 5): async handlers need no `.catch(next)`, and wildcard routes must be named (`/*file`, not `/*`). This agrees with the official migration guide previously fetched (https://expressjs.com/en/guide/migrating-5.html).

## Caveat

The same Context7 result shows `app.get('/items/:id(\\d+)?', ...)` as an "optional parameters" example. The official Express 5 migration guide says `?` and regex in paths are no longer supported (use `{...}` braces). Do not copy that snippet; prefer the official guide when the two disagree.
