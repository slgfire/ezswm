import { randomUUID } from 'node:crypto'
import { prisma } from '../db/client'
import type { User } from '../../types/user'

interface UserRow {
  id: string
  username: string
  display_name: string
  password_hash: string
  role: string
  language: string
  is_setup_user: boolean
  created_at: string
  updated_at: string
}

function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    password_hash: row.password_hash,
    role: row.role as User['role'],
    language: row.language as User['language'],
    is_setup_user: row.is_setup_user,
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

export const userRepository = {
  async list(): Promise<User[]> {
    const rows = await prisma.user.findMany({ orderBy: { username: 'asc' } })
    return rows.map(rowToUser)
  },

  async getById(id: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id } })
    return row ? rowToUser(row) : null
  },

  async getByUsername(username: string): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { username } })
    return row ? rowToUser(row) : null
  },

  async create(data: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { username: data.username } })
    if (existing) {
      throw createError({ statusCode: 409, message: `Username '${data.username}' already exists` })
    }

    const now = new Date().toISOString()
    const row = await prisma.user.create({
      data: {
        id: randomUUID(),
        username: data.username,
        display_name: data.display_name,
        password_hash: data.password_hash,
        role: data.role,
        language: data.language,
        is_setup_user: data.is_setup_user,
        created_at: now,
        updated_at: now
      }
    })
    return rowToUser(row)
  },

  async update(id: string, data: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User> {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      throw createError({ statusCode: 404, message: 'User not found' })
    }
    const row = await prisma.user.update({
      where: { id },
      data: { ...data, updated_at: new Date().toISOString() }
    })
    return rowToUser(row)
  },

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } })
      return true
    } catch {
      return false
    }
  }
}
