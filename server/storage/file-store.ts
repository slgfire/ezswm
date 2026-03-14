import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'

export class JsonFileStore<T> {
  constructor(private fileName: string) {}

  private async getPath() {
    const config = useRuntimeConfig()
    const dataDir = resolve(process.cwd(), config.dataDir)
    await fs.mkdir(dataDir, { recursive: true })
    return resolve(dataDir, this.fileName)
  }

  async read(defaultValue: T): Promise<T> {
    const filePath = await this.getPath()

    try {
      const raw = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      await this.write(defaultValue)
      return defaultValue
    }
  }

  async write(payload: T) {
    const filePath = await this.getPath()
    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  }
}
