import { patchPanelTokenRepository } from '../../../repositories/patchPanelTokenRepository'
import { patchPanelRepository } from '../../../repositories/patchPanelRepository'
import { requirePatchPanelsEnabled } from '../../../utils/requirePatchPanelsEnabled'

export default defineEventHandler(async (event) => {
  await requirePatchPanelsEnabled()

  const tokenStr = event.context.params?.token
  if (!tokenStr) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const tokenRecord = await patchPanelTokenRepository.getByToken(tokenStr)
  if (!tokenRecord) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const panel = await patchPanelRepository.getById(tokenRecord.patch_panel_id)
  if (!panel) {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  await patchPanelTokenRepository.updateLastAccess(tokenRecord.id)

  setHeader(event, 'X-Robots-Tag', 'noindex')
  setHeader(event, 'Cache-Control', 'no-store')

  return {
    name: panel.name,
    sockets: panel.sockets.map((socket) => ({
      port_number: socket.port_number,
      outlet_number: socket.outlet_number ?? null,
      location: socket.location ?? null,
      side: socket.side ?? null,
      tested: socket.tested
    }))
  }
})
