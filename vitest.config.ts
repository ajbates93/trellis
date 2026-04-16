import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./server/__tests__/setup.ts'],
    exclude: ['node_modules/**', '.claude/worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/api/**/*.ts',
        'server/utils/**/*.ts',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        '.output/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/*.test.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url)),
      '#server': fileURLToPath(new URL('./server', import.meta.url)),
    },
  },
})
