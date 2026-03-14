import { repositories } from '../../repositories'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const current = await repositories.settings.getSingleton()
  if (!current) return repositories.settings.create({ ...body, id: 'default' })
  return repositories.settings.update(current.id, body)
})
