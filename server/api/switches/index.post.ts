import { switchRepository } from '../../storage/repositories/switch-repository'

export default defineEventHandler(async (event) => {
  const payload = await readBody(event)
  return switchRepository.create(payload)
})
