import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

const lines = readFileSync('.github/workflows/publish-mcp.yml', 'utf8').split('\n')
const start = lines.findIndex(l => l === '      - name: Check GHCR tag')
const runAt = lines.findIndex((l, i) => i > start && l === '        run: |')
let end = lines.findIndex((l, i) => i > runAt && /^ {6}- name: /.test(l))
if (end < 0) end = lines.length
const script = lines.slice(runAt + 1, end).map(l => l.slice(10)).join('\n')

const dir = mkdtempSync(join(tmpdir(), 'ghcr-check-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))
const IMG = 'ghcr.io/slgfire/ezswm-mcp'
const REF = `${IMG}:0.46.0`

// Stub docker as an exported bash function: it wins over PATH lookup, so the real docker/registry is never reached.
function run(stdout: string, code: number) {
  const gh = join(dir, 'gh_output')
  writeFileSync(gh, '')
  const r = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', script], {
    env: {
      PATH: '/usr/bin:/bin',
      'BASH_FUNC_docker%%': '() { printf "%s" "$STUB_OUT"; return $STUB_CODE; }',
      STUB_OUT: stdout,
      STUB_CODE: String(code),
      GITHUB_OUTPUT: gh,
      GHCR_IMAGE: IMG,
      VERSION: '0.46.0',
    },
    encoding: 'utf8',
  })
  if (r.error) throw r.error
  return { status: r.status, out: readFileSync(gh, 'utf8') }
}

describe('publish-mcp Check GHCR tag step', () => {
  it('extracts a non-empty script', () => expect(script).toContain('imagetools inspect'))

  it('existing tag -> exists=true', () => {
    expect(run('Name: x', 0)).toEqual({ status: 0, out: 'exists=true\n' })
  })

  it.each([
    `ERROR: ${REF}: not found`,
    `ERROR: ${REF}: not found\r\n`,
    `error: ${REF.toUpperCase()}: NOT FOUND`,
    `ERROR: ${REF}: manifest unknown`,
    `${REF}: no such manifest`,
  ])('missing format %j -> exists=false', (msg) => {
    expect(run(msg, 1)).toEqual({ status: 0, out: 'exists=false\n' })
  })

  it.each([
    ['401', `ERROR: ${REF}: 401 Unauthorized`],
    ['403', `ERROR: ${REF}: denied`],
    ['unauthorized', 'unauthorized: authentication required'],
    ['failed to authorize', `ERROR: failed to authorize: failed to fetch anonymous token`],
    ['mixed missing+auth', `ERROR: ${REF}: not found\nERROR: ${REF}: 403 Forbidden denied`],
    ['mixed auth first', `unauthorized\nERROR: ${REF}: not found`],
    ['other ref', `ERROR: ${IMG}:0.45.0: not found`],
    ['generic 404', 'unexpected status 404 Not Found'],
    ['proxy 404', '<html>404 not found</html>'],
    ['500', 'unexpected status 500 Internal Server Error'],
    ['DNS', 'dial tcp: lookup ghcr.io: no such host'],
    ['timeout', 'context deadline exceeded'],
    ['generic not found', 'not found'],
    ['dotted ref injection', `ERROR: ghcr.io/slgfire/ezswmXmcp:0.46.0: not found`],
    ['empty', ''],
  ])('%s -> fails closed', (_n, msg) => {
    const r = run(msg, 1)
    expect(r.status).toBeGreaterThan(0)
    expect(r.out).not.toContain('exists=false')
  })

  it('docker command not found -> fails closed', () => {
    const r = run('bash: docker: command not found', 127)
    expect(r.status).toBeGreaterThan(0)
    expect(r.out).not.toContain('exists=false')
  })
})
