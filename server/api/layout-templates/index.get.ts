import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'
import { switchRepository } from '../../repositories/switchRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.search as string) || ''
  const manufacturer = (query.manufacturer as string) || ''

  let templates = layoutTemplateRepository.list()

  if (search) {
    const searchLower = search.toLowerCase()
    templates = templates.filter((t) =>
      t.name.toLowerCase().includes(searchLower) ||
      (t.manufacturer && t.manufacturer.toLowerCase().includes(searchLower)) ||
      (t.model && t.model.toLowerCase().includes(searchLower))
    )
  }

  if (manufacturer) {
    templates = templates.filter((t) => t.manufacturer === manufacturer)
  }

  const switches = switchRepository.list()
  const usageMap = new Map<string, number>()
  for (const sw of switches) {
    if (sw.layout_template_id) {
      usageMap.set(sw.layout_template_id, (usageMap.get(sw.layout_template_id) || 0) + 1)
    }
  }

  const items = templates.map((t) => ({
    ...t,
    switch_count: usageMap.get(t.id) || 0
  }))

  const manufacturers = [...new Set(
    layoutTemplateRepository.list()
      .map((t) => t.manufacturer)
      .filter(Boolean)
  )].sort()

  return {
    items,
    total: items.length,
    manufacturers,
  }
})
