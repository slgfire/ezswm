import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

interface TestRuntimeConfig {
  dataDir: string
  jwtSecret: string
}

const DEFAULT_CONFIG: TestRuntimeConfig = {
  dataDir: '/tmp/vitest-default',
  jwtSecret: 'test-secret-key',
}

const _config: TestRuntimeConfig = { ...DEFAULT_CONFIG }

export function setTestRuntimeConfig(overrides: Partial<TestRuntimeConfig>): void {
  Object.assign(_config, overrides)
}

export function resetTestRuntimeConfig(): void {
  Object.assign(_config, { ...DEFAULT_CONFIG })
}

export function getTestRuntimeConfig(): TestRuntimeConfig {
  return { ..._config }
}

/**
 * Seed a JSON file in the given data directory.
 * Creates the directory if it doesn't exist.
 */
export function seedJsonFile(dataDir: string, fileName: string, data: unknown = []): void {
  mkdirSync(dataDir, { recursive: true })
  writeFileSync(join(dataDir, fileName), JSON.stringify(data, null, 2))
}
