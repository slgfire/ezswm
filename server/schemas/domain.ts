import { z } from 'zod'
import { prefixToNetmask, subnetContainsIp } from '../services/network-utils'

const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/

const portSchema = z.object({
  portNumber: z.string().min(1),
  label: z.string().default(''),
  status: z.string().default('down'),
  vlan: z.string().default(''),
  connectedDevice: z.string().default(''),
  macAddress: z.string().default(''),
  mediaType: z.string().default(''),
  duplex: z.string().default('auto'),
  speed: z.string().default(''),
  poe: z.string().default(''),
  patchTarget: z.string().default(''),
  description: z.string().default('')
})

export const switchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  vendor: z.string().default(''),
  model: z.string().default(''),
  location: z.string().default(''),
  rack: z.string().default(''),
  rackPosition: z.string().default(''),
  managementIp: z.string().regex(ipv4Regex),
  serialNumber: z.string().default(''),
  status: z.enum(['active', 'planned', 'maintenance', 'retired']).default('active'),
  description: z.string().default(''),
  layoutTemplateId: z.string().default('standard-48'),
  ports: z.array(portSchema).default([])
})

export const networkSchema = z.object({
  id: z.string().min(1),
  vlanId: z.number().int().min(1).max(4094),
  name: z.string().min(1),
  subnet: z.string().regex(ipv4Regex),
  prefix: z.number().int().min(0).max(32),
  gateway: z.string().regex(ipv4Regex),
  routing: z.string().default('enabled'),
  category: z.string().default('production'),
  description: z.string().default(''),
  notes: z.string().default('')
}).transform((value) => ({
  ...value,
  netmask: prefixToNetmask(value.prefix)
}))

export const ipAllocationSchema = z.object({
  id: z.string().min(1),
  networkId: z.string().min(1),
  ipAddress: z.string().regex(ipv4Regex),
  hostname: z.string().default(''),
  serviceName: z.string().default(''),
  deviceName: z.string().default(''),
  status: z.string().default('active'),
  description: z.string().default(''),
  notes: z.string().default('')
})

export const ipRangeSchema = z.object({
  id: z.string().min(1),
  networkId: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['dhcp', 'reserved', 'static', 'infrastructure']),
  startIp: z.string().regex(ipv4Regex),
  endIp: z.string().regex(ipv4Regex),
  description: z.string().default(''),
  notes: z.string().default('')
})

export function validateIpInsideNetwork(subnet: string, prefix: number, ip: string): boolean {
  return subnetContainsIp(subnet, prefix, ip)
}
