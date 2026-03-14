import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'

const ensureDir = async (filePath: string) => {
  await fs.mkdir(dirname(filePath), { recursive: true })
}

export class JsonStore<T extends { id: string }> {
  constructor(private readonly baseDir: string, private readonly fileName: string) {}

  private get fullPath() {
    return join(this.baseDir, this.fileName)
  }

  async readAll(): Promise<T[]> {
    try {
      const raw = await fs.readFile(this.fullPath, 'utf8')
      return JSON.parse(raw) as T[]
    }
    catch {
      return []
    }
  }

  async writeAll(data: T[]): Promise<void> {
    await ensureDir(this.fullPath)
    await fs.writeFile(this.fullPath, JSON.stringify(data, null, 2), 'utf8')
  }

  async upsert(item: T): Promise<T> {
    const items = await this.readAll()
    const index = items.findIndex(existing => existing.id === item.id)

    if (index >= 0) {
      items[index] = item
    }
    else {
      items.push(item)
    }

    await this.writeAll(items)
    return item
  }

  async delete(id: string): Promise<void> {
    const items = await this.readAll()
    await this.writeAll(items.filter(item => item.id !== id))
  }
}
