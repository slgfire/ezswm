import { z } from 'zod'

export const saveLayoutSchema = z.object({
  node_positions: z.record(
    z.string(),
    z.object({
      x: z.number().finite(),
      y: z.number().finite()
    })
  ).refine(
    (positions) => Object.keys(positions).length <= 500,
    { message: 'Maximum 500 node positions allowed' }
  )
})
