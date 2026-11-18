import { Readable } from 'node:stream'
import type { H3Event } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readBoundedJson } from '../server/utils/boundedJson'
import { assertBrowserMutationOrigin } from '../server/utils/browserMutation'
import { reservePasswordAttempt } from '../server/utils/passwordAttempts'
import { installH3Globals, makeEvent } from './helpers/h3Harness'

function request(headers: Record<string, string> = {}, chunks: string[] = []) {
  const event = makeEvent({ path: '/api/test', method: 'POST', headers })
  event.node.req = Readable.from(chunks.map(chunk => Buffer.from(chunk)))
  return event as unknown as H3Event
}

describe('request boundaries', () => {
  beforeEach(installH3Globals)
  afterEach(() => vi.restoreAllMocks())

  it('reads JSON split across chunks up to the byte boundary', async () => {
    await expect(readBoundedJson(request({}, ['{"name":', '"é"}']), 13)).resolves.toEqual({ name: 'é' })
  })

  it('rejects an oversized upload with and without Content-Length', async () => {
    await expect(readBoundedJson(request({ 'content-length': '20' }), 16)).rejects.toMatchObject({ statusCode: 413 })
    await expect(readBoundedJson(request({}, ['[1,', '2]']), 4)).rejects.toMatchObject({ statusCode: 413 })
  })

  it('allows normal same-origin and CLI writes while rejecting cross-origin browser writes', () => {
    expect(() => assertBrowserMutationOrigin(request({ origin: 'http://ezswm.test', 'sec-fetch-site': 'same-origin' }))).not.toThrow()
    expect(() => assertBrowserMutationOrigin(request())).not.toThrow()
    expect(() => assertBrowserMutationOrigin(request({ origin: 'https://other.example' }))).toThrow(expect.objectContaining({ statusCode: 403 }))
    expect(() => assertBrowserMutationOrigin(request({ 'sec-fetch-site': 'same-site' }))).toThrow(expect.objectContaining({ statusCode: 403 }))
  })

  it('releases successful logins and throttles repeated unsuccessful attempts until the window resets', () => {
    let now = Date.now()
    vi.spyOn(Date, 'now').mockImplementation(() => now)
    const event = request()
    for (let i = 0; i < 12; i++) reservePasswordAttempt(event, 'audit_test_account')()
    for (let i = 0; i < 10; i++) reservePasswordAttempt(event, 'audit_test_account')
    expect(() => reservePasswordAttempt(event, 'Audit_Test_Account')).toThrow(expect.objectContaining({ statusCode: 429 }))
    now += 60_000
    expect(() => reservePasswordAttempt(event, 'audit_test_account')()).not.toThrow()
  })
})
