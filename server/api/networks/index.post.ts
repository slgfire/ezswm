import { randomUUID } from 'node:crypto'
import { networkRepository } from '~/server/storage/repositories'
import { prefixToNetmask } from '~/utils/ip'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return networkRepository.create({ id: randomUUID(), ...body, netmask: prefixToNetmask(Number(body.prefix)) })
})
