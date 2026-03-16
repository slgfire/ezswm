import { layoutTemplateRepository } from '../../repositories/layoutTemplateRepository'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.search as string) || ''
  const page = parseInt(query.page as string) || 1
  const perPage = parseInt(query.per_page as string) || 25

  let templates = layoutTemplateRepository.list()

  if (search) {
    const searchLower = search.toLowerCase()
    templates = templates.filter((t) =>
      t.name.toLowerCase().includes(searchLower)
    )
  }

  const total = templates.length
  const start = (page - 1) * perPage
  const items = templates.slice(start, start + perPage)

  return {
    items,
    total,
    page,
    per_page: perPage,
    total_pages: Math.ceil(total / perPage),
  }
})
