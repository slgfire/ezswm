const ASCII_FOLD: Record<string, string> = {
  'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss',
  'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'å': 'a', 'æ': 'ae',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o', 'œ': 'oe',
  'ú': 'u', 'ù': 'u', 'û': 'u',
  'ý': 'y', 'ÿ': 'y',
  'ñ': 'n', 'ç': 'c'
}

const MAX_LEN = 60

/**
 * Convert a free-form display name into a URL-safe slug:
 *  - lowercase
 *  - German umlauts and common accents transliterated
 *  - any run of non-alphanumeric characters becomes a single `-`
 *  - trimmed to MAX_LEN and stripped of leading/trailing dashes
 *  - non-empty fallback "item" when input collapses to nothing
 */
export function slugify(input: string): string {
  if (!input) return 'item'
  let s = input.toLowerCase()
  let folded = ''
  for (const ch of s) {
    folded += ASCII_FOLD[ch] ?? ch
  }
  s = folded
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LEN)
    .replace(/^-+|-+$/g, '')
  return s || 'item'
}

/**
 * Given a desired slug + a function that checks "does this slug already exist
 * in our scope?", return either the desired slug (if free) or the same slug
 * with a `-2`, `-3`, … suffix until one is free.
 */
export async function resolveSlugCollision(
  desired: string,
  isTaken: (candidate: string) => Promise<boolean>
): Promise<string> {
  if (!(await isTaken(desired))) return desired
  let counter = 2
  while (counter < 10_000) {
    const candidate = `${desired}-${counter}`
    if (!(await isTaken(candidate))) return candidate
    counter++
  }
  throw new Error(`Could not find a free slug for "${desired}" after 10000 attempts`)
}
