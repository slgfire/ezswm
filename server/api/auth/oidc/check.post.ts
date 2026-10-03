import { oidcConfigRepository } from '../../../repositories/oidcConfigRepository'
import { checkOidcDiscovery } from '../../../utils/oidc/client'
import { decryptOidcSecret } from '../../../utils/oidc/crypto'
import { getKeyState, readOidcRuntimeSettings } from '../../../utils/oidc/session'
import { requireAdmin } from '../../../utils/requireAdmin'
import type { OidcCheckResultDto } from '../../../../types/oidc'

// Admin only. Validates the SAVED configuration by running a fresh discovery.
// Read-only: no config mutation, no shared-cache writes, no login. Only safe codes are returned.
export default defineEventHandler(async (event): Promise<OidcCheckResultDto> => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')

  const record = await oidcConfigRepository.get()
  if (!record.issuer || !record.client_id) return { ok: false, code: 'not_configured' }

  let secret: string | null = null
  if (record.client_secret_ciphertext) {
    const keyState = getKeyState(readOidcRuntimeSettings())
    if (!keyState.ready || !keyState.key) return { ok: false, code: 'encryption_key_unavailable' }
    try {
      secret = decryptOidcSecret(record.client_secret_ciphertext, keyState.key)
    } catch {
      return { ok: false, code: 'secret_undecryptable' }
    }
  }

  const result = await checkOidcDiscovery(record, secret)
  if (result.ok && record.issuer.startsWith('http:')) {
    result.warnings = [...(result.warnings ?? []), 'insecure_http_issuer']
  }
  return result
})
