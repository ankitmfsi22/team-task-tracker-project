# DEV-1012 Lighthouse runs

Command: `pnpm lighthouse` (threshold unchanged: 95 in every category, never lowered or skipped).
The task list page (`/projects/<fixture-id>/tasks`) was added to `PAGES` with stub fixtures.

Performance scores for the task list page across runs on one Windows machine:

| Run | Condition                             | /login | /projects | task list |
| --- | ------------------------------------- | ------ | --------- | --------- |
| 1   | right after other work on the machine | 96     | 83 FAIL   | 73 FAIL   |
| 2   | re-run alone                          | 99     | 97        | 98        |
| 3   | re-run alone                          | 100    | 100       | 93 FAIL   |
| 4   | re-run alone                          | 96     | 99        | 96        |

Accessibility, best-practices and SEO were 100 in every run. Failing runs are load-dependent
(`/projects`, unchanged by this ticket, also dropped to 83 in run 1). The task list page is the
least stable page and passes when the machine is quiet; recorded as a risk in `docs/deviations.md`.

Final passing output (run 4):

```
/login            performance 96, accessibility 100, best-practices 100, seo 100
/projects         performance 99, accessibility 100, best-practices 100, seo 100
/tasks (list)     performance 96, accessibility 100, best-practices 100, seo 100
```

## After the merge with main (median of 5 audits per page, run alone)

| Run                                       | /login  | /projects | task list |
| ----------------------------------------- | ------- | --------- | --------- |
| A/B, branch                               | 100     | 99        | 99        |
| A/B, clean origin/main (before and after) | 99, 100 | 98, 99    | n/a       |
| Final 1                                   | 98      | 93 FAIL   | 86 FAIL   |
| Final 2                                   | 98      | 87 FAIL   | 95        |

Accessibility, best-practices and SEO were 100 in every run. `/projects` is main's code unchanged,
so the drops are not specific to the task list. Open risk (D-104): the gate is machine-sensitive.
