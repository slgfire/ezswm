import { oidcConfigRepository } from '../../../repositories/oidcConfigRepository'
import { isOidcEffectivelyEnabled, readOidcRuntimeSettings } from '../../../utils/oidc/session'
import type { OidcStatusDto } from '../../../../types/oidc'

// Public: effective SSO readiness only (enabled AND configured AND key/secret usable).
export default defineEventHandler(async (event): Promise<OidcStatusDto> => {
  setHeader(event, 'Cache-Control', 'no-store')
  const record = await oidcConfigRepository.get()
  const enabled = isOidcEffectivelyEnabled(record, readOidcRuntimeSettings())
  // provider_name is deliberately public branding; only exposed when SSO is usable and a name is set.
  if (enabled && record.provider_name && record.provider_name.trim().length > 0) {
    return { enabled, provider_name: record.provider_name }
  }
  return { enabled }
})
