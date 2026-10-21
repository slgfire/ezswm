import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import Database from 'better-sqlite3'

import { canonicalizeCIDR, isValidCIDR } from '../server/utils/ipv4'
import { restoreAll } from '../server/utils/dataRestore'
import { runJsonToPrismaMigration } from '../server/migrations/jsonToPrisma'
import { createTestPrisma } from './testHelpers'

const MIG_DIR = join(process.cwd(), 'prisma', 'migrations')
const LAST = '20261024120000_scoped_network_uniqueness'
const migrations = readdirSync(MIG_DIR).filter(d => /^\d+_/.test(d)).sort()
const T = '2026-01-01T00:00:00Z'

function applyMigrations(db: Database.Database, upTo: 'before' | 'all') {
  for (const m of migrations) {
    if (upTo === 'before' && m === LAST) continue
    db.exec(readFileSync(join(MIG_DIR, m, 'migration.sql'), 'utf-8'))
  }
}

const site = (db: Database.Database, id: string) =>
  db.prepare('INSERT INTO Site (id,slug,name,created_at,updated_at) VALUES (?,?,?,?,?)').run(id, id, id, T, T)
const vlan = (db: Database.Database, id: string, siteId: string, tag: number) =>
  db.prepare('INSERT INTO Vlan (id,site_id,vlan_id,name,status,color,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, siteId, tag, id, 'active', 'blue', T, T)
const net = (db: Database.Database, id: string, siteId: string, vlanId: string | null, subnet: string) =>
  db.prepare('INSERT INTO Network (id,site_id,slug,name,vlan_id,subnet,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, siteId, id, id, vlanId, subnet, T, T)
const alloc = (db: Database.Database, id: string, netId: string, ip: string) =>
  db.prepare('INSERT INTO IpAllocation (id,network_id,ip_address,status,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run(id, netId, ip, 'active', T, T)

describe('scoped network uniqueness triggers', () => {
  it('deploys on dirty legacy duplicates, leaves rows unchanged, allows unrelated updates', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyMigrations(db, 'before')
    site(db, 's1')
    net(db, 'n1', 's1', null, '10.0.0.0/24')
    net(db, 'n2', 's1', null, '10.0.0.7/24') // same canonical CIDR, same scope
    alloc(db, 'a1', 'n1', '10.0.0.5')
    alloc(db, 'a2', 'n1', '10.0.0.5')
    const snap = () => JSON.stringify([
      db.prepare('SELECT * FROM Network ORDER BY id').all(),
      db.prepare('SELECT * FROM IpAllocation ORDER BY id').all()
    ])
    const before = snap()
    db.exec(readFileSync(join(MIG_DIR, LAST, 'migration.sql'), 'utf-8'))
    expect(snap()).toBe(before)

    // unrelated updates on dirty rows work, incl. resubmitting the unchanged key
    db.prepare("UPDATE Network SET name='x', subnet=subnet WHERE id='n2'").run()
    db.prepare("UPDATE Network SET subnet='10.0.0.7/24' WHERE id='n2'").run()
    db.prepare("UPDATE IpAllocation SET hostname='h', ip_address='10.0.0.5' WHERE id='a2'").run()
    // new violation still rejected
    expect(() => net(db, 'n3', 's1', null, '10.0.0.99/24')).toThrow(/NETWORK_SUBNET_CONFLICT/)
    expect(() => alloc(db, 'a3', 'n1', '10.0.0.5')).toThrow(/IP_ALLOCATION_CONFLICT/)
    db.close()
  })

  it('enforces scope rules on insert and update', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyMigrations(db, 'all')
    site(db, 's1'); site(db, 's2')
    vlan(db, 'v1', 's1', 10); vlan(db, 'v2', 's1', 20)
    net(db, 'n1', 's1', null, '192.168.1.0/24')
    expect(() => net(db, 'dup', 's1', null, '192.168.1.200/24')).toThrow(/NETWORK_SUBNET_CONFLICT/)
    net(db, 'okV1', 's1', 'v1', '192.168.1.0/24') // tagged vs untagged
    net(db, 'okV2', 's1', 'v2', '192.168.1.0/24') // other VLAN
    net(db, 'okS2', 's2', null, '192.168.1.0/24') // other site
    net(db, 'okNonIdentical', 's1', null, '192.168.1.0/25') // overlap, not identical
    expect(() => net(db, 'dupV1', 's1', 'v1', '192.168.1.5/24')).toThrow(/NETWORK_SUBNET_CONFLICT/)
    // update into conflict is rejected (vlan, site, subnet)
    expect(() => db.prepare("UPDATE Network SET vlan_id=NULL WHERE id='okV1'").run()).toThrow(/NETWORK_SUBNET_CONFLICT/)
    expect(() => db.prepare("UPDATE Network SET site_id='s1' WHERE id='okS2'").run()).toThrow(/NETWORK_SUBNET_CONFLICT/)
    expect(() => db.prepare("UPDATE Network SET subnet='192.168.1.0/24' WHERE id='okNonIdentical'").run()).toThrow(/NETWORK_SUBNET_CONFLICT/)
    // non-key update fine
    db.prepare("UPDATE Network SET name='renamed' WHERE id='n1'").run()
    // allocations
    alloc(db, 'a1', 'n1', '192.168.1.5')
    expect(() => alloc(db, 'a2', 'n1', '192.168.1.5')).toThrow(/IP_ALLOCATION_CONFLICT/)
    alloc(db, 'a3', 'okV1', '192.168.1.5') // repeated IP in other network ok
    expect(() => db.prepare("UPDATE IpAllocation SET network_id='n1' WHERE id='a3'").run()).toThrow(/IP_ALLOCATION_CONFLICT/)
    db.close()
  })

  it('SQL canonicalization matches canonicalizeCIDR at all prefix boundaries', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyMigrations(db, 'all')
    site(db, 's1')
    let i = 0
    for (const p of [0, 1, 8, 10, 12, 16, 23, 24, 25, 30, 31, 32]) {
      for (const [a, b] of [
        ['10.20.30.40', '10.20.30.41'], ['255.255.255.255', '255.255.255.254'],
        ['0.0.0.0', '0.0.0.1'], ['172.31.255.255', '172.16.0.0'], ['10.0.0.0', '10.1.0.0'],
        ['192.168.129.130', '192.168.129.200']
      ] as const) {
        const scope = `sc${i++}`
        site(db, scope)
        net(db, `x${i}`, scope, null, `${a}/${p}`)
        const same = canonicalizeCIDR(`${a}/${p}`) === canonicalizeCIDR(`${b}/${p}`)
        const attempt = () => net(db, `y${i}`, scope, null, `${b}/${p}`)
        if (same) expect(attempt, `${a} ${b} /${p}`).toThrow(/NETWORK_SUBNET_CONFLICT/)
        else expect(attempt, `${a} ${b} /${p}`).not.toThrow()
      }
      // different prefix never conflicts
      const scope = `p${p}`
      site(db, scope)
      net(db, `m${p}`, scope, null, `10.0.0.0/${p}`)
      if (p < 32) expect(() => net(db, `q${p}`, scope, null, `10.0.0.0/${p + 1}`)).not.toThrow()
    }
    // unparseable subnets never conflict (guards must not break legacy junk)
    net(db, 'j1', 's1', null, 'junk'); net(db, 'j2', 's1', null, 'junk')
    net(db, 'j3', 's1', null, '1.2.3.4.5/8'); net(db, 'j4', 's1', null, '1.2.3.4.5/8')
    // leading-zero octets are JS-invalid (isValidCIDR) -> SQL must ignore them too
    expect(isValidCIDR('010.0.0.1/24')).toBe(false)
    net(db, 'z1', 's1', null, '010.0.0.1/24'); net(db, 'z2', 's1', null, '010.0.0.1/24')
    net(db, 'z3', 's1', null, '10.0.0.1/24'); net(db, 'z4', 's1', null, '10.00.0.1/24')
    expect(() => net(db, 'z5', 's1', null, '10.0.0.9/24')).toThrow(/NETWORK_SUBNET_CONFLICT/)
    db.close()
  })

  it('DELETE FROM Vlan is blocked when SET NULL would collide; rows unchanged', () => {
    const db = new Database(':memory:')
    db.pragma('foreign_keys = ON')
    applyMigrations(db, 'all')
    site(db, 's1'); vlan(db, 'v1', 's1', 10)
    net(db, 'tagged', 's1', 'v1', '10.9.0.0/24')
    net(db, 'untagged', 's1', null, '10.9.0.77/24')
    expect(() => db.prepare("DELETE FROM Vlan WHERE id='v1'").run()).toThrow(/NETWORK_SUBNET_CONFLICT/)
    expect(db.prepare("SELECT id FROM Vlan").all()).toEqual([{ id: 'v1' }])
    expect(db.prepare("SELECT vlan_id FROM Network WHERE id='tagged'").get()).toEqual({ vlan_id: 'v1' })
    // without a collision the delete still works and nulls the reference
    db.prepare("DELETE FROM Network WHERE id='untagged'").run()
    db.prepare("DELETE FROM Vlan WHERE id='v1'").run()
    expect(db.prepare("SELECT vlan_id FROM Network WHERE id='tagged'").get()).toEqual({ vlan_id: null })
    // triggers are present
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all().map(r => (r as { name: string }).name)
    expect(names).toEqual(expect.arrayContaining([
      'Network_scoped_subnet_conflict_insert', 'Network_scoped_subnet_conflict_update',
      'IpAllocation_unique_ip_insert', 'IpAllocation_unique_ip_update'
    ]))
    db.close()
  })
})

describe('restore + legacy import conflicts', () => {
  const cleanups: Array<() => Promise<void> | void> = []
  afterEach(async () => { for (const c of cleanups.splice(0)) await c() })

  const admin = () => ({ id: randomUUID(), username: 'admin', display_name: 'A', password_hash: 'x', role: 'admin', language: 'en', is_setup_user: true, created_at: T, updated_at: T })
  const settings = () => ({ id: 'singleton', app_name: 'ezSWM', app_logo_url: null, default_vlan: null, default_port_status: 'down', port_speeds: '["1G"]', setup_completed: true, sites_initialized: true })
  const mkNet = (o: Record<string, unknown>) => ({ id: randomUUID(), slug: randomUUID(), name: 'n', vlan_id: null, subnet: '10.0.0.0/24', gateway: null, dns_servers: '[]', description: null, is_favorite: false, exclude_from_utilization: false, created_at: T, updated_at: T, ...o })

  async function setup() {
    const ctx = await createTestPrisma()
    cleanups.push(ctx.cleanup)
    return ctx.prisma
  }
  const payload = (siteId: string, extra: Record<string, unknown[]>) => ({
    schema: 'sqlite-v1',
    data: { users: [admin()], settings: [settings()], sites: [{ id: siteId, slug: 'r', name: 'R', description: null, created_at: T, updated_at: T }], ...extra }
  })

  it('restores clean payload, canonicalizes subnets, allows repeated IPs across networks', async () => {
    const prisma = await setup()
    const siteId = randomUUID(); const n1 = randomUUID(); const n2 = randomUUID(); const v = randomUUID()
    const alloc = (network_id: string) => ({ id: randomUUID(), network_id, ip_address: '10.0.0.5', hostname: null, mac_address: null, device_type: null, description: null, status: 'active', created_at: T, updated_at: T })
    await restoreAll(prisma, payload(siteId, {
      vlans: [{ id: v, site_id: siteId, vlan_id: 10, name: 'v', description: null, status: 'active', routing_device: null, color: 'blue', is_favorite: false, created_at: T, updated_at: T }],
      networks: [mkNet({ id: n1, site_id: siteId, subnet: '10.0.0.77/24' }), mkNet({ id: n2, site_id: siteId, vlan_id: v, subnet: '10.0.0.0/24' })],
      ipAllocations: [alloc(n1), alloc(n2)]
    }))
    expect((await prisma.network.findUnique({ where: { id: n1 } }))?.subnet).toBe('10.0.0.0/24')
    expect(await prisma.ipAllocation.count()).toBe(2)
  })

  it('rejects conflicting payload with 400 before wipe', async () => {
    const prisma = await setup()
    await prisma.site.create({ data: { id: randomUUID(), slug: 'keep', name: 'keep', created_at: T, updated_at: T } })
    const siteId = randomUUID(); const n1 = randomUUID()
    const bad1 = payload(siteId, { networks: [mkNet({ site_id: siteId }), mkNet({ site_id: siteId, subnet: '10.0.0.9/24' })] })
    await expect(restoreAll(prisma, bad1)).rejects.toMatchObject({ statusCode: 400 })
    const mkA = () => ({ id: randomUUID(), network_id: n1, ip_address: '10.0.0.5', status: 'active', created_at: T, updated_at: T })
    const bad2 = payload(siteId, { networks: [mkNet({ id: n1, site_id: siteId })], ipAllocations: [mkA(), mkA()] })
    await expect(restoreAll(prisma, bad2)).rejects.toMatchObject({ statusCode: 400 })
    expect((await prisma.site.findMany()).map(s => s.slug)).toEqual(['keep'])
  })

  describe('legacy JSON import', () => {
    const run = async (networks: unknown[], allocations: unknown[]) => {
      const prisma = await setup()
      const dir = mkdtempSync(join(tmpdir(), 'ezswm-scoped-'))
      cleanups.push(() => rmSync(dir, { recursive: true, force: true }))
      const w = (n: string, d: unknown) => writeFileSync(join(dir, n), JSON.stringify(d))
      w('sites.json', [{ id: 'site1', name: 'S', created_at: T, updated_at: T }])
      w('networks.json', networks)
      w('ip-allocations.json', allocations)
      return { prisma, dir, result: runJsonToPrismaMigration({ prisma, dataDir: dir }) }
    }
    const ln = (id: string, subnet: string) => ({ id, site_id: 'site1', name: id, subnet, created_at: T, updated_at: T })
    const la = (id: string, ip: string) => ({ id, network_id: 'n1', ip_address: ip, status: 'active', created_at: T, updated_at: T })

    it('fails atomically on duplicate network, keeps source JSON', async () => {
      const { prisma, dir, result } = await run([ln('n1', '10.0.0.0/24'), ln('n2', '10.0.0.5/24')], [])
      await expect(result).rejects.toThrow(/source files left untouched/)
      expect(await prisma.site.count()).toBe(0)
      expect(existsSync(join(dir, 'networks.json'))).toBe(true)
    })

    it('fails atomically on duplicate allocation', async () => {
      const { prisma, dir, result } = await run([ln('n1', '10.0.0.0/24')], [la('a1', '10.0.0.5'), la('a2', '10.0.0.5')])
      await expect(result).rejects.toThrow(/Duplicate IP/)
      expect(await prisma.network.count()).toBe(0)
      expect(existsSync(join(dir, 'ip-allocations.json'))).toBe(true)
    })

    it('imports clean data with canonical subnets', async () => {
      const { prisma, result } = await run([ln('n1', '10.0.0.5/24')], [la('a1', '10.0.0.5')])
      await result
      expect((await prisma.network.findFirst())?.subnet).toBe('10.0.0.0/24')
    })
  })
})
