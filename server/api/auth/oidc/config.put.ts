import { oidcConfigRepository, type OidcConfigPatch } from '../../../repositories/oidcConfigRepository'
import { oidcConfigUpdateSchema } from '../../../validators/oidcSchemas'
import { OidcClientError, clearOidcClientCache, validateIssuerUrl } from '../../../utils/oidc/client'
import { canDecryptOidcSecret, encryptOidcSecret } from '../../../utils/oidc/crypto'
import { buildOidcConfigDto, getKeyState, readOidcRuntimeSettings } from '../../../utils/oidc/session'
import { getRequestOrigin } from '../../../utils/auth'
import { requireAdmin } from '../../../utils/requireAdmin'

// Admin only. Optional `client_secret` replaces, omitted retains, `client_secret_clear`
// removes. The plaintext secret is encrypted server-side and never returned.
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  setHeader(event, 'Cache-Control', 'no-store')

  const parsed = oidcConfigUpdateSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid OIDC configuration',
      data: { issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) }
    })
  }
  const input = parsed.data
  const settings = readOidcRuntimeSettings()
  const current = await oidcConfigRepository.get()

  // Merged state validation (policy applies to the resulting config, not just the patch).
  const nextIssuer = input.issuer !== undefined ? input.issuer : current.issuer
  const nextClientId = input.client_id !== undefined ? input.client_id : current.client_id
  const nextAllowHttp = input.allow_http_issuer ?? current.allow_http_issuer
  const nextEnabled = input.enabled ?? current.enabled

  if (nextIssuer) {
    try {
      validateIssuerUrl(nextIssuer, nextAllowHttp)
    } catch (err) {
      if (err instanceof OidcClientError) {
        throw createError({ statusCode: 400, message: nextIssuer.startsWith('http:') && !nextAllowHttp ? 'HTTP issuers require allow_http_issuer' : 'Invalid issuer URL' })
      }
      throw err
    }
  }

  const keyState = getKeyState(settings)
  let ciphertext: string | null | undefined
  if (input.client_secret_clear === true) {
    ciphertext = null
  } else if (input.client_secret !== undefined) {
    if (!keyState.ready || !keyState.key) {
      throw createError({ statusCode: 400, message: 'OIDC_ENCRYPTION_KEY is missing or invalid; the client secret cannot be stored', data: { reason: keyState.error } })
    }
    ciphertext = encryptOidcSecret(input.client_secret, keyState.key)
  }

  if (nextEnabled) {
    if (!nextIssuer || !nextClientId) {
      throw createError({ statusCode: 400, message: 'Issuer and client ID are required to enable SSO' })
    }
    const effectiveCiphertext = ciphertext === undefined ? current.client_secret_ciphertext : ciphertext
    if (effectiveCiphertext && !canDecryptOidcSecret(effectiveCiphertext, keyState.key)) {
      throw createError({ statusCode: 400, message: 'The stored client secret cannot be decrypted; re-enter the secret or fix OIDC_ENCRYPTION_KEY' })
    }
  }

  const patch: OidcConfigPatch = {}
  if (input.enabled !== undefined) patch.enabled = input.enabled
  if (input.issuer !== undefined) patch.issuer = input.issuer
  if (input.client_id !== undefined) patch.client_id = input.client_id
  if (ciphertext !== undefined) patch.client_secret_ciphertext = ciphertext
  if (input.scopes !== undefined) patch.scopes = input.scopes
  if (input.groups_claim !== undefined) patch.groups_claim = input.groups_claim
  if (input.admin_groups !== undefined) patch.admin_groups = input.admin_groups
  if (input.viewer_groups !== undefined) patch.viewer_groups = input.viewer_groups
  if (input.allow_unmatched_viewer !== undefined) patch.allow_unmatched_viewer = input.allow_unmatched_viewer
  if (input.allow_http_issuer !== undefined) patch.allow_http_issuer = input.allow_http_issuer

  if (input.provider_name !== undefined) patch.provider_name = input.provider_name

  const { config, changed } = await oidcConfigRepository.update(patch)
  if (changed) clearOidcClientCache()

  return buildOidcConfigDto(config, settings, getRequestOrigin(event))
})
