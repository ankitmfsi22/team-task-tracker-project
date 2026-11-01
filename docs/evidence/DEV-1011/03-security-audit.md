# DEV-1011 evidence: security-auditor output

Run on 2026-11-02 by the security-auditor sub-agent (read-only, fresh context) on branch `feature/web/DEV-1011-auth-project-pages`. Saved verbatim by the main session.

---

Security audit of the frontend work on feature/web/DEV-1011-auth-project-pages (`git diff main...HEAD`, read-only). I found no BLOCKING issues and 4 NON-BLOCKING ones.

**Checks that passed**

1. **Access token in memory only.**
   - `frontend/src/lib/auth/token.ts:2` keeps the token in a module variable.
   - A grep of non-test source finds `localStorage` only in `auth-context.tsx:30,38,39`, for the `ttt.session` flag.
   - The flag is the constant `'1'`, so it holds no secret.
   - There is no `sessionStorage`, `document.cookie`, `console.*` or `window.open` in non-test frontend source.
   - The token is sent only as an `Authorization` header (`client.ts:52`), never in a URL.
   - `skipAuth` is set on the refresh call.
2. **Refresh-once-on-401 logic (`client.ts`).**
   - **No loop:** the retry at line 116 goes through `send()` directly, not `apiFetch`, and a second 401 is surfaced as an error.
   - **Shared promise:** `inflightRefresh ??=` is cleared in `finally` (lines 85-97), so concurrent callers share one refresh and the rotating refresh token is safe.
   - **Auth paths not retried:** `/api/v1/auth/*` is excluded at line 102, so login, register, logout and refresh never retry.
   - **Cleanup on failure:** the token is cleared and the session-expired handler runs (lines 109-112). The handler clears the hint, user and query cache (`auth-context.tsx:62-65`).
   - **Failed `signIn`:** it clears the token (lines 95-98).
   - **Logout:** it always clears local state, even if the request fails (lines 101-109).
3. **Cookie handling.**
   - **Same-origin requests:** `credentials: 'same-origin'` and relative `/api/v1` URLs are used (`client.ts:53-56`).
   - **Vite proxy:** `frontend/vite.config.ts:10,17-18` proxies `/api` for both dev and preview. The `BACKEND_URL` default is `http://localhost:3000`, and `changeOrigin` does not change cookie handling for the same-origin page.
   - **Lighthouse stub API:** `scripts/lighthouse.mjs:60-74` binds to `127.0.0.1` on an ephemeral port and accepts only GETs plus the refresh POST. It returns the fixed fake token `lighthouse-fixture-token`, which is not a real secret. The preview server also binds to 127.0.0.1 (line 107).
4. **Open redirect.**
   - `protected-route.tsx:26-34` takes the redirect target from router state, which is not attacker-controllable via the URL.
   - It accepts only `from.pathname` as a string starting with `/`, then navigates in-app with `<Navigate to>`.
   - `//evil.com` would pass the `startsWith('/')` check (see N1), but React Router treats it as a path (see N1 for the caveat), so this is not exploitable.
5. **XSS and information leaks.**
   - There is no `dangerouslySetInnerHTML` or `innerHTML` in non-test source, and no `href=` built from user data.
   - Error UI uses fixed strings (`states.tsx:34-39`).
   - `ApiError.message` is only used in form-field issue mapping (`form-field.tsx:14`), with the other `ApiError` uses in `members-section.tsx` and `project-detail.tsx` limited to status checks.
   - The mutation error text I checked in `project-detail.tsx` and `members-section.tsx` is likewise status-based and fixed. I did not read every branch.
6. **Dependencies.**
   - Every frontend and root dependency added in this diff is pinned to an exact version and matches the `docs/VERSIONS.md` rows.
   - `pnpm audit` ran and found 2 moderate advisories, both transitive from `lighthouse`: `lighthouse > @sentry/node > @sentry/bundler-plugins > glob > minimatch` (GHSA-g3hv-75wg-m249, fixed in minimatch >=11.0.1) and `glob` (GHSA-3g3m-2fjr-6pw4, fixed in >=14.0.2).
   - The minimatch advisory also affects the existing `eslint` dependency path (`eslint > minimatch`). It is not in the shipped frontend bundle.
   - No high or critical advisories.

**NON-BLOCKING findings**

- **N1 (Low), `frontend/src/routes/protected-route.tsx:31`.** The `startsWith('/')` check also accepts protocol-relative `//host` values. It is not exploitable here because the value comes from router state set by `ProtectedRoute`, and the router treats it as an in-app path. I did not run the router to confirm how `//host` is handled. Recommended fix: also reject `//` and backslash prefixes, for example `/^\/(?![/\\])/`.
- **N2 (Low), `package.json` (devDependency `lighthouse@13.6.0`, transitive `glob` and `minimatch`).**
  - These are two moderate DoS and traversal advisories in dev-only tooling that never ships to production.
  - Recommended fix: add `pnpm.overrides` for `minimatch>=11.0.1` and `glob>=14.0.2` if compatible, or record the advisories in `docs/deviations.md` until `lighthouse` is bumped. Overrides would need a VERSIONS.md note.
- **N3 (Info), `frontend/src/lib/auth/auth-context.tsx:25-43`.** `ttt.session` is readable by any script on the page, but it exposes only the fact that a session likely exists. Accepted by design. Keep it a boolean and never put identity in it.
- **N4 (Info), `frontend/src/lib/api/client.ts:113`.** On refresh failure the original 401 `ApiError` carries the server's `message` and `details`. The UI does not render them, so there is no leak today. Keep rendering fixed strings if more screens are added.

**Verdict: PASS, no blocking findings.** Address N1 cheaply, and either handle or record N2 in `docs/deviations.md`. I did not read or touch any `.env` file or `../ttt-1012`.
