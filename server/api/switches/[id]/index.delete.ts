import { repositories } from '~/server/repositories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  await repositories.switches.delete(id)
  const ports = await repositories.ports.bySwitch(id)
  await Promise.all(ports.map(port => repositories.ports.delete(port.id)))
  return { ok: true }
})
