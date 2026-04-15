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

  async function apiFetch<T>(url: string, opts?: Record<string, unknown>): Promise<T> {
    return $fetch(url, {
      ...opts,
      headers: {
        ...getHeaders(),
        ...(opts?.headers as Record<string, string> || {})
      }
    }) as unknown as T
  }

  return { apiFetch }
}
