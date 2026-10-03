import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/**
 * Static guard for the Docker build context: `COPY . .` in the builder stage must never
 * carry dotenv files (Nuxt would read them at build time and could bake private values
 * into .output). Verified natively once with BuildKit against a synthetic context; this
 * test only protects the rules and their order (last match wins in .dockerignore).
 */
const rules = readFileSync(new URL('../.dockerignore', import.meta.url), 'utf8')
  .split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))

describe('.dockerignore', () => {
  it('excludes .env and .env.* at the root and nested', () => {
    for (const r of ['.env', '.env.*', '**/.env', '**/.env.*']) expect(rules, r).toContain(r)
  })

  it('keeps the documented example, with negations AFTER every exclusion', () => {
    const negations = rules.filter(r => r.startsWith('!'))
    expect(negations).toEqual(expect.arrayContaining(['!.env.example', '!**/.env.example']))
    const lastExclusion = Math.max(...rules.map((r, i) => (r.startsWith('!') ? -1 : i)))
    for (const n of negations) expect(rules.indexOf(n)).toBeGreaterThan(lastExclusion)
  })

  it('preserves the pre-existing exclusions', () => {
    for (const r of ['node_modules', 'docs/node_modules', '.nuxt', '.output', 'data', '.git']) expect(rules, r).toContain(r)
  })
})
