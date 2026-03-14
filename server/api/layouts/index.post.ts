import { layoutRepository } from '../../storage/repositories/layout-repository'

export default defineEventHandler(async (event) => {
  const payload = await readBody(event)
  return layoutRepository.create(payload)
})
