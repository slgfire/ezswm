import type { IpAllocation, IpRange, LayoutTemplate, Network, Switch } from '~/types/domain'
import { JsonRepository } from './repository'

export const switchRepository = new JsonRepository<Switch>('switches.json')
export const networkRepository = new JsonRepository<Network>('networks.json')
export const allocationRepository = new JsonRepository<IpAllocation>('ip-allocations.json')
export const rangeRepository = new JsonRepository<IpRange>('ip-ranges.json')
export const layoutRepository = new JsonRepository<LayoutTemplate>('layout-templates.json')
