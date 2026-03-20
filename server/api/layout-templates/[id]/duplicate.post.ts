import { layoutTemplateRepository } from '../../../repositories/layoutTemplateRepository'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const duplicate = layoutTemplateRepository.duplicate(id)
  setResponseStatus(event, 201)
  return duplicate
})
