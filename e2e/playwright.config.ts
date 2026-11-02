import { defineConfig, devices } from '@playwright/test';

// Started by scripts/e2e.mjs, which provides DATABASE_URL and the JWT secrets.
const BACKEND_PORT = 3100;
const WEB_PORT = 4173;

export default defineConfig({
  testDir: '.',
  workers: 1,
  fullyParallel: false,
  retries: 0,
  // Playwright reads and diffs git state when it detects CI; the suite must not touch the repository.
  captureGitInfo: { commit: false, diff: false },
  reporter: [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]],
  outputDir: '../test-results',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'Backend',
      command: 'pnpm --filter @team-task-tracker/backend run start',
      url: `http://localhost:${BACKEND_PORT}/api/v1/projects`,
      env: { PORT: String(BACKEND_PORT) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      name: 'Frontend',
      command: `pnpm --filter @team-task-tracker/frontend exec vite preview --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { BACKEND_URL: `http://localhost:${BACKEND_PORT}` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
