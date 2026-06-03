import { getTestRuntimeConfig } from './testHelpers'

interface CreateErrorInput {
  statusCode?: number
  statusMessage?: string
  message?: string
  data?: unknown
}

const globals = globalThis as unknown as {
  useRuntimeConfig: () => { dataDir: string; jwtSecret: string }
  createError: (input: CreateErrorInput) => Error & CreateErrorInput
  defineEventHandler: <T extends (...args: unknown[]) => unknown>(handler: T) => T
  readBody: (event: { body?: unknown }) => Promise<unknown>
  getQuery: (event: { query?: Record<string, unknown> }) => Record<string, unknown>
  setHeader: (event: unknown, name: string, value: string) => void
  setResponseStatus: (event: unknown, code: number) => void
}

globals.useRuntimeConfig = () => getTestRuntimeConfig()

globals.createError = (input: CreateErrorInput) =>
  Object.assign(new Error(input.message || input.statusMessage), input)

globals.defineEventHandler = (handler) => handler
globals.readBody = async (event) => event.body
globals.getQuery = (event) => event.query ?? {}
globals.setHeader = () => undefined
globals.setResponseStatus = () => undefined
