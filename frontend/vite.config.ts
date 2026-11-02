import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:3000';

// Page and API share one origin: the refresh cookie path (/api/v1/auth) matches and CORS is not needed.
const apiProxy = { '/api': { target: backendUrl, changeOrigin: true } };

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src') },
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.d.ts', 'src/test/**'],
      reporter: ['text-summary', 'json-summary', 'html'],
      reportsDirectory: '../docs/evidence/DEV-1016/coverage/frontend',
      thresholds: { lines: 80 },
    },
  },
});
