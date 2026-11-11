import { test, expect } from '@playwright/test'
import { assertOwnedOrigin, resolveOwnedRun, shotsDir } from './helpers/ownedRun'

// Self-check of the trusted-origin helper; pure, no server needed.
const env = { E2E_RUN_DIR: '/r', E2E_BASE_URL: 'http://127.0.0.1:4001', E2E_SETUP_URL: 'http://127.0.0.1:4002', E2E_ARTIFACT_DIR: '/r/art' }
const marker = JSON.stringify({ baseUrl: env.E2E_BASE_URL, setupUrl: env.E2E_SETUP_URL })
const run = resolveOwnedRun(env, () => marker)

test.describe('owned-run origin helper', () => {
  test('accepts only exact owned origins', () => {
    expect(() => assertOwnedOrigin('http://127.0.0.1:4001', 'base', run)).not.toThrow()
    expect(() => assertOwnedOrigin('http://127.0.0.1:4002', 'setup', run)).not.toThrow()
    expect(() => assertOwnedOrigin('http://127.0.0.1:4002', 'base', run)).toThrow()
    expect(() => assertOwnedOrigin('http://localhost:3000', 'base', run)).toThrow()
    expect(() => assertOwnedOrigin('http://127.0.0.1:4001.evil.test', 'base', run)).toThrow()
  })
  test('fails closed without env, marker or on a cross-run marker', () => {
    expect(() => resolveOwnedRun({}, () => marker)).toThrow(/missing/)
    expect(() => resolveOwnedRun(env, () => null)).toThrow(/owned-run.json missing/)
    expect(() => resolveOwnedRun(env, () => JSON.stringify({ baseUrl: 'http://127.0.0.1:3000', setupUrl: env.E2E_SETUP_URL }))).toThrow(/differ/)
  })
  test('shotsDir defaults into the run artifact dir', () => {
    expect(shotsDir('X_UNSET', 'logo', env)).toBe('/r/art/logo')
    expect(shotsDir('X', 'logo', { ...env, X: '/o' })).toBe('/o')
  })
})
