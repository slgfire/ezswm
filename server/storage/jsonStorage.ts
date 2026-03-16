import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, unlinkSync, accessSync, constants } from 'node:fs'
import { join } from 'node:path'

function getDataDir(): string {
  const config = useRuntimeConfig()
  return config.dataDir || './data'
}

export function ensureDataDir(): void {
  const dataDir = getDataDir()
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
}

export function getFilePath(fileName: string): string {
  return join(getDataDir(), fileName)
}

export function readJson<T>(fileName: string): T {
  const filePath = getFilePath(fileName)
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content) as T
}

export function writeJson<T>(fileName: string, data: T): void {
  const filePath = getFilePath(fileName)
  const tmpPath = filePath + '.tmp'
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
    renameSync(tmpPath, filePath)
  } catch (error) {
    try {
      unlinkSync(tmpPath)
    } catch {
      // tmp file may not exist
    }
    throw error
  }
}

export function initializeFile<T>(fileName: string, defaultData: T): void {
  const filePath = getFilePath(fileName)
  if (!existsSync(filePath)) {
    writeJson(fileName, defaultData)
  }
}

export function isDataDirWritable(): boolean {
  try {
    const dataDir = getDataDir()
    accessSync(dataDir, constants.W_OK)
    return true
  } catch {
    return false
  }
}
