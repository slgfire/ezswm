import { promises as fs } from 'node:fs'
import path from 'node:path'

const inMemoryFallback = path.resolve(process.cwd(), 'data')

const getDataDir = () => process.env.DATA_DIR || useRuntimeConfig().dataDir || inMemoryFallback

export class JsonRepository<T extends { id: string }> {
  constructor(private readonly fileName: string) {}

  private get filePath() {
    return path.join(getDataDir(), this.fileName)
  }

  private async ensureFile() {
    await fs.mkdir(getDataDir(), { recursive: true })
    try {
      await fs.access(this.filePath)
    }
    catch {
      await fs.writeFile(this.filePath, '[]', 'utf-8')
    }
  }

  async getAll(): Promise<T[]> {
    await this.ensureFile()
    const raw = await fs.readFile(this.filePath, 'utf-8')
    return JSON.parse(raw) as T[]
  }

  async findById(id: string): Promise<T | undefined> {
    const items = await this.getAll()
    return items.find(item => item.id === id)
  }

  async saveAll(items: T[]) {
    await this.ensureFile()
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf-8')
  }

  async create(item: T) {
    const items = await this.getAll()
    items.push(item)
    await this.saveAll(items)
    return item
  }

  async update(id: string, patch: Partial<T>) {
    const items = await this.getAll()
    const index = items.findIndex(item => item.id === id)
    if (index === -1) return null
    items[index] = { ...items[index], ...patch }
    await this.saveAll(items)
    return items[index]
  }

  async remove(id: string) {
    const items = await this.getAll()
    const next = items.filter(item => item.id !== id)
    if (next.length === items.length) return false
    await this.saveAll(next)
    return true
  }
}
