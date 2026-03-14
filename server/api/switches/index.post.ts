import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  return switchRepository.create(body)
})
