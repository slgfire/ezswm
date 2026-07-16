import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('LAG name migration whitespace normalization', () => {
  it('normalizes ECMAScript whitespace before assigning unique names', () => {
    const db = new Database(':memory:')
    db.exec('CREATE TABLE LagGroup (id TEXT PRIMARY KEY, switch_id TEXT NOT NULL, name TEXT NOT NULL)')
    const insert = db.prepare('INSERT INTO LagGroup VALUES (?, ?, ?)')
    insert.run('1', 'switch', 'LAG')
    insert.run('2', 'switch', '\tLAG\u00a0')
    insert.run('3', 'switch', '\ufeffLAG\u3000')

    db.exec(readFileSync('prisma/migrations/20260715120000_lag_group_switch_name_unique/migration.sql', 'utf8'))

    expect(db.prepare('SELECT name FROM LagGroup ORDER BY id').all()).toEqual([
      { name: 'LAG' },
      { name: 'LAG (duplicate 2)' },
      { name: 'LAG (duplicate 3)' },
    ])
    expect(db.prepare('PRAGMA index_list("LagGroup")').all()).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'LagGroup_switch_id_name_key', unique: 1 }),
    ]))
    db.close()
  })
})
