import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const log = vi.fn(async (d: unknown) => d)
vi.mock('../server/repositories/activityRepository', () => ({ activityRepository: { log } }))
vi.stubGlobal('createError', (o: { statusCode: number }) => Object.assign(new Error('x'), o))

const { logActivity } = await import('../server/utils/activityLog')
const ev = (auth?: object) => ({ context: { auth } }) as never
const base = { action: 'update', entity_type: 'site', entity_id: '1', entity_name: 'n', previous_state: { a: 1 } } as const

beforeEach(() => log.mockClear())

describe('logActivity', () => {
  it('jwt: user from auth, metadata and previous_state untouched', async () => {
    await logActivity(ev({ userId: 'u1', authType: 'jwt' }), { ...base, metadata: { k: 1 } })
    expect(log).toHaveBeenCalledWith({ ...base, user_id: 'u1', metadata: { k: 1 } })
  })
  it('no metadata stays absent for jwt', async () => {
    await logActivity(ev({ userId: 'u1' }), base)
    expect(log.mock.calls[0]![0]).not.toHaveProperty('metadata')
  })
  it('api_token: adds token id/name, keeps metadata, never raw secret', async () => {
    await logActivity(ev({ userId: 'u1', authType: 'api_token', apiTokenId: 't1', apiTokenName: 'ci', token: 'ezswm_SECRET', tokenHash: 'h' }), { ...base, metadata: { k: 1 } })
    const arg = log.mock.calls[0]![0] as { metadata: object }
    expect(arg.metadata).toEqual({ k: 1, auth_type: 'api_token', api_token_id: 't1', api_token_name: 'ci' })
    expect(JSON.stringify(arg)).not.toMatch(/SECRET|"h"/)
  })
  it('event auth is authoritative; fallback to input user_id; else 401', async () => {
    await logActivity(ev({ userId: 'u1' }), { ...base, user_id: 'other' })
    expect(log.mock.calls[0]![0]).toMatchObject({ user_id: 'u1' })
    await logActivity(ev(), { ...base, user_id: 'sys' })
    expect(log.mock.calls[1]![0]).toMatchObject({ user_id: 'sys' })
    await expect(logActivity(ev(), base)).rejects.toMatchObject({ statusCode: 401 })
  })
})

describe('route migration', () => {
  const walk = (d: string): string[] => readdirSync(d).flatMap(n => statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)])
  it('no server/api route calls activityRepository.log directly', () => {
    const offenders = walk('server/api').filter(f => /activityRepository\.log\(/.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })
})
