import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'

const defaultContent = '[]\n'

export async function ensureJsonFile(path: string): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true })
  try {
    await fs.access(path)
  } catch {
    await fs.writeFile(path, defaultContent, 'utf8')
  }
}

export async function readJsonFile<T>(path: string): Promise<T> {
  await ensureJsonFile(path)
  const content = await fs.readFile(path, 'utf8')
  return JSON.parse(content) as T
}

export async function writeJsonFileAtomic(path: string, data: unknown): Promise<void> {
  await ensureJsonFile(path)
  const tempPath = join(dirname(path), `${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`)
  await fs.writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  await fs.rename(tempPath, path)
}
