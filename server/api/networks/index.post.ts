import { prefixToNetmask } from '~/utils/ip'
import { networkRepository } from '../../storage/repositories/network-repository'

export default defineEventHandler(async (event) => {
  const payload = await readBody(event)
  payload.netmask = prefixToNetmask(payload.prefix)
  return networkRepository.create(payload)
})
