import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./src/test/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**', 'src/generated/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: '../docs/evidence/DEV-1016/coverage/backend',
      thresholds: { lines: 80 },
    },
  },
});
