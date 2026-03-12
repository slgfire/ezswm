declare module 'node:fs' {
  export const promises: {
    readFile(path: string, encoding: BufferEncoding): Promise<string>
    writeFile(path: string, data: string, encoding: BufferEncoding): Promise<void>
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
  }
}

declare module 'node:path' {
  export function join(...parts: string[]): string
  export function dirname(path: string): string
}

declare module 'node:crypto' {
  export function randomUUID(): string
}

type BufferEncoding = 'utf8' | 'ascii' | 'base64' | 'hex' | 'latin1' | 'utf16le'

declare const process: {
  cwd(): string
  env: Record<string, string | undefined>
}
