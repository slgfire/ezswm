/**
 * The MCP server reports the version it was built as. It is never hardcoded:
 * the stamped build output wins, then the package manifest (npm tarball). The
 * tracked manifest carries the placeholder outside release runs.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const PLACEHOLDER_VERSION = '0.0.0'

export function readVersion(distDir: string): string {
  for (const file of [join(distDir, 'version.json'), join(distDir, '..', 'package.json')]) {
    try {
      const version = JSON.parse(readFileSync(file, 'utf8')).version
      if (typeof version === 'string' && version && version !== PLACEHOLDER_VERSION) return version
    } catch {
      // Missing or unreadable metadata: try the next source.
    }
  }
  return '0.0.0-dev'
}
