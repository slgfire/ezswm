import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const TEMPLATE_ENV_KEY = 'EZSWM_TEST_PRISMA_TEMPLATE_DB_FILE'

export default function globalSetup() {
  const templateDir = mkdtempSync(join(tmpdir(), 'ezswm-vitest-template-db-'))
  const templateDbFile = join(templateDir, 'template.sqlite')

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
