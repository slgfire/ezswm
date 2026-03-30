import type { FetchOptions } from 'ofetch'

export function useApiFetch() {
  function getHeaders(): Record<string, string> {
    if (import.meta.server) {
      const headers = useRequestHeaders(['cookie'])
      if (headers.cookie) {
        return { cookie: headers.cookie }
      }
    }
    return {}
  }

  async function apiFetch<T>(url: string, opts?: FetchOptions): Promise<T> {
    return $fetch(url, {
      ...opts,
      headers: {
        ...getHeaders(),
        ...(opts?.headers as Record<string, string> || {})
      }
    } as any) as unknown as T
  }

  return { apiFetch }
}
