import { vlanRepository } from '../../repositories/vlanRepository'

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing VLAN ID' })
  }

  const vlan = vlanRepository.getById(id)

  if (!vlan) {
    throw createError({ statusCode: 404, statusMessage: 'VLAN not found' })
  }

  return vlan
})
