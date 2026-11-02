# DEV-1011 evidence: Lighthouse gate (task 1.4)

Command: `pnpm lighthouse` (production build, `vite preview`, stub API, Lighthouse 13.6.0, default mobile settings), run on 2026-11-01 on Windows 11 with Google Chrome.

Pages are the Group 1 placeholders for `/login` and `/projects` (the real pages arrive in Group 2). The run is repeated in task 3.1 on the final pages.

First run found real issues, fixed in this task:

| Page      | Category       | First run | Cause                                                       | Fix                                 |
| --------- | -------------- | --------- | ----------------------------------------------------------- | ----------------------------------- |
| /login    | SEO            | 91        | `/robots.txt` served the SPA HTML (invalid robots.txt)      | `frontend/public/robots.txt`        |
| /projects | SEO            | 91        | same                                                        | same                                |
| /login    | Best Practices | 96        | favicon request returned a 404 (console error)              | `<link rel="icon" href="data:," />` |
| /projects | Performance    | 93        | not reproduced on the second run (favicon 404 or run noise) | none; re-checked in task 3.1        |

Second run (after the fixes):

```
/login
  performance     100 ok
  accessibility   100 ok
  best-practices  100 ok
  seo             100 ok
/projects
  performance     100 ok
  accessibility   100 ok
  best-practices  100 ok
  seo             100 ok
```

How the `/projects` page is reached: the script sets the `ttt.session` hint in the browser profile through the DevTools protocol (on a URL that does not load the app) and runs Lighthouse with `disableStorageReset`. The stub API answers `/api/v1/auth/refresh`, `/auth/me` and `/projects`.
