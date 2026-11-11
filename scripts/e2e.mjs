#!/usr/bin/env node
// Central E2E runner: builds the current source once, creates two fresh disposable SQLite DBs,
// starts two loopback servers (main + empty "setup" server) and runs Playwright against them.
// Only processes started here are ever signalled. Never touches port 3000 or production/test ports.
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { chmodSync, closeSync, createWriteStream, mkdirSync, openSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(fileURLToPath(import.meta.url), '..', '..')
const BIN = join(REPO, 'node_modules', '.bin')
const FORBIDDEN_PORTS = new Set([3000, 3101, 3114, 50675, 50676])
const LOCK = '/tmp/opencode/ezswm-e2e.lock' // .output is shared, so one runner at a time
const ROOT = resolve(process.env.E2E_RUN_ROOT || '/tmp/opencode')

const fail = (msg) => { throw new Error(msg) }
const port = (env, name, def) => {
  const p = Number(env[name] ?? def)
  if (!Number.isInteger(p) || p < 1024 || p > 65535) fail(`${name} must be a port 1024-65535`)
  if (FORBIDDEN_PORTS.has(p)) fail(`${name}=${p} is a reserved port`)
  return p
}
export const parsePorts = (env) => {
  const main = port(env, 'E2E_MAIN_PORT', 3105)
  const setup = port(env, 'E2E_SETUP_PORT', 3106)
  if (main === setup) fail('E2E_MAIN_PORT and E2E_SETUP_PORT must differ')
  return { main, setup }
}

const freePort = (p) => new Promise((ok, no) => {
  const s = net.createServer()
  s.once('error', () => no(new Error(`port ${p} on 127.0.0.1 is occupied; refusing to reuse or kill it`)))
  s.listen(p, '127.0.0.1', () => s.close(() => ok()))
})

const pass = ['PATH', 'HOME', 'LANG', 'CI', 'TERM', 'npm_package_version', 'PLAYWRIGHT_BROWSERS_PATH', 'XDG_CACHE_HOME']
const baseEnv = () => Object.fromEntries(pass.filter((k) => process.env[k] !== undefined).map((k) => [k, process.env[k]]))

// Each child leads its own process group (Linux), so cleanup can signal -pid and reach
// Nuxt/build workers. Only groups started here are ever signalled.
const children = new Set()
let shuttingDown = false
export const run = (cmd, args, { env, log, cwd = REPO }) => {
  if (shuttingDown) fail('shutting down; not launching')
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: ['ignore', log ? 'pipe' : 'inherit', log ? 'pipe' : 'inherit'], shell: false })
  children.add(child)
  const out = log ? createWriteStream(log, { mode: 0o600 }) : null
  if (out) { child.stdout.pipe(out, { end: false }); child.stderr.pipe(out, { end: false }); out.on('error', () => {}) }
  const done = new Promise((ok) => {
    let settled = false
    const finish = (code) => {
      if (settled) return
      settled = true
      if (!out) return ok(code)
      out.end(() => ok(code))
    }
    child.once('error', (e) => { out?.write(`spawn error: ${e.message}\n`); finish(127) }) // e.g. missing binary
    child.once('close', (code, sig) => finish(code ?? 128 + (sig ? 1 : 0)))
  })
  return { child, done }
}
const kill = (pid, sig) => { try { process.kill(-pid, sig) } catch { /* group already gone */ } }
// SIGTERM the whole group, wait (bounded) for the leader, then SIGKILL whatever is left in the group.
export const stop = async (child) => {
  if (!child.pid) return
  const exited = child.exitCode !== null || child.signalCode
  const gone = exited ? Promise.resolve() : new Promise((ok) => child.once('close', ok))
  kill(child.pid, 'SIGTERM')
  const t = setTimeout(() => kill(child.pid, 'SIGKILL'), 5000)
  await gone
  clearTimeout(t)
  kill(child.pid, 'SIGKILL')
}

const tail = (f) => { try { return readFileSync(f, 'utf8').split('\n').slice(-30).join('\n') } catch { return '' } }

async function waitHealthy(url, dataDir, child, logFile) {
  const deadline = Date.now() + 60000
  while (Date.now() < deadline) {
    if (shuttingDown) fail('shutting down')
    if (child.exitCode !== null || child.signalCode) fail(`server exited early:\n${tail(logFile)}`)
    try {
      const r = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(2000) })
      if (r.status === 200) {
        const j = await r.json()
        if (j.database_ok === true && j.data_dir === dataDir) return
      }
    } catch { /* not up yet */ }
    await new Promise((ok) => setTimeout(ok, 500))
  }
  fail(`${url} not healthy in 60s:\n${tail(logFile)}`)
}

const state = {}
let lockHeld = false
const acquire = () => {
  mkdirSync('/tmp/opencode', { recursive: true })
  for (let attempt = 0; attempt < 2; attempt++) {
    try { const fd = openSync(LOCK, 'wx'); writeFileSync(fd, String(process.pid)); closeSync(fd); lockHeld = true; return } catch (e) {
      if (e.code !== 'EEXIST') throw e
      const pid = Number(readFileSync(LOCK, 'utf8'))
      let alive = true
      try { process.kill(pid, 0) } catch (err) { alive = err.code === 'EPERM' }
      if (alive) fail(`another E2E run (pid ${pid}) owns ${LOCK}`)
      unlinkSync(LOCK) // stale: owner is gone
    }
  }
  fail(`could not acquire ${LOCK}`)
}

async function main() {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const { main: MAIN_PORT, setup: SETUP_PORT } = parsePorts(process.env) // fail fast, before any lock/build/server
  mkdirSync(ROOT, { recursive: true })
  acquire()
  const runDir = state.runDir = join(ROOT, `ezswm-e2e-${stamp}-${randomBytes(4).toString('hex')}`)
  const logs = join(runDir, 'logs'), art = join(runDir, 'artifacts'), authDir = join(runDir, 'auth')
  const authFile = join(authDir, 'user.json')
  const shots = join(art, 'shots')
  const dirs = {
    main: join(runDir, 'data-main'), setup: join(runDir, 'data-setup'),
    oidc: join(shots, 'oidc'), neutral: join(shots, 'neutral'), review: join(shots, 'review'),
    logo: join(shots, 'logo'), login: join(shots, 'login')
  }
  for (const d of [runDir, logs, art, authDir, ...Object.values(dirs)]) mkdirSync(d, { recursive: true, mode: 0o700 })
  for (const d of [runDir, logs, art, authDir, ...Object.values(dirs)]) chmodSync(d, 0o700)
  console.log(`[e2e] run dir: ${runDir}`)

  await Promise.all([freePort(MAIN_PORT), freePort(SETUP_PORT)])

  const secrets = { JWT_SECRET: randomBytes(32).toString('hex'), OIDC_ENCRYPTION_KEY: randomBytes(32).toString('base64') }
  const origin = { main: `http://127.0.0.1:${MAIN_PORT}`, setup: `http://127.0.0.1:${SETUP_PORT}` }
  writeFileSync(join(runDir, 'owned-run.json'), JSON.stringify({ baseUrl: origin.main, setupUrl: origin.setup }), { mode: 0o600 })
  const serverEnv = (name, p) => ({
    ...baseEnv(), ...secrets, NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(p),
    DATABASE_URL: `file:${join(dirs[name], 'db.sqlite')}`, DATA_DIR: dirs[name], NUXT_DATA_DIR: dirs[name],
    PUBLIC_BASE_URL: origin[name]
  })

  const step = async (label, cmd, args, env, logName) => {
    console.log(`[e2e] ${label}`)
    const log = join(logs, logName)
    const code = await run(cmd, args, { env, log }).done
    if (code !== 0) fail(`${label} failed (${code}); see ${log}\n${tail(log)}`)
  }
  await step('build (once)', join(BIN, 'nuxt'), ['build'], baseEnv(), 'build.log')
  for (const name of ['main', 'setup']) {
    await step(`migrate ${name} DB`, join(BIN, 'prisma'), ['migrate', 'deploy'], serverEnv(name, 0), `migrate-${name}.log`)
  }

  for (const [name, p] of [['main', MAIN_PORT], ['setup', SETUP_PORT]]) {
    const log = join(logs, `server-${name}.log`)
    const s = run('node', [join(REPO, '.output/server/index.mjs')], { env: serverEnv(name, p), log })
    await waitHealthy(origin[name], dirs[name], s.child, log)
    console.log(`[e2e] ${name} server ready at ${origin[name]}`)
  }

  const pwEnv = {
    ...baseEnv(), E2E_RUN_DIR: runDir, E2E_BASE_URL: origin.main, E2E_SETUP_URL: origin.setup,
    E2E_AUTH_FILE: authFile, E2E_ARTIFACT_DIR: art, OIDC_E2E_REAL_BRANDING: '1', // real app, not a real IdP
    OIDC_E2E_SHOTS_DIR: dirs.oidc, AUTH_NEUTRAL_SHOTS_DIR: dirs.neutral, OIDC_REVIEW_SHOTS_DIR: dirs.review,
    LOGO_SHOTS_DIR: dirs.logo, LOGIN_THEME_SHOTS_DIR: dirs.login
  }
  return run(join(BIN, 'playwright'), ['test', ...process.argv.slice(2)], { env: pwEnv }).done.then((code) => ({ code }))
}

let cleanupP
// Idempotent: the signal path and the normal path share one cleanup.
export const cleanup = () => cleanupP ??= (async () => {
  shuttingDown = true
  let ok = true
  await Promise.all([...children].map((c) => stop(c).catch(() => { ok = false })))
  try { if (state.runDir) rmSync(join(state.runDir, 'auth'), { recursive: true, force: true }) } catch { ok = false }
  try { if (lockHeld && readFileSync(LOCK, 'utf8') === String(process.pid)) unlinkSync(LOCK) } catch { ok = false }
  if (state.runDir) console.log(`[e2e] logs/artifacts kept in ${state.runDir} (may hold synthetic tokens; dir is 0700, do not share)`)
  return ok
})()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [sig, n] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    process.on(sig, async () => {
      await cleanup()
      process.exit(n)
    })
  }
  let result = { code: 1 }
  try { result = await main() } catch (e) { console.error(`[e2e] ${e.message}`) }
  const cleaned = await cleanup()
  process.exit(result.code === 0 && !cleaned ? 1 : result.code)
}
