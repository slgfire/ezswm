import type {
  OidcCheckResultDto,
  OidcConfigDto,
  OidcConfigUpdateInput,
  OidcStatusDto
} from '../../types/oidc'

export function useOidc() {
  async function getStatus() {
    return await $fetch<OidcStatusDto>('/api/auth/oidc/status')
  }

  async function getConfig() {
    return await $fetch<OidcConfigDto>('/api/auth/oidc/config')
  }

  async function saveConfig(input: OidcConfigUpdateInput) {
    return await $fetch<OidcConfigDto>('/api/auth/oidc/config', {
      method: 'PUT',
      body: input
    })
  }

  async function checkSavedConfig() {
    return await $fetch<OidcCheckResultDto>('/api/auth/oidc/check', {
      method: 'POST'
    })
  }

  return { getStatus, getConfig, saveConfig, checkSavedConfig }
}
