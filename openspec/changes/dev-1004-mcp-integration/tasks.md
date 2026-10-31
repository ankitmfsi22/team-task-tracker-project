# Tasks

Ticket: DEV-1004 (Linear DEV-8). One commit per task: `type(scope): description (DEV-1004)`. Per task: test-writer first, then implement, then lint, typecheck, test.

## 1. Configuration and permissions

- [ ] 1.1 test-writer writes `scripts/tests/mcp-config.test.mjs` from the spec scenarios; save the failing output to `docs/evidence/DEV-1004/`.
- [ ] 1.2 Add `context7` to `.mcp.json` (env-reference header only) and the allow/ask entries to `.claude/settings.json` (spec: Context7 is configured without secrets; Read-only MCP tools are allowed; External ticket changes require approval).

## 2. Documentation and evidence

- [ ] 2.1 Add `docs/mcp/README.md` (setup, supported operations read/write and tested/not, permissions, failure handling) and mark tested tools in `docs/mcp/linear-tools.md` (spec: MCP failures are handled safely).
- [ ] 2.2 Run one real Context7 lookup (Express 5 or Prisma docs) and save it to `docs/evidence/DEV-1004/`; if the server will not connect, record the failure and use official docs.
- [ ] 2.3 Save failure-handling evidence to `docs/evidence/DEV-1004/`: missing ticket (DEV-9999); unsupported operation (delete a Linear issue); server unavailable via a temporary local-scope entry with an unreachable URL (removed afterwards, never committed); auth failure from the `plugin:engineering:linear` needs-authentication state; malformed response "not tested" with the handling rule.
- [ ] 2.4 Add the Rule 5 line to `CLAUDE.md`: "Check library APIs with Context7 MCP before using them; if it fails, note it and use official docs (Rule 5)."

## 3. Verification

- [ ] 3.1 Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `openspec validate dev-1004-mcp-integration --strict`.
