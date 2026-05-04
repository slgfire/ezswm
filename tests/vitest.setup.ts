import { getTestRuntimeConfig } from './testHelpers'

interface CreateErrorInput {
  statusCode?: number
  statusMessage?: string
  message?: string
}

const globals = globalThis as unknown as {
  useRuntimeConfig: () => { dataDir: string; jwtSecret: string }
  createError: (input: CreateErrorInput) => Error & CreateErrorInput
}

globals.useRuntimeConfig = () => getTestRuntimeConfig()

globals.createError = (input: CreateErrorInput) =>
  Object.assign(new Error(input.message || input.statusMessage), input)
