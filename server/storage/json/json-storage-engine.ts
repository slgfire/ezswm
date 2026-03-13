import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DataStore } from '~/types/models'
import type { StorageEngine } from '~/server/storage/interfaces/storage-engine'
import { createSeedData, hasAnyData } from './seed'

const STORE_FILE_NAME = 'store.json'

export class JsonStorageEngine implements StorageEngine {
  private async getStorePath(): Promise<string> {
    const config = useRuntimeConfig()
    const dataDir = config.dataDir || 'data'
    const storePath = join(process.cwd(), dataDir, STORE_FILE_NAME)
    await fs.mkdir(dirname(storePath), { recursive: true })
    return storePath
  }

  private async ensureStoreFile(storePath: string): Promise<void> {
    try {
      await fs.access(storePath)
    } catch {
      await this.write(createSeedData())
    }
  }

  async read(): Promise<DataStore> {
    const storePath = await this.getStorePath()
    await this.ensureStoreFile(storePath)

    const raw = await fs.readFile(storePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<DataStore>
    const hydrated: DataStore = {
      locations: parsed.locations || [],
      racks: parsed.racks || [],
      vendors: parsed.vendors || [],
      switchModels: parsed.switchModels || [],
      layoutTemplates: parsed.layoutTemplates || [],
      switches: parsed.switches || [],
      networks: parsed.networks || [],
      ipAllocations: parsed.ipAllocations || []
    }

    if (!hasAnyData(hydrated)) {
      const seedData = createSeedData()
      await this.write(seedData)
      return seedData
    }

    if (!parsed.networks || !parsed.ipAllocations) {
      await this.write(hydrated)
    }

    return hydrated
  }

  async write(data: DataStore): Promise<void> {
    const storePath = await this.getStorePath()
    const tempPath = `${storePath}.tmp`
    const payload = `${JSON.stringify(data, null, 2)}\n`

    await fs.mkdir(dirname(storePath), { recursive: true })
    await fs.writeFile(tempPath, payload, 'utf8')

    try {
      await fs.rename(tempPath, storePath)
    } catch (error) {
      await fs.writeFile(storePath, payload, 'utf8')
    }
  }

  async update<T>(updater: (data: DataStore) => T | Promise<T>): Promise<T> {
    const current = await this.read()
    const result = await updater(current)
    await this.write(current)
    return result
  }
}
