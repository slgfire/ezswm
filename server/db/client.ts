import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'

declare global {
  var __prismaTestClient: PrismaClient | undefined
  var __prismaProdClient: PrismaClient | undefined
}

function activeClient(): PrismaClient {
  // Tests inject their own client via globalThis.__prismaTestClient; everything
  // else uses the lazily-constructed default Prisma client picked from the env.
  if (globalThis.__prismaTestClient) return globalThis.__prismaTestClient
  if (!globalThis.__prismaProdClient) {
    globalThis.__prismaProdClient = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
    })
  }
  return globalThis.__prismaProdClient
}

// Proxy so consumers can `import { prisma }` once at module load and still see
// the current client at call time. This is what lets a test swap clients
// (per-file in beforeAll) without re-importing the repository modules.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = activeClient()
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string]
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value
  }
})
