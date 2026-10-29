import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.cwd()
// Dummy sentinel paths only; no real credentials are read or written.
const sensitive = ['admin-token', 'viewer-token', 'tests/e2e/.auth/user.json', 'playwright/.auth/user.json']

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'ezswm-ignore-'))
}

function seed(dir: string) {
  for (const p of [...sensitive, 'tests/e2e/token-helper.spec.ts', 'app/token.ts']) {
    mkdirSync(join(dir, p, '..'), { recursive: true })
    writeFileSync(join(dir, p), 'dummy')
  }
}

describe('credential ignore coverage', () => {
  it('git ignores token and Playwright auth paths using only the repo .gitignore', () => {
    const dir = tempDir()
    try {
      execFileSync('git', ['init', '-q'], { cwd: dir })
      cpSync(join(root, '.gitignore'), join(dir, '.gitignore'))
      seed(dir)
      const ignore = (p: string) => spawnSync('git', ['check-ignore', '-q', '--no-index', p], { cwd: dir }).status === 0
      for (const p of sensitive) expect(ignore(p), p).toBe(true)
      expect(ignore('tests/e2e/token-helper.spec.ts')).toBe(false)
      expect(ignore('app/token.ts')).toBe(false)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('does not track Playwright auth state in this repository', () => {
    const tracked = execFileSync('git', ['ls-files', 'tests/e2e/.auth', 'playwright/.auth', 'admin-token', 'viewer-token'], { cwd: root, encoding: 'utf8' })
    expect(tracked.trim()).toBe('')
  })

  it('keeps the Playwright auth setup wired to the ignored state file', () => {
    expect(readFileSync(join(root, 'tests/e2e/auth.setup.ts'), 'utf8')).toContain('./tests/e2e/.auth/user.json')
    expect(readFileSync(join(root, 'playwright.config.ts'), 'utf8')).toContain('./tests/e2e/.auth/user.json')
  })

  const dockerOk = spawnSync('docker', ['version'], { stdio: 'ignore' }).status === 0
  it.skipIf(!dockerOk)('excludes credentials from the Docker build context', () => {
    const dir = tempDir()
    const out = tempDir()
    try {
      cpSync(join(root, '.dockerignore'), join(dir, '.dockerignore'))
      seed(dir)
      writeFileSync(join(dir, 'Dockerfile'), 'FROM scratch\nCOPY . /ctx/\n')
      const r = spawnSync('docker', ['build', '--no-cache', '--network=none', '--output', `type=local,dest=${out}`, dir], { encoding: 'utf8' })
      expect(r.status, r.stderr).toBe(0)
      for (const p of sensitive) expect(existsSync(join(out, 'ctx', p)), p).toBe(false)
      expect(existsSync(join(out, 'ctx/tests/e2e/token-helper.spec.ts'))).toBe(true)
      expect(existsSync(join(out, 'ctx/app/token.ts'))).toBe(true)
    } finally {
      rmSync(dir, { recursive: true, force: true })
      rmSync(out, { recursive: true, force: true })
    }
  }, 120000)
})
