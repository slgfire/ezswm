#!/usr/bin/env node
/**
 * The root package.json version is the single source of truth for releases.
 * mcp/package.json keeps a stable placeholder in git; release runs sync it
 * (tarball metadata) and every build stamps the built version.json. Neither
 * ordinary builds nor smoke runs mutate a tracked manifest.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const PLACEHOLDER_VERSION = '0.0.0'
export const MCP_PACKAGE_NAME = 'ezswm-mcp'
const ROOT_PACKAGE_NAME = 'ezswm'
const SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/

export function defaultRootDir() {
  return join(dirname(fileURLToPath(import.meta.url)), '..', '..')
}

export async function readPackages(rootDir) {
  const read = async (path) => JSON.parse(await readFile(path, 'utf8'))
  return {
    root: await read(join(rootDir, 'package.json')),
    mcp: await read(join(rootDir, 'mcp', 'package.json'))
  }
}

function assertRoot(root) {
  if (root.name !== ROOT_PACKAGE_NAME || root.private !== true) {
    throw new Error(`root package must be the private "${ROOT_PACKAGE_NAME}" package (never published)`)
  }
  if (!SEMVER.test(root.version)) throw new Error(`root version "${root.version}" is not a valid semver`)
  return root.version
}

/** Resolves the release version without reading or writing mcp/package.json. */
export async function readRootVersion(rootDir = defaultRootDir()) {
  const root = JSON.parse(await readFile(join(rootDir, 'package.json'), 'utf8'))
  return assertRoot(root)
}

/**
 * Writes the resolved version into the build output the server reads at
 * runtime. dist/ is generated, so this is not a tracked-manifest mutation.
 */
export async function stampVersion(rootDir = defaultRootDir()) {
  const rootVersion = await readRootVersion(rootDir)
  const file = join(rootDir, 'mcp', 'dist', 'version.json')
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, `${JSON.stringify({ version: rootVersion })}\n`)
  return { rootVersion, file }
}

export function evaluateVersions(rootVersion, mcpVersion) {
  if (!SEMVER.test(rootVersion)) {
    return { ok: false, reason: `root version "${rootVersion}" is not a valid semver` }
  }
  if (!SEMVER.test(mcpVersion)) {
    return { ok: false, reason: `mcp version "${mcpVersion}" is not a valid semver` }
  }
  if (mcpVersion === rootVersion) {
    return { ok: true, placeholder: false, reason: `mcp version matches root (${rootVersion})` }
  }
  if (mcpVersion === PLACEHOLDER_VERSION) {
    return {
      ok: true,
      placeholder: true,
      reason: `mcp version is the placeholder ${PLACEHOLDER_VERSION}; release syncs it from root ${rootVersion}`
    }
  }
  return {
    ok: false,
    reason: `mcp version drift: mcp/package.json has ${mcpVersion}, root has ${rootVersion}`
  }
}

export async function checkVersions(rootDir = defaultRootDir()) {
  const { root, mcp } = await readPackages(rootDir)
  const rootVersion = assertRoot(root)
  if (mcp.name !== MCP_PACKAGE_NAME || mcp.private !== false) {
    throw new Error(`mcp/package.json must be the publishable "${MCP_PACKAGE_NAME}" package`)
  }
  const result = evaluateVersions(rootVersion, mcp.version)
  if (!result.ok) throw new Error(result.reason)
  return { rootVersion, mcpVersion: mcp.version, ...result }
}

export async function syncVersion(rootDir = defaultRootDir(), { write = true } = {}) {
  const { root, mcp } = await readPackages(rootDir)
  const rootVersion = assertRoot(root)
  const changed = mcp.version !== rootVersion
  if (changed && write) {
    const path = join(rootDir, 'mcp', 'package.json')
    const parsed = JSON.parse(await readFile(path, 'utf8'))
    parsed.version = rootVersion
    await writeFile(path, `${JSON.stringify(parsed, null, 2)}\n`)
  }
  return { rootVersion, previous: mcp.version, changed }
}

async function main() {
  const command = process.argv[2] ?? 'check'
  const rootDir = defaultRootDir()
  if (command === 'check') {
    const result = await checkVersions(rootDir)
    process.stdout.write(`${result.reason}\n`)
    return
  }
  if (command === 'sync') {
    const result = await syncVersion(rootDir)
    process.stdout.write(
      result.changed
        ? `mcp/package.json version ${result.previous} -> ${result.rootVersion}\n`
        : `mcp/package.json already at ${result.rootVersion}\n`
    )
    return
  }
  if (command === 'stamp') {
    const result = await stampVersion(rootDir)
    process.stdout.write(`stamped ${result.file} with ${result.rootVersion}\n`)
    return
  }
  throw new Error(`unknown command "${command}" (expected "check", "sync" or "stamp")`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`[mcp-version] ${err instanceof Error ? err.message : String(err)}\n`)
    process.exitCode = 1
  })
}
