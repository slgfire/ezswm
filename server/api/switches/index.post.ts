import { randomUUID } from 'node:crypto'
import { switchRepository } from '~/server/storage/repositories'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return switchRepository.create({ id: randomUUID(), ...body })
})
