import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@prisma/client'
import Database from 'better-sqlite3'
import type { H3Event } from 'h3'
import { prisma } from '../db/client'

const PAGE_SIZE = 128
const MAX_ACTIVE_EXPORTS = 2
const SNAPSHOT_TIMEOUT_MS = 60_000
let activeExports = 0

async function copySnapshot(file: string, cancelled: () => boolean): Promise<void> {
  const databases = await prisma.$queryRaw<Array<{ name: string, file: string }>>`PRAGMA database_list`
  const live = databases.find(db => db.name === 'main')?.file
  if (!live) throw createError({ statusCode: 503, statusMessage: 'Export requires a file-backed database' })

  const source = new Database(live, { readonly: true, fileMustExist: true })
  const deadline = Date.now() + SNAPSHOT_TIMEOUT_MS
  try {
    await source.backup(file, {
      progress() {
        if (cancelled()) throw new Error('Export request cancelled')
        if (Date.now() > deadline) throw createError({ statusCode: 503, statusMessage: 'Export snapshot timed out' })
        return 100
      }
    })
  } finally {
    source.close()
  }
}

/** A private online SQLite snapshot lets slow downloads release the live database. */
export async function sendSnapshotExport(
  event: H3Event,
  contentType: string,
  filename: string,
  write: (snapshot: PrismaClient) => AsyncIterable<string>
): Promise<unknown> {
  if (activeExports >= MAX_ACTIVE_EXPORTS) {
    throw createError({ statusCode: 503, statusMessage: 'Too many active exports' })
  }
  activeExports++
  let directory: string | undefined
  let snapshot: PrismaClient | undefined
  try {
    directory = await mkdtemp(join(tmpdir(), 'ezswm-export-'))
    const file = join(directory, 'snapshot.sqlite')
    const response = event.node.res
    await copySnapshot(file, () => response?.destroyed === true)
    if (response?.destroyed) return
    snapshot = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${file}` }) })

    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'Content-Type', contentType)
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)
    const stream = Readable.from(write(snapshot), { objectMode: false })
    const cancel = () => {
      if (!response.writableFinished) stream.destroy(new Error('Export request cancelled'))
    }
    response?.once('close', cancel)
    try {
      return await sendStream(event, stream)
    } finally {
      response?.off('close', cancel)
      stream.destroy()
    }
  } finally {
    try {
      await snapshot?.$disconnect()
    } finally {
      try {
        if (directory) await rm(directory, { recursive: true, force: true })
      } finally {
        activeExports--
      }
    }
  }
}

interface ExportPage<Cursor> {
  take: number
  cursor?: Cursor
  skip?: number
}

export async function* exportRowsBy<Row, Cursor>(
  fetchPage: (page: ExportPage<Cursor>) => Promise<Row[]>,
  getCursor: (row: Row) => Cursor
): AsyncGenerator<Row> {
  let cursor: Cursor | undefined
  for (;;) {
    const rows = await fetchPage({ take: PAGE_SIZE, ...(cursor ? { cursor, skip: 1 } : {}) })
    yield* rows
    if (rows.length < PAGE_SIZE) return
    cursor = getCursor(rows[rows.length - 1]!)
  }
}

export function exportRows<Row extends { id: string }>(
  fetchPage: (page: ExportPage<{ id: string }>) => Promise<Row[]>
): AsyncGenerator<Row> {
  return exportRowsBy(fetchPage, row => ({ id: row.id }))
}

export async function* jsonExportArray(rows: AsyncIterable<unknown>): AsyncGenerator<string> {
  yield '['
  let first = true
  for await (const row of rows) {
    yield (first ? '' : ',') + JSON.stringify(row)
    first = false
  }
  yield ']'
}
