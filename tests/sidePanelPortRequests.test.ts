import { describe, expect, it } from 'vitest'

import { buildSidePanelPortPutOptions } from '../app/utils/sidePanelPortRequests'

describe('sidepanel port PUT site scope', () => {
  it('forwards route siteId in query for scoped switch sub-resource requests', () => {
    const body = { status: 'up' }
    expect(buildSidePanelPortPutOptions(body, 'site-a')).toEqual({
      method: 'PUT',
      body,
      query: { siteId: 'site-a' }
    })
  })

  it('omits query in all-sites mode', () => {
    const body = { status: 'up' }
    expect(buildSidePanelPortPutOptions(body, 'all')).toEqual({
      method: 'PUT',
      body,
      query: undefined
    })
  })
})
