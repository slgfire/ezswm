#!/usr/bin/env node
/**
 * Release smoke: pack the built mcp package, install the tarball into a clean
 * temp directory, and launch it through the installed bin with no
 * configuration. A missing EZSWM_URL must produce a readable stderr error,
 * exit code 1 and no stdout (stdout is reserved for the MCP protocol).
 *
 * The tarball is packed from a temp copy carrying the root version, so the
 * tracked mcp/package.json keeps its placeholder.
 */
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

import { checkVersions, defaultRootDir, stampVersion } from './version.mjs'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  return result
}

export async function packSmoke({ rootDir = defaultRootDir(), expectedVersion } = {}) {
  const pkgDir = join(rootDir, 'mcp')
  const { rootVersion } = await checkVersions(rootDir)
  const version = expectedVersion ?? rootVersion
  if (version !== rootVersion) {
    throw new Error(`expected version ${version} does not match root version ${rootVersion}`)
  }
  await readFile(join(pkgDir, 'dist', 'index.js'), 'utf8')
  // Build output metadata must match the root version that is packed.
  await stampVersion(rootDir)

  const work = await mkdtemp(join(tmpdir(), 'ezswm-mcp-pack-'))
  try {
    const stage = join(work, 'package')
    await mkdir(stage)
    await cp(join(pkgDir, 'dist'), join(stage, 'dist'), { recursive: true })
    const manifest = JSON.parse(await readFile(join(pkgDir, 'package.json'), 'utf8'))
    manifest.version = version
    await writeFile(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`)

    const packResult = run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', work], { cwd: stage })
    if (packResult.status !== 0) throw new Error(`npm pack failed:\n${packResult.stderr}`)
    const [packed] = JSON.parse(packResult.stdout)
    if (!packed || packed.name !== 'ezswm-mcp' || packed.version !== version) {
      throw new Error(`unexpected pack output: ${packResult.stdout}`)
    }
    const packedPaths = new Set((packed.files ?? []).map((file) => file.path))
    for (const required of ['package.json', 'dist/index.js', 'dist/version.json']) {
      if (!packedPaths.has(required)) throw new Error(`packed tarball is missing ${required}`)
    }
    for (const forbidden of ['src/index.ts', 'test/mcp.test.ts']) {
      if (packedPaths.has(forbidden)) throw new Error(`packed tarball must not contain ${forbidden}`)
    }

    const tarball = join(work, packed.filename)
    const consumer = join(work, 'consumer')
    await mkdir(consumer)
    await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'ezswm-mcp-smoke', private: true }))

    const install = run('npm', [
      'install',
      '--omit=dev',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--no-package-lock',
      tarball
    ], { cwd: consumer })
    if (install.status !== 0) throw new Error(`tarball install failed:\n${install.stderr}`)

    const installed = join(consumer, 'node_modules', 'ezswm-mcp')
    const installedPkg = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'))
    if (installedPkg.version !== version) {
      throw new Error(`installed tarball version ${installedPkg.version} != ${version}`)
    }
    if (installedPkg.bin?.['ezswm-mcp'] !== 'dist/index.js') {
      throw new Error(`installed tarball bin is not the ezswm-mcp entry point: ${JSON.stringify(installedPkg.bin)}`)
    }

    // Launch the installed bin, not the repo build, so the shipped entry point
    // and its dependency closure are what gets exercised.
    const bin = join(consumer, 'node_modules', '.bin', 'ezswm-mcp')
    const start = run(bin, [], {
      cwd: consumer,
      env: { PATH: process.env.PATH ?? '' },
      timeout: 30_000
    })
    if (start.status !== 1) throw new Error(`expected exit code 1 without config, got ${start.status}`)
    if (start.stdout !== '') throw new Error(`stdout must stay empty on startup failure, got: ${start.stdout}`)
    if (!start.stderr.includes('EZSWM_URL is required')) {
      throw new Error(`missing EZSWM_URL error not found in stderr: ${start.stderr}`)
    }

    return { version, filename: packed.filename, fileCount: packed.files.length, stderr: start.stderr.trim() }
  } finally {
    await rm(work, { recursive: true, force: true })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  packSmoke()
    .then((result) => {
      process.stdout.write(
        `[mcp-pack-smoke] ${result.filename} (${result.fileCount} files) installed; startup failed as expected: ${result.stderr}\n`
      )
    })
    .catch((err) => {
      process.stderr.write(`[mcp-pack-smoke] ${err instanceof Error ? err.message : String(err)}\n`)
      process.exitCode = 1
    })
}
