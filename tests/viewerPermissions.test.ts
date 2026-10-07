import { describe, expect, it } from 'vitest'
import {
  canEditInfrastructureForRole,
  deriveRoleState,
  getErrorStatus,
  isDefinitiveAuthFailure,
  isPublicAuthPath
} from '../app/utils/permissions'

describe('viewer permission helpers', () => {
  it('only admin can edit infrastructure; unknown/null deny', () => {
    expect(canEditInfrastructureForRole('admin')).toBe(true)
    expect(canEditInfrastructureForRole('viewer')).toBe(false)
    expect(canEditInfrastructureForRole(null)).toBe(false)
    expect(canEditInfrastructureForRole('Admin')).toBe(false)
  })

  it('derives role state with loading distinct from anonymous/viewer', () => {
    expect(deriveRoleState(false, null)).toBe('loading')
    expect(deriveRoleState(false, { role: 'viewer' })).toBe('loading')
    expect(deriveRoleState(true, null)).toBe('anonymous')
    expect(deriveRoleState(true, { role: 'viewer' })).toBe('viewer')
    expect(deriveRoleState(true, { role: 'admin' })).toBe('admin')
    expect(deriveRoleState(true, { role: 'root' })).toBe('unknown')
  })

  it('extracts error status from common shapes', () => {
    expect(getErrorStatus({ statusCode: 403 })).toBe(403)
    expect(getErrorStatus({ response: { status: 401 } })).toBe(401)
    expect(getErrorStatus(new Error('x'))).toBeUndefined()
  })

  it('treats only 401/404 as definitive auth failure, not network/5xx', () => {
    expect(isDefinitiveAuthFailure({ statusCode: 401 })).toBe(true)
    expect(isDefinitiveAuthFailure({ statusCode: 503 })).toBe(false)
    expect(isDefinitiveAuthFailure(new TypeError('fetch failed'))).toBe(false)
  })

  it('skips refresh for public/setup/login paths', () => {
    expect(isPublicAuthPath('/p/abc')).toBe(true)
    expect(isPublicAuthPath('/login')).toBe(true)
    expect(isPublicAuthPath('/sites')).toBe(false)
  })
})
