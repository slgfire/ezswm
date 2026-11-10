import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const TEMPLATE_ENV_KEY = 'EZSWM_TEST_PRISMA_TEMPLATE_DB_FILE'

/**
 * Creates the migrated SQLite template shared by test workers and removes it after the run.
 * @returns {() => void} Cleanup callback for the temporary database directory.
 */
export default function globalSetup() {
  const templateDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-template-db-'))
  const templateDbFile = join(templateDir, 'template.sqlite')
  // Prisma's SQLite migration engine requires an existing file on macOS.
  writeFileSync(templateDbFile, '')

  execSync('pnpm prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: `file:${templateDbFile}` },
    stdio: 'pipe',
    cwd: process.cwd(),
  })

  process.env[TEMPLATE_ENV_KEY] = templateDbFile

  return () => {
    delete process.env[TEMPLATE_ENV_KEY]
    rmSync(templateDir, { recursive: true, force: true })
  }
}
