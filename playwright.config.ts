import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

// Fail closed: the isolated servers, ports and artifact dirs are owned by scripts/e2e.mjs.
const { E2E_RUN_DIR, E2E_BASE_URL, E2E_SETUP_URL, E2E_AUTH_FILE, E2E_ARTIFACT_DIR } = process.env
if (!E2E_RUN_DIR || !E2E_BASE_URL || !E2E_SETUP_URL || !E2E_AUTH_FILE || !E2E_ARTIFACT_DIR) {
  throw new Error('E2E context missing. Run the E2E suite with `pnpm test:e2e` (it owns build, databases and servers).')
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  workers: 1,
  fullyParallel: false,
  outputDir: join(E2E_ARTIFACT_DIR, 'test-results'),
  reporter: [['list'], ['json', { outputFile: join(E2E_ARTIFACT_DIR, 'report.json') }], ['html', { outputFolder: join(E2E_ARTIFACT_DIR, 'report'), open: 'never' }]],
  use: {
    baseURL: E2E_BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry'
  },
  projects: [
    {
      // Read-only GET checks against the second, never-initialized server.
      name: 'setup-wizard',
      testMatch: /logo\.spec\.ts/,
      grep: /\[setup\]/,
      use: { baseURL: E2E_SETUP_URL }
    },
    {
      name: 'auth',
      testMatch: /auth\.setup\.ts/
    },
    {
      name: 'chromium',
      grepInvert: /\[setup\]/,
      use: { storageState: E2E_AUTH_FILE },
      dependencies: ['auth']
    }
  ]
})
