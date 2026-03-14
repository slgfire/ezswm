import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const [item, ports] = await Promise.all([
    repositories.switches.findById(id),
    repositories.ports.bySwitch(id)
  ])
  if (!item) throw createError({ statusCode: 404, statusMessage: 'Switch not found' })
  return { ...item, ports }
})
