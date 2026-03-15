import { join } from 'node:path'
import type { H3Event } from 'h3'
import { readJsonFile, writeJsonFileAtomic } from '../storage/json-storage'

export function getDataDir(event?: H3Event): string {
  const config = useRuntimeConfig(event)
  return config.dataDir
}

export async function readCollection<T>(event: H3Event | undefined, fileName: string): Promise<T[]> {
  const path = join(getDataDir(event), fileName)
  return readJsonFile<T[]>(path)
}

export async function writeCollection<T>(event: H3Event | undefined, fileName: string, data: T[]): Promise<void> {
  const path = join(getDataDir(event), fileName)
  await writeJsonFileAtomic(path, data)
}
