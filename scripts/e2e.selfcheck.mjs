// Run: node scripts/e2e.selfcheck.mjs  (no build, no servers, no ports)
import assert from 'node:assert/strict'
import { parsePorts, runtimeOverrides, run, cleanup } from './e2e.mjs'

assert.deepEqual(parsePorts({}), { main: 3105, setup: 3106 })
for (const env of [{ E2E_MAIN_PORT: '3000' }, { E2E_SETUP_PORT: '3101' }, { E2E_MAIN_PORT: '3114' }, { E2E_MAIN_PORT: '50675' },
  { E2E_MAIN_PORT: '4000', E2E_SETUP_PORT: '4000' }, { E2E_MAIN_PORT: 'abc' }, { E2E_MAIN_PORT: '80' }]) {
  assert.throws(() => parsePorts(env), /E2E_/, JSON.stringify(env))
}

// the built server only reads NUXT_* runtime overrides, derived from the same generated secrets/origin
const ov = runtimeOverrides({ JWT_SECRET: 'j', OIDC_ENCRYPTION_KEY: 'k' }, 'http://127.0.0.1:1')
assert.deepEqual(ov, { NUXT_JWT_SECRET: 'j', NUXT_OIDC_ENCRYPTION_KEY: 'k', NUXT_PUBLIC_BASE_URL: 'http://127.0.0.1:1' })

// spawn failure resolves (no unhandled 'error')
assert.equal(await run('/nonexistent/bin', [], { env: {} }).done, 127)

// cleanup kills the whole owned process group, including descendants
const r = run(process.execPath, ['-e', "const c=require('child_process').spawn('sleep',['60'],{stdio:'ignore'});console.log(c.pid);setInterval(()=>{},1000)"], { env: {}, log: '/dev/null' })
const gpid = await new Promise((ok) => r.child.stdout.once('data', (d) => ok(Number(String(d).trim()))))
assert.ok(gpid > 0)
assert.equal(await cleanup(), true)
await r.done
assert.throws(() => process.kill(gpid, 0), /ESRCH/, 'grandchild must be gone')
assert.throws(() => run(process.execPath, ['-v'], { env: {} }), /shutting down/)
console.log('e2e selfcheck ok')
