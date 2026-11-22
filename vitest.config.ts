import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    exclude: ['**/tests/e2e/**', '**/node_modules/**', '**/dist/**'],
    poolOptions: {
      forks: {
        maxForks: 2,
      },
    },
    alias: {
      '@': path.resolve(__dirname, './'),
      'server-only': path.resolve(__dirname, './tests/server-only-mock.ts'),
    },
  },
});
