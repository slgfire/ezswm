import type { IpAllocation, LayoutTemplate, Location, Network, Rack, Switch } from '~/types/models'
import type { CrudRepository } from './repository'

export interface SwitchRepository extends CrudRepository<Switch> {
  updatePort(switchId: string, portNumber: number, payload: Partial<Switch['ports'][number]>): Promise<Switch['ports'][number] | undefined>
}

export interface LayoutRepository extends CrudRepository<LayoutTemplate> {}

export interface LocationRepository extends CrudRepository<Location> {
  getByName(name: string): Promise<Location | undefined>
}

export interface RackRepository extends CrudRepository<Rack> {
  listByLocation(locationId: string): Promise<Rack[]>
  getByNameInLocation(locationId: string, name: string): Promise<Rack | undefined>
}

export interface PortRepository {
  updateBySwitchAndNumber(switchId: string, portNumber: number, payload: Partial<Switch['ports'][number]>): Promise<Switch['ports'][number] | undefined>
}

export interface NetworkRepository extends CrudRepository<Network> {}

export interface IpAllocationRepository extends CrudRepository<IpAllocation> {
  listByNetwork(networkId: string): Promise<IpAllocation[]>
}
