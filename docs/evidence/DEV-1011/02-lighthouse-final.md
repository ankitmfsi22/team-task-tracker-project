# DEV-1011 evidence: final Lighthouse run (task 3.1)

Command: `pnpm lighthouse` (production build, `vite preview`, stub API, Lighthouse 13.6.0, default mobile settings, threshold 95 per category), run on 2026-11-02 on Windows 11 with Google Chrome, on the final pages (login with form, project list with data).

Run alone, no other worktree activity (first run, then the final run):

```
/login                         /login
  performance      99 ok         performance      99 ok
  accessibility   100 ok         accessibility   100 ok
  best-practices  100 ok         best-practices  100 ok
  seo             100 ok         seo             100 ok
/projects                      /projects
  performance      99 ok         performance      98 ok
  accessibility   100 ok         accessibility   100 ok
  best-practices  100 ok         best-practices  100 ok
  seo             100 ok         seo             100 ok
```

Flaky run under load (DEV-1012 tests and builds ran in the other worktree at the same time, before the detail page existed):

```
Below 95: /login performance = 89
Below 95: /projects performance = 88
```

The threshold was not changed. The same command passed when re-run alone (above); the `pnpm test` case "pnpm lighthouse runs and exits 0" failed once inside a full `pnpm test` under the same load and passed when run alone. Recorded as deviation D-089 (Follow-up: DEV-1016).
