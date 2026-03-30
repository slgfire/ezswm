import { defineEventHandler, getQuery, createError } from 'h3'

interface TreeEntry {
  path: string
  type: string
}

interface CacheEntry {
  data: TreeEntry[]
  timestamp: number
}

let treeCache: CacheEntry | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

async function fetchDeviceTree(): Promise<TreeEntry[]> {
  if (treeCache && Date.now() - treeCache.timestamp < CACHE_TTL) {
    return treeCache.data
  }

  const url = 'https://api.github.com/repos/netbox-community/devicetype-library/git/trees/master?recursive=1'
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ezSWM' }
  })

  if (!response.ok) {
    throw createError({ statusCode: 503, message: 'Device library unavailable — no internet connection' })
  }

  const json = await response.json() as { tree: TreeEntry[] }
  const deviceFiles = json.tree.filter(
    (entry: TreeEntry) => entry.path.startsWith('device-types/') && entry.path.endsWith('.yaml') && entry.type === 'blob'
  )

  treeCache = { data: deviceFiles, timestamp: Date.now() }
  return deviceFiles
}

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event) as { q?: string }
  if (!q || q.trim().length < 2) {
    return { items: [] }
  }

  let tree: TreeEntry[]
  try {
    tree = await fetchDeviceTree()
  } catch (e: any) {
    if (e.statusCode === 503) throw e
    throw createError({ statusCode: 503, message: 'Device library unavailable — no internet connection' })
  }

  const query = q.toLowerCase().trim()
  const terms = query.split(/\s+/)

  const matches = tree
    .filter(entry => {
      const path = entry.path.toLowerCase()
      return terms.every(term => path.includes(term))
    })
    .slice(0, 50)
    .map(entry => {
      // device-types/Cisco/cisco-c9200-24t.yaml
      const parts = entry.path.replace('device-types/', '').replace('.yaml', '').split('/')
      const slug = parts[1] ?? parts[0] ?? ''
      return {
        manufacturer: parts[0],
        slug,
        model: slug.replace(/^[^-]+-/, '').replace(/-/g, ' ').toUpperCase()
      }
    })

  return { items: matches }
})
