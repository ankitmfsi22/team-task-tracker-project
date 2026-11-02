# DEV-1016 Lighthouse evidence (Linear DEV-20 AC5)

- Date: 2026-11-02
- Commit: 413c927 (branch `fix/infra/DEV-1016-linear-workspace`, run on a clean working tree)
- Command: `pnpm lighthouse` (run alone; Lighthouse 13.6.0)
- Target: production build (`vite build` + `vite preview`) against a stub API (no database)
- Method: each page is audited 5 times and the median score is gated; threshold 95 (unchanged); exit code 0

| Page                                                                  | Performance | Accessibility | Best Practices | SEO |
| --------------------------------------------------------------------- | ----------- | ------------- | -------------- | --- |
| `/login`                                                              | 100         | 100           | 100            | 100 |
| `/projects` (project list)                                            | 100         | 100           | 100            | 100 |
| `/projects/:id/tasks` (task list)                                     | 100         | 100           | 100            | 100 |
| `/projects/:id/tasks/:taskId` (task detail, also audited by the gate) | 100         | 100           | 100            | 100 |

Limitations: scores are from the stub API on a local machine, so they exclude real backend latency; they vary with machine load.
