import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static guard for the Logo assets (PR #285, pinned commit 7fc2915ddcb0b064c7849b0ab1d98d30f863cce4).
 * The expected SHA-256 values are PUBLIC artifact data of that pinned commit (no remote fetch, no env).
 * This is a KNOWN-STATIC pin check of exactly these eight files. It is NOT a generic SVG sanitizer and NOT a
 * proof that arbitrary SVG is safe: the structural checks only assert that THESE pinned files stay passive
 * (root/title/path elements only, no scripts, events, external references, fonts or styles).
 * Test-only file reads; unrelated to production storage (server/repositories).
 */
const PIN = '7fc2915ddcb0b064c7849b0ab1d98d30f863cce4'
const PUBLIC = [
  { file: 'logo.svg', sha: '3c55ad1a4b73566647710127c5ef62679658011ecc312540e427d6553a4ad473', bytes: 34512 },
  { file: 'logo-dark.svg', sha: 'cdeb5e686e0585d7d8bf468ea84adb7c6e41d0fb0a724888c30b08c54fe6f6dc', bytes: 34512 },
  { file: 'logo.png', sha: '95ebaaa150e8269035e1df0fdd0439ee9d21f1039440724df23c20862b59e8f6', bytes: 30824 },
  { file: 'favicon.svg', sha: '1f9efc25f8eb074a3f18b431ef6f7710c9c1c339df0b84a531e4deefc71ab929', bytes: 22857 },
  { file: 'favicon.ico', sha: '58f47b6a0f9f672a858c45bf413f84122005a5e7945e2de083305d6d17cc1fbe', bytes: 6536 },
  { file: 'apple-touch-icon.png', sha: 'caefa858620ce2e9915cb0d93621a48dc112094242ff955b9312834551cac7d1', bytes: 3483 },
  { file: 'icon-192.png', sha: 'e41c976b86a9c672b9da338f5a4a2c1b353e8ba4e23f9d9f3b61555c9fd3f7c0', bytes: 3589 },
  { file: 'icon-512.png', sha: '98ae1c442f5386d8e439c72bac0a3088f92d07ab16813afddf1012534145f0e9', bytes: 10447 }
] as const

const read = (file: string) => readFileSync(join(process.cwd(), 'public', file))

// BEGIN checkers (also exercised by a private node dry-run against the audited PR files)
interface SvgInfo { tags: Record<string, number>, viewBox: string | null, forbidden: string[], externalUrls: string[] }
function inspectSvg(text: string): SvgInfo {
  const body = text.replace(/<\?xml[\s\S]*?\?>/g, '').replace(/<!--[\s\S]*?-->/g, '')
  const tags: Record<string, number> = {}
  for (const m of body.matchAll(/<\s*([A-Za-z][\w:-]*)/g)) tags[m[1]!] = (tags[m[1]!] ?? 0) + 1
  const forbidden: string[] = []
  const bans: Array<[string, RegExp]> = [
    ['doctype', /<!DOCTYPE/i], ['entity', /<!ENTITY/i], ['script', /<\s*script/i], ['event-attr', /\son[a-z]+\s*=/i],
    ['foreignObject', /foreignObject/i], ['href', /(?:xlink:)?href\s*=/i], ['src', /\ssrc\s*=/i], ['url()', /url\s*\(/i],
    ['import', /@import/i], ['style', /<\s*style/i], ['style-attr', /\sstyle\s*=/i], ['font', /font-family|@font-face/i],
    ['text', /<\s*text\b/i], ['image', /<\s*image\b/i], ['cdata', /<!\[CDATA\[/i]
  ]
  for (const [name, re] of bans) if (re.test(text)) forbidden.push(name)
  // Only the standard SVG/XLink namespace declarations may mention an absolute URL.
  const externalUrls = [...body.matchAll(/https?:\/\/[^\s"'<>]+/gi)].map(m => m[0]).filter(u => !/^http:\/\/www\.w3\.org\/(2000\/svg|1999\/xlink)$/.test(u))
  return { tags, viewBox: /viewBox\s*=\s*"([^"]+)"/.exec(body)?.[1] ?? null, forbidden, externalUrls }
}
function inspectPng(b: Buffer) {
  const sig = b.subarray(0, 8).toString('hex')
  return { sig, ihdr: b.subarray(12, 16).toString('ascii'), width: b.readUInt32BE(16), height: b.readUInt32BE(20), bitDepth: b[24], colorType: b[25] }
}
function inspectIco(b: Buffer) {
  const count = b.readUInt16LE(4)
  const entries = Array.from({ length: count }, (_, i) => ({ w: b[6 + i * 16] || 256, h: b[7 + i * 16] || 256 }))
  return { reserved: b.readUInt16LE(0), type: b.readUInt16LE(2), count, entries }
}
// END checkers

describe(`Logo assets pinned to PR #285 commit ${PIN.slice(0, 7)}`, () => {
  for (const p of PUBLIC) {
    it(`public/${p.file} is byte-identical to the pinned PR file (sha256 + size)`, () => {
      const buf = read(p.file)
      expect(buf.length).toBe(p.bytes)
      expect(createHash('sha256').update(buf).digest('hex')).toBe(p.sha)
    })
  }

  const SVGS = [
    { file: 'logo.svg', viewBox: '0 0 2172 724', tags: { svg: 1, title: 1, path: 6 } },
    { file: 'logo-dark.svg', viewBox: '0 0 2172 724', tags: { svg: 1, title: 1, path: 6 } },
    { file: 'favicon.svg', viewBox: '0 0 1254 1254', tags: { svg: 1, title: 1, path: 1 } }
  ]
  for (const s of SVGS) {
    it(`public/${s.file} keeps the known static structure (root/title/path only, no active or external content)`, () => {
      const i = inspectSvg(read(s.file).toString('utf8'))
      expect(i.viewBox).toBe(s.viewBox)
      expect(i.tags).toEqual(s.tags)
      expect(i.forbidden).toEqual([])
      expect(i.externalUrls).toEqual([])
    })
  }

  const PNGS = [
    { file: 'logo.png', w: 1200, h: 400 }, { file: 'apple-touch-icon.png', w: 180, h: 180 },
    { file: 'icon-192.png', w: 192, h: 192 }, { file: 'icon-512.png', w: 512, h: 512 }
  ]
  for (const p of PNGS) {
    it(`public/${p.file} is a valid ${p.w}x${p.h} 8-bit RGBA PNG header`, () => {
      const i = inspectPng(read(p.file))
      expect(i.sig).toBe('89504e470d0a1a0a')
      expect(i.ihdr).toBe('IHDR')
      expect([i.width, i.height]).toEqual([p.w, p.h])
      expect(i.bitDepth).toBe(8)
      expect(i.colorType).toBe(6)
    })
  }

  it('public/favicon.ico is an ICO with the four entries 16/32/48/64', () => {
    const i = inspectIco(read('favicon.ico'))
    expect([i.reserved, i.type, i.count]).toEqual([0, 1, 4])
    expect(i.entries).toEqual([{ w: 16, h: 16 }, { w: 32, h: 32 }, { w: 48, h: 48 }, { w: 64, h: 64 }])
  })
})
