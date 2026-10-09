import { switchRepository } from '../../../../repositories/switchRepository'
import { resolveSwitchParam } from '../../../../utils/resolveSwitchParam'
import { resetPortSchema } from '../../../../validators/switchSchemas'

export default defineEventHandler(async (event) => {
  const portId = getRouterParam(event, 'portId')!

  // Resolve the switch (UUID or per-site slug + ?siteId) to its real PK.
  const sw = await resolveSwitchParam(event)

  // A missing body is the legacy reset; a malformed body must never turn into a destructive default.
  const body = (await readBody(event)) ?? {}
  const validation = resetPortSchema.safeParse(body)
  if (!validation.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' })
  }

  // Reset port to defaults. By default the peer only loses the link; with the explicit
  // reset_counterpart opt-in a validated Access counterpart is reset completely.
  return switchRepository.resetPort(sw.id, portId, {
    resetCounterpart: validation.data.reset_counterpart,
    expectedCounterpartPortId: validation.data.expected_counterpart_port_id
  })
})
