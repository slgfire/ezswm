import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Trusted-origin check for specs that touch real data. The central runner owns the servers and exports
 * E2E_RUN_DIR, E2E_BASE_URL, E2E_SETUP_URL, E2E_ARTIFACT_DIR and writes `owned-run.json` ({ baseUrl, setupUrl })
 * into E2E_RUN_DIR. An origin is trusted only if it equals the env value AND the marker; anything else fails closed.
 */
export const OWNED_MARKER = 'owned-run.json'
type Env = Record<string, string | undefined>
export type OwnedRun = { runDir: string, baseUrl: string, setupUrl: string, artifactDir: string }

const norm = (u: string | undefined) => (u ?? '').replace(/\/+$/, '')

export function resolveOwnedRun(env: Env = process.env, read: (p: string) => string | null = p => (existsSync(p) ? readFileSync(p, 'utf8') : null)): OwnedRun {
  const { E2E_RUN_DIR: runDir, E2E_BASE_URL: base, E2E_SETUP_URL: setup, E2E_ARTIFACT_DIR: artifactDir } = env
  if (!runDir || !base || !setup || !artifactDir) throw new Error('Not an owned E2E run: E2E_RUN_DIR/E2E_BASE_URL/E2E_SETUP_URL/E2E_ARTIFACT_DIR missing (use pnpm test:e2e)')
  const raw = read(join(runDir, OWNED_MARKER))
  if (!raw) throw new Error(`Not an owned E2E run: ${OWNED_MARKER} missing in E2E_RUN_DIR`)
  let m: { baseUrl?: string, setupUrl?: string }
  try { m = JSON.parse(raw) } catch { throw new Error(`Not an owned E2E run: ${OWNED_MARKER} is not valid JSON`) }
  if (norm(m.baseUrl) !== norm(base) || norm(m.setupUrl) !== norm(setup)) throw new Error('Not an owned E2E run: marker origins differ from E2E_BASE_URL/E2E_SETUP_URL')
  return { runDir, baseUrl: norm(base), setupUrl: norm(setup), artifactDir }
}

/** Throws unless `actual` is exactly the owned main (kind 'base') or empty-wizard (kind 'setup') origin. */
export function assertOwnedOrigin(actual: string | undefined, kind: 'base' | 'setup', run: OwnedRun = resolveOwnedRun()): void {
  const expected = kind === 'base' ? run.baseUrl : run.setupUrl
  if (norm(actual) !== expected) throw new Error(`baseURL must be exactly the owned ${kind} origin ${expected}, got ${actual}`)
}

/** Screenshot directory: explicit env override, else a run-owned artifact subfolder (screenshots are not a trust boundary). */
export const shotsDir = (envName: string, sub: string, env: Env = process.env) =>
  env[envName] || join(env.E2E_ARTIFACT_DIR || 'test-results', sub)

/** Baseline: the shared disposable admin starts every spec file in English (workers=1, so no concurrent language edits).
 * Uses its own context from E2E_AUTH_FILE: the `request` fixture inherits the anonymous storageState of unauthenticated describes. */
export async function resetAdminLanguage(playwright: import('@playwright/test').PlaywrightWorkerArgs['playwright']): Promise<void> {
  const authFile = process.env.E2E_AUTH_FILE
  if (!authFile) throw new Error('E2E_AUTH_FILE missing (use the central runner)')
  const request = await playwright.request.newContext({ baseURL: resolveOwnedRun().baseUrl, storageState: authFile })
  try {
    const meRes = async () => {
      const r = await request.get('/api/auth/me')
      if (!r.ok()) throw new Error(`resetAdminLanguage: /api/auth/me returned ${r.status()}`)
      return (await r.json()) as { id: string, language: string }
    }
    const cur = await meRes()
    if (cur.language === 'en') return
    const res = await request.put(`/api/users/${cur.id}`, { data: { language: 'en' } })
    if (!res.ok()) throw new Error(`resetAdminLanguage failed: ${res.status()}`)
    for (let i = 0; i < 20 && (await meRes()).language !== 'en'; i++) await new Promise(r => setTimeout(r, 250))
    if ((await meRes()).language !== 'en') throw new Error('admin language did not reset to en')
  } finally { await request.dispose() }
}
