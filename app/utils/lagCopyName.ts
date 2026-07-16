const MAX_LAG_NAME_LENGTH = 100

export function suggestLagCopyName(sourceName: string, existingNames: string[]): string {
  const existing = new Set(existingNames)
  let suffix = ' (copy)'
  let number = 2

  while (true) {
    const marker = suffix
    const sourceLimit = MAX_LAG_NAME_LENGTH - marker.length
    let truncated = sourceName.slice(0, sourceLimit)
    while (/^[\uD800-\uDBFF]$/.test(truncated.at(-1) ?? '')) truncated = truncated.slice(0, -1)
    const name = `${truncated}${marker}`
    if (!existing.has(name)) return name
    suffix = ` (copy) ${number++}`
  }
}
