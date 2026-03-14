import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { AppData } from '~/types/models'
import { defaultData } from './seed/defaultData'

const DATA_DIR = process.env.DATA_DIR || resolve(process.cwd(), 'data')
const DATA_FILE = resolve(DATA_DIR, 'store.json')

class DataStore {
  private cache: AppData | null = null

  async ensureInitialized() {
    if (!existsSync(DATA_DIR)) {
      await mkdir(DATA_DIR, { recursive: true })
    }

    if (!existsSync(DATA_FILE)) {
      await writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8')
    }
  }

  async read(): Promise<AppData> {
    await this.ensureInitialized()
    if (this.cache) {
      return this.cache
    }

    const content = await readFile(DATA_FILE, 'utf-8')
    this.cache = JSON.parse(content) as AppData
    return this.cache
  }

  async write(data: AppData): Promise<void> {
    this.cache = data
    await writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
  }

  nextId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`
  }
}

export const dataStore = new DataStore()
