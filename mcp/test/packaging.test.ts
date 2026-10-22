import { describe, expect, it } from 'vitest'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PLACEHOLDER_VERSION,
  checkVersions,
  evaluateVersions,
  readRootVersion,
  stampVersion,
  syncVersion
} from '../scripts/version.mjs'
import { readVersion } from '../src/version'

async function fixture(rootVersion: string, mcpVersion: string, rootPrivate = true) {
  const dir = await mkdtemp(join(tmpdir(), 'ezswm-mcp-version-'))
  await mkdir(join(dir, 'mcp'))
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'ezswm', version: rootVersion, private: rootPrivate }))
  await writeFile(
    join(dir, 'mcp', 'package.json'),
    JSON.stringify({ name: 'ezswm-mcp', version: mcpVersion, private: false, bin: { 'ezswm-mcp': 'dist/index.js' } })
  )
  return dir
}

describe('mcp package version', () => {
  it('accepts a matching child version', () => {
    expect(evaluateVersions('0.46.0', '0.46.0')).toMatchObject({ ok: true, placeholder: false })
  })

  it('accepts the placeholder and fails real drift', () => {
    expect(evaluateVersions('0.46.0', PLACEHOLDER_VERSION)).toMatchObject({ ok: true, placeholder: true })
    expect(evaluateVersions('0.46.0', '0.45.1')).toMatchObject({ ok: false })
    expect(evaluateVersions('0.46.0', '0.46.0-rc.1')).toMatchObject({ ok: false })
  })

  it('rejects invalid versions and a publishable root package', async () => {
    expect(evaluateVersions('next', 'next').ok).toBe(false)
    const dir = await fixture('0.46.0', '0.46.0', false)
    await expect(checkVersions(dir)).rejects.toThrow(/private "ezswm"/)
  })

  it('checks the real repository package manifests', async () => {
    const root = fileURLToPath(new URL('../..', import.meta.url))
    await expect(checkVersions(root)).resolves.toMatchObject({ ok: true })
  })

  it('needs no child bump when only the root version changes', async () => {
    const dir = await fixture('9.9.9', PLACEHOLDER_VERSION)
    await expect(checkVersions(dir)).resolves.toMatchObject({
      rootVersion: '9.9.9',
      mcpVersion: PLACEHOLDER_VERSION,
      ok: true,
      placeholder: true
    })
    expect(await readRootVersion(dir)).toBe('9.9.9')
  })

  it('syncs the child version from root and keeps unrelated fields', async () => {
    const dir = await fixture('1.2.3', PLACEHOLDER_VERSION)
    await expect(syncVersion(dir)).resolves.toMatchObject({ rootVersion: '1.2.3', changed: true })
    const pkg = JSON.parse(await readFile(join(dir, 'mcp', 'package.json'), 'utf8'))
    expect(pkg).toMatchObject({ name: 'ezswm-mcp', version: '1.2.3', private: false, bin: { 'ezswm-mcp': 'dist/index.js' } })
    await expect(syncVersion(dir)).resolves.toMatchObject({ changed: false })
  })

  it('stamps the build output without touching the tracked manifest', async () => {
    const dir = await fixture('2.0.1', PLACEHOLDER_VERSION)
    const manifestPath = join(dir, 'mcp', 'package.json')
    const before = await readFile(manifestPath, 'utf8')

    const { file } = await stampVersion(dir)

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({ version: '2.0.1' })
    expect(await readFile(manifestPath, 'utf8')).toBe(before)
    expect(readVersion(join(dir, 'mcp', 'dist'))).toBe('2.0.1')
  })
})

describe('mcp runtime version', () => {
  it('prefers the stamped build output, falls back to the manifest, then to dev', async () => {
    const base = await mkdtemp(join(tmpdir(), 'ezswm-mcp-dist-'))
    const dist = join(base, 'dist')
    await mkdir(dist)
    expect(readVersion(dist)).toBe('0.0.0-dev')

    await writeFile(join(base, 'package.json'), JSON.stringify({ version: '4.5.6' }))
    expect(readVersion(dist)).toBe('4.5.6')

    await writeFile(join(dist, 'version.json'), JSON.stringify({ version: '7.8.9' }))
    expect(readVersion(dist)).toBe('7.8.9')

    await writeFile(join(base, 'package.json'), JSON.stringify({ version: PLACEHOLDER_VERSION }))
    expect(readVersion(dist)).toBe('7.8.9')
  })
})

describe('publishable package metadata', () => {
  it('ships the bin and the repository provenance needs', async () => {
    const root = fileURLToPath(new URL('../..', import.meta.url))
    const pkg = JSON.parse(await readFile(join(root, 'mcp', 'package.json'), 'utf8'))

    expect(pkg).toMatchObject({
      name: 'ezswm-mcp',
      version: PLACEHOLDER_VERSION,
      private: false,
      bin: { 'ezswm-mcp': 'dist/index.js' },
      files: ['dist'],
      repository: { type: 'git', url: 'git+https://github.com/slgfire/ezswm.git', directory: 'mcp' }
    })
  })
})
