import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: '../../docs/evidence/DEV-1016/coverage/shared',
      thresholds: { lines: 80 },
    },
  },
});
