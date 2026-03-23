import { isValidCIDR, parseSubnet } from '../utils/ipv4'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const cidr = String(query.cidr || '')

  if (!cidr || !isValidCIDR(cidr)) {
    throw createError({ statusCode: 400, message: 'Invalid CIDR notation. Example: 10.0.1.0/24' })
  }

  const info = parseSubnet(cidr)
  return { cidr, ...info }
})
