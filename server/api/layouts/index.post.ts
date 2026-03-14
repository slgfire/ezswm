import { randomUUID } from 'node:crypto'
import { layoutRepository } from '~/server/storage/repositories'
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return layoutRepository.create({ id: randomUUID(), ...body })
})
