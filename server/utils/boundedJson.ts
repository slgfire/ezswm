import type { H3Event } from 'h3'

export const ENTITY_IMPORT_MAX_BYTES = 16 * 1024 * 1024
export const RESTORE_MAX_BYTES = 128 * 1024 * 1024

/** Buffer only within the route limit, even for requests without Content-Length. */
export async function readBoundedJson<T = unknown>(event: H3Event, maxBytes: number): Promise<T | undefined> {
  const req = event.node.req
  const tooLarge = () => createError({ statusCode: 413, statusMessage: 'Request body exceeds the upload limit' })
  if (Number(getHeader(event, 'content-length')) > maxBytes) {
    req.resume()
    throw tooLarge()
  }

  const chunks: Buffer[] = []
  let bytes = 0
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    bytes += data.byteLength
    if (bytes > maxBytes) {
      req.resume()
      throw tooLarge()
    }
    chunks.push(data)
  }

  if (bytes === 0) return undefined
  try {
    return JSON.parse(Buffer.concat(chunks, bytes).toString('utf8'), (key, value: unknown) => {
      if (key === '__proto__' || (key === 'constructor' && value && typeof value === 'object' && Object.hasOwn(value, 'prototype'))) {
        throw new SyntaxError('Unsafe JSON property')
      }
      return value
    }) as T
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid JSON body' })
  }
}
