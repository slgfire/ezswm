export function buildSidePanelPortPutOptions(body: Record<string, unknown>, siteId: string | undefined) {
  return {
    method: 'PUT' as const,
    body,
    query: siteId && siteId !== 'all' ? { siteId } : undefined
  }
}
