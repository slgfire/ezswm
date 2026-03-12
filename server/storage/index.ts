import type { PortRepository, LayoutRepository, LocationRepository, RackRepository, SwitchRepository } from './interfaces/repositories'
import { JsonStorageEngine } from './json/json-storage-engine'
import { JsonLayoutRepository } from './repositories/layout-repository'
import { JsonLocationRepository } from './repositories/location-repository'
import { JsonPortRepository } from './repositories/port-repository'
import { JsonRackRepository } from './repositories/rack-repository'
import { JsonSwitchRepository } from './repositories/switch-repository'

export interface StorageContext {
  switches: SwitchRepository
  ports: PortRepository
  layouts: LayoutRepository
  locations: LocationRepository
  racks: RackRepository
  readRawStore: JsonStorageEngine['read']
}

let storageContext: StorageContext | undefined

export function useStorage(): StorageContext {
  if (storageContext) return storageContext

  const storageEngine = new JsonStorageEngine()
  const switches = new JsonSwitchRepository(storageEngine)

  storageContext = {
    switches,
    ports: new JsonPortRepository(switches),
    layouts: new JsonLayoutRepository(storageEngine),
    locations: new JsonLocationRepository(storageEngine),
    racks: new JsonRackRepository(storageEngine),
    readRawStore: storageEngine.read.bind(storageEngine)
  }

  return storageContext
}
