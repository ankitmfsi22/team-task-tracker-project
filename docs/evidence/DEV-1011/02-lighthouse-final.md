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

## After review finding 1 (gate stability)

The reviewer saw `/projects` performance 88 on repeated runs, and later runs of mine scored 78 to 94 and, once, 0 in every category. Cause found: `vite preview` was pinned to port 4173, so two worktrees running the gate at the same time shared or killed each other's preview server, and scores also move with machine load (TBT between 280 and 930 ms for the same build). Fixes (deviation D-098): a free preview port per run, 5 audits per page with the median gated per category (threshold still 95), and a diagnostic line (FCP, LCP, TBT, runtime error) for a low page.

Runs after the fix, DEV-1012 tests still running in the other worktree:

```
run 1  /login performance 100   /projects performance 99
run 2  /login performance 100   /projects performance 99
run 3  /login performance 100   /projects performance 99
```

Accessibility, best practices and SEO were 100 on both pages in every run.
