import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, message: 'Template ID is required' })
  }

  const template = layoutTemplateRepository.getById(id)

  if (!template) {
    throw createError({ statusCode: 404, message: 'Layout template not found' })
  }

  return template
})
