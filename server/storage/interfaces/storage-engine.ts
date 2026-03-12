import type { DataStore } from '~/types/models'

export interface StorageEngine {
  read(): Promise<DataStore>
  write(data: DataStore): Promise<void>
  update<T>(updater: (data: DataStore) => T | Promise<T>): Promise<T>
}
