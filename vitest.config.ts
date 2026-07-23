import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    fileParallelism: false,
    setupFiles: ['./tests/vitest.setup.ts'],
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
})
